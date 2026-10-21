import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventSettings, DEFAULT_SETTINGS, validateSettings } from './event-settings';
import { AttendeeInput, BuyerInput } from './payment-core';
import type { WhatsAppDeliveryResult } from './whatsapp-service';
import type { EmailDeliveryResult } from './email-service';
import {
  saveBookingFieldsFirestore,
  saveBookingFirestore,
  getBookingFirestore,
  getAllBookingsFirestore,
  updateCheckInFirestore,
  saveSettingsFirestore,
  getSettingsFirestore,
} from './firebase-client';

export type PaymentMethod = 'razorpay' | 'cash' | 'upi';

/** One sum received against a booking. */
export interface PaymentEntry {
  /**
   * full: the whole booking at once; deposit: the pre-booking deposit;
   * balance: the rest, or part of it; adjustment: a difference taken at the
   * gate, such as a couple whose details did not match their photo IDs.
   */
  kind: 'full' | 'deposit' | 'balance' | 'adjustment';
  method: PaymentMethod;
  amountPaise: number;
  orderId?: string;
  paymentId?: string;
  at: string;
  note?: string;
}

export interface BookingRecord {
  id: string;
  mode: 'test' | 'live';
  idempotencyKey: string;
  accessHash: string;
  requestHash: string;
  buyer: BuyerInput;
  attendees: (AttendeeInput & { id: string; checkedIn?: boolean; checkedInAt?: string })[];
  guestCount: number;
  /** The whole booking's price. */
  amountPaise: number;
  currency: string;
  /**
   * booked: a pre-booking whose deposit is paid and whose balance is not.
   * confirmed: paid in full; only a confirmed booking has QR passes.
   */
  status: 'creating' | 'pending' | 'booked' | 'confirmed' | 'order_uncertain' | 'paid_review' | 'refunded';
  /** Absent on bookings made before pre-booking existed, which were all paid in full. */
  plan?: 'full' | 'prebook';
  priceList?: 'early' | 'regular';
  source?: 'online' | 'manual';
  /** What the first Razorpay order asks for: the total, or the deposit. */
  payNowPaise?: number;
  paidPaise?: number;
  payments?: PaymentEntry[];
  /** Razorpay orders opened for the balance, newest last. */
  balanceOrders?: { id: string; amountPaise: number; createdAt: string }[];
  /** Written once the deposit confirmation (no QR) has gone out. */
  bookedEmail?: EmailDeliveryResult & { sentAt: string };
  /** Balance reminder emails, one entry per IST date tried. */
  reminders?: { date: string; sentAt: string; success: boolean; error?: string }[];
  orderId?: string;
  paymentId?: string;
  expiresAt: string;
  createdAt: string;
  snapshot: any;
  checkedInAttendees?: string[];
  /** Written by pass delivery when WhatsApp pass delivery was switched on. */
  whatsappDelivery?: WhatsAppDeliveryResult;
  /** Written by pass delivery each time the confirmation email goes out. */
  emailDelivery?: EmailDeliveryResult & { sentAt: string; resends: number };
}

export interface StorageData {
  settings: EventSettings;
  revision: number;
  updatedAt: string;
  bookings: Record<string, BookingRecord>;
}

/**
 * On a serverless deployment the local copy lives in one instance's temp
 * directory and is gone when that instance is. There a write Firestore did not
 * take is a write that did not happen, and it must fail instead of looking
 * saved: a guest must never pay for a booking nothing kept.
 */
const LOCAL_COPY_IS_DURABLE = !(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// In-memory cache fallback for instant serverless execution
let memoryStorage: StorageData = {
  settings: { ...DEFAULT_SETTINGS },
  revision: 1,
  updatedAt: new Date().toISOString(),
  bookings: {},
};

function getDataFilePath(): string {
  try {
    const baseDir = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
      ? path.join(os.tmpdir(), 'axp_data')
      : path.join(process.cwd(), '.data');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    return path.join(baseDir, 'axp_storage.json');
  } catch {
    return '';
  }
}

function initLocalData(): StorageData {
  try {
    const file = getDataFilePath();
    if (file && fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryStorage = { ...memoryStorage, ...parsed };
      return memoryStorage;
    }
    if (file) {
      fs.writeFileSync(file, JSON.stringify(memoryStorage, null, 2), 'utf-8');
    }
  } catch {
    // Graceful fallback to memoryStorage on read-only environments
  }
  return memoryStorage;
}

function saveLocalData(data: StorageData) {
  memoryStorage = data;
  try {
    const file = getDataFilePath();
    if (file) {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    }
  } catch {
    // Keep in-memory if disk is unavailable
  }
}

export async function getEventSettings(): Promise<{ settings: EventSettings; revision: number; updatedAt: string }> {
  try {
    const stored = await getSettingsFirestore();
    if (stored) {
      // The stored document predates settings added later, and a key it lacks
      // is shown on the site as its default. Hand that default to every
      // reader, the organiser form included: the form fills a missing key with
      // a blank, and saving it would write the blank over what guests saw.
      const cloudSettings = { ...DEFAULT_SETTINGS, ...stored } as EventSettings;
      memoryStorage.settings = cloudSettings;
      return {
        settings: cloudSettings,
        revision: memoryStorage.revision || 1,
        updatedAt: memoryStorage.updatedAt || new Date().toISOString(),
      };
    }
  } catch {}

  const data = initLocalData();
  return {
    settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) } as EventSettings,
    revision: data.revision || 1,
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

export async function updateEventSettings(newSettings: any): Promise<{ settings: EventSettings; revision: number }> {
  const validated = validateSettings(newSettings);
  const data = initLocalData();
  data.settings = validated;
  data.revision = (data.revision || 0) + 1;
  data.updatedAt = new Date().toISOString();
  saveLocalData(data);

  if (!LOCAL_COPY_IS_DURABLE) {
    await saveSettingsFirestore(validated);
  } else {
    // Sync to Firestore in background
    saveSettingsFirestore(validated).catch(err => {
      console.error('[Storage] Background settings sync to Firestore failed:', err);
    });
  }

  return { settings: data.settings, revision: data.revision };
}

/**
 * Firestore is the record; the local copy is only a fallback for when it
 * cannot be reached. Whenever Firestore answers, its answer stands, including
 * "no such booking": a booking deleted there (the organiser clearing test
 * bookings) must not live on in a warm server's cache, where the gate could
 * still admit it and the guest list could still count it.
 */
export async function findBookingById(id: string): Promise<BookingRecord | null> {
  try {
    const cloudBooking = await getBookingFirestore(id);
    const data = initLocalData();
    if (cloudBooking) {
      data.bookings[id] = cloudBooking;
    } else {
      delete data.bookings[id];
    }
    saveLocalData(data);
    return cloudBooking;
  } catch {}

  const data = initLocalData();
  return data.bookings[id] || null;
}

export async function findBookingByIdempotency(key: string): Promise<BookingRecord | null> {
  let candidates: BookingRecord[];
  try {
    candidates = await listAllBookingsFirestore();
  } catch {
    candidates = Object.values(initLocalData().bookings);
  }
  return candidates.find((booking) => booking.idempotencyKey === key) || null;
}

/**
 * Writes only the pass-delivery receipts onto a booking. Delivery can run
 * while the same booking is being checked in at the gate (a guest pressing
 * Resend), so it must never write back attendee records it read earlier.
 */
export async function saveBookingDelivery(
  id: string,
  fields: Partial<Pick<BookingRecord, 'emailDelivery' | 'whatsappDelivery' | 'bookedEmail'>>
): Promise<void> {
  const data = initLocalData();
  if (data.bookings[id]) {
    data.bookings[id] = { ...data.bookings[id], ...fields };
    saveLocalData(data);
  }
  try {
    await saveBookingFieldsFirestore(id, fields as Record<string, unknown>);
  } catch (err) {
    console.error(`[Storage] Failed to record pass delivery for ${id}:`, err);
  }
}

/**
 * Merge only the given top-level fields into a booking, leaving the rest as
 * Firestore has it. Like saveBooking, a failed write on a serverless
 * deployment is an error rather than a change one instance remembers.
 */
export async function saveBookingFields(id: string, fields: Partial<BookingRecord>): Promise<void> {
  const data = initLocalData();
  if (data.bookings[id]) {
    data.bookings[id] = { ...data.bookings[id], ...fields };
    saveLocalData(data);
  }
  try {
    await saveBookingFieldsFirestore(id, fields as Record<string, unknown>);
  } catch (err) {
    console.error(`[Storage] Failed to update booking ${id} in Firestore:`, err);
    if (!LOCAL_COPY_IS_DURABLE) {
      throw new Error('The booking system is unavailable right now.');
    }
  }
}

export async function saveBooking(booking: BookingRecord): Promise<BookingRecord> {
  const data = initLocalData();
  data.bookings[booking.id] = booking;
  saveLocalData(data);

  // Persist to Cloud Firestore
  try {
    await saveBookingFirestore(booking);
  } catch (err) {
    console.error(`[Storage] Failed to persist booking ${booking.id} to Firestore:`, err);
    if (!LOCAL_COPY_IS_DURABLE) {
      // Also raised after a payment (verification), so it must not say none was taken.
      throw new Error('The booking system is unavailable right now.');
    }
  }

  return booking;
}

/** Every booking in Firestore, which then replaces the local copy. Throws when Firestore cannot be read. */
async function listAllBookingsFirestore(): Promise<BookingRecord[]> {
  const cloudBookings = await getAllBookingsFirestore();
  const data = initLocalData();
  data.bookings = { ...cloudBookings };
  saveLocalData(data);
  return Object.values(cloudBookings);
}

export async function listAllBookings(): Promise<BookingRecord[]> {
  let bookings: BookingRecord[];
  try {
    bookings = await listAllBookingsFirestore();
  } catch (err) {
    console.error('[Storage] Error listing bookings from Firestore:', err);
    bookings = Object.values(initLocalData().bookings);
  }

  return bookings.sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export async function checkInAttendee(
  bookingId: string,
  attendeeIdOrPosition: string
): Promise<{ success: boolean; message: string; booking?: BookingRecord }> {
  let booking = await findBookingById(bookingId);
  if (!booking) {
    return { success: false, message: 'Booking not found.' };
  }
  if (booking.status !== 'confirmed') {
    return { success: false, message: 'Booking is not confirmed.' };
  }

  booking.checkedInAttendees = booking.checkedInAttendees || [];
  const attendee = booking.attendees.find(
    (a, idx) => a.id === attendeeIdOrPosition || String(idx + 1) === attendeeIdOrPosition
  );

  if (!attendee) {
    return { success: false, message: 'Attendee not found.' };
  }

  if (attendee.checkedIn || booking.checkedInAttendees.includes(attendee.id)) {
    return { success: false, message: `${attendee.name} is already checked in.` };
  }

  const now = new Date().toISOString();
  attendee.checkedIn = true;
  attendee.checkedInAt = now;
  if (!booking.checkedInAttendees.includes(attendee.id)) {
    booking.checkedInAttendees.push(attendee.id);
  }

  // Update local memory and file
  const data = initLocalData();
  data.bookings[bookingId] = booking;
  saveLocalData(data);

  // Sync to Firestore atomically
  updateCheckInFirestore(bookingId, attendee.id, now).catch(err => {
    console.error(`[Storage] Check-in update to Firestore failed for ${attendee.id}:`, err);
  });

  return { success: true, message: `Checked in ${attendee.name}.`, booking };
}
