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

export interface BookingRecord {
  id: string;
  mode: 'test' | 'live';
  idempotencyKey: string;
  accessHash: string;
  requestHash: string;
  buyer: BuyerInput;
  attendees: (AttendeeInput & { id: string; checkedIn?: boolean; checkedInAt?: string })[];
  guestCount: number;
  amountPaise: number;
  currency: string;
  status: 'creating' | 'pending' | 'confirmed' | 'order_uncertain' | 'paid_review' | 'refunded';
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
    const cloudSettings = await getSettingsFirestore();
    if (cloudSettings) {
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
    settings: data.settings || { ...DEFAULT_SETTINGS },
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

  // Sync to Firestore in background
  saveSettingsFirestore(validated).catch(err => {
    console.error('[Storage] Background settings sync to Firestore failed:', err);
  });

  return { settings: data.settings, revision: data.revision };
}

export async function findBookingById(id: string): Promise<BookingRecord | null> {
  // Check Cloud Firestore first for live real-time status updates across terminals
  try {
    const cloudBooking = await getBookingFirestore(id);
    if (cloudBooking) {
      const data = initLocalData();
      data.bookings[id] = cloudBooking;
      return cloudBooking;
    }
  } catch {}

  const data = initLocalData();
  return data.bookings[id] || null;
}

export async function findBookingByIdempotency(key: string): Promise<BookingRecord | null> {
  const data = initLocalData();
  for (const booking of Object.values(data.bookings)) {
    if (booking.idempotencyKey === key) return booking;
  }

  // Check cloud bookings
  try {
    const cloudBookings = await getAllBookingsFirestore();
    for (const booking of Object.values(cloudBookings)) {
      if (booking.idempotencyKey === key) {
        data.bookings[booking.id] = booking;
        return booking;
      }
    }
  } catch {}

  return null;
}

/**
 * Writes only the pass-delivery receipts onto a booking. Delivery can run
 * while the same booking is being checked in at the gate (a guest pressing
 * Resend), so it must never write back attendee records it read earlier.
 */
export async function saveBookingDelivery(
  id: string,
  fields: Pick<BookingRecord, 'emailDelivery' | 'whatsappDelivery'>
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

export async function saveBooking(booking: BookingRecord): Promise<BookingRecord> {
  const data = initLocalData();
  data.bookings[booking.id] = booking;
  saveLocalData(data);

  // Persist to Cloud Firestore
  try {
    await saveBookingFirestore(booking);
  } catch (err) {
    console.error(`[Storage] Failed to persist booking ${booking.id} to Firestore:`, err);
  }

  return booking;
}

export async function listAllBookings(): Promise<BookingRecord[]> {
  const data = initLocalData();
  let merged: Record<string, BookingRecord> = { ...data.bookings };

  try {
    const cloudBookings = await getAllBookingsFirestore();
    merged = { ...merged, ...cloudBookings };
    // Update local cache
    data.bookings = merged;
  } catch (err) {
    console.error('[Storage] Error listing bookings from Firestore:', err);
  }

  return Object.values(merged).sort(
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
