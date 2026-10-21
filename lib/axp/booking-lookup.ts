import type { BookingRecord } from './storage-adapter';
import { emailKey, phoneKey } from './contact-guard';

/**
 * "Find my booking": a guest who has lost their confirmation page or email
 * gives the booking reference (the id's first eight characters, as shown on
 * the confirmation and in emails) and the email or phone they booked with.
 * Both must match: the reference alone is a guess in four billion, and a
 * contact alone would find anyone's booking.
 */
export function normaliseReference(reference: unknown): string {
  return String(reference ?? '').trim().toLowerCase().replace(/[^0-9a-f]/g, '');
}

export function findBookingByReference(
  bookings: BookingRecord[],
  reference: string,
  contact: string,
  mode: 'live' | 'test'
): BookingRecord | null {
  const ref = normaliseReference(reference);
  if (ref.length !== 8) return null;
  // Emails and numbers are compared as the one-pass-per-person rule compares
  // them: case, Gmail dots and the dial code do not matter.
  const email = contact.includes('@') ? emailKey(contact) : '';
  const phone = email ? '' : phoneKey(contact);
  if (!email && !phone) return null;
  for (const booking of bookings) {
    if (booking.mode !== mode || !booking.id.toLowerCase().startsWith(ref)) continue;
    const people = [booking.buyer, ...(booking.attendees || [])];
    if (people.some((person) => (email ? emailKey(person?.email) === email : phoneKey(person?.phone) === phone))) {
      return booking;
    }
  }
  return null;
}

/**
 * At most `limit` tries per key in a window, counted in this server instance's
 * memory. On serverless hosting each instance counts on its own, so this slows
 * guessing down rather than stopping it; the reference is what stops it.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
export function allowAttempt(key: string, limit = 10, windowMs = 10 * 60_000, now = Date.now()): boolean {
  if (attempts.size > 5000) for (const [k, v] of attempts) if (v.resetAt <= now) attempts.delete(k);
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
