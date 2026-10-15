import fs from 'fs';
import path from 'path';
import { EventSettings, DEFAULT_SETTINGS, validateSettings } from './event-settings';
import { AttendeeInput, BuyerInput } from './payment-core';

export interface BookingRecord {
  id: string;
  mode: 'test' | 'live';
  idempotencyKey: string;
  accessHash: string;
  requestHash: string;
  buyer: BuyerInput;
  attendees: (AttendeeInput & { id: string; checkedIn?: boolean })[];
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
}

export interface StorageData {
  settings: EventSettings;
  revision: number;
  updatedAt: string;
  bookings: Record<string, BookingRecord>;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'axp_storage.json');

function initLocalData(): StorageData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initial: StorageData = {
      settings: { ...DEFAULT_SETTINGS },
      revision: 1,
      updatedAt: new Date().toISOString(),
      bookings: {},
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      settings: { ...DEFAULT_SETTINGS },
      revision: 1,
      updatedAt: new Date().toISOString(),
      bookings: {},
    };
  }
}

function saveLocalData(data: StorageData) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getEventSettings(): Promise<{ settings: EventSettings; revision: number; updatedAt: string }> {
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
  return { settings: data.settings, revision: data.revision };
}

export async function findBookingById(id: string): Promise<BookingRecord | null> {
  const data = initLocalData();
  return data.bookings[id] || null;
}

export async function findBookingByIdempotency(key: string): Promise<BookingRecord | null> {
  const data = initLocalData();
  for (const booking of Object.values(data.bookings)) {
    if (booking.idempotencyKey === key) return booking;
  }
  return null;
}

export async function saveBooking(booking: BookingRecord): Promise<BookingRecord> {
  const data = initLocalData();
  data.bookings[booking.id] = booking;
  saveLocalData(data);
  return booking;
}

export async function listAllBookings(): Promise<BookingRecord[]> {
  const data = initLocalData();
  return Object.values(data.bookings).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function checkInAttendee(bookingId: string, attendeeIdOrPosition: string): Promise<{ success: boolean; message: string; booking?: BookingRecord }> {
  const data = initLocalData();
  const booking = data.bookings[bookingId];
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

  attendee.checkedIn = true;
  if (!booking.checkedInAttendees.includes(attendee.id)) {
    booking.checkedInAttendees.push(attendee.id);
  }
  data.bookings[bookingId] = booking;
  saveLocalData(data);

  return { success: true, message: `Checked in ${attendee.name}.`, booking };
}
