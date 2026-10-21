import { listAllBookings, BookingRecord } from './storage-adapter';
import type { EventSettings } from './event-settings';

/**
 * Whether a booking's passes count against the event capacity: paid, booked
 * with a deposit, held for organiser review, or in a checkout that has not yet
 * expired. Refunds and abandoned checkouts give their places back.
 */
export function holdsPlaces(booking: BookingRecord, now: number): boolean {
  if (['confirmed', 'booked', 'paid_review', 'order_uncertain'].includes(booking.status)) return true;
  if (booking.status === 'pending' || booking.status === 'creating') {
    return !booking.expiresAt || Date.parse(booking.expiresAt) > now;
  }
  return false;
}

/**
 * A message for the guest when a live booking of `people` would take the event
 * past its capacity, or null when there is room. Test bookings never use live
 * places, so they are neither checked nor counted.
 */
export async function capacityShortfall(
  settings: EventSettings,
  mode: 'test' | 'live',
  people: number,
  bookings?: BookingRecord[]
): Promise<string | null> {
  if (mode !== 'live') return null;
  const now = Date.now();
  const taken = (bookings ?? (await listAllBookings()))
    .filter((booking) => booking.mode === 'live' && holdsPlaces(booking, now))
    .reduce((sum, booking) => sum + (booking.guestCount || booking.attendees?.length || 0), 0);

  const left = settings.capacity - taken;
  if (people <= left) return null;
  if (left <= 0) {
    return 'Passes are sold out. Places held in unfinished checkouts are released after 15 minutes, so check back shortly.';
  }
  return `Only ${left} ${left === 1 ? 'place is' : 'places are'} left. Reduce the number of attendees to ${left} or fewer.`;
}
