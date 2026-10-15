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

import os from 'os';

export interface StorageData {
  settings: EventSettings;
  revision: number;
  updatedAt: string;
  bookings: Record<string, BookingRecord>;
}

// In-memory cache fallback for serverless functions
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
