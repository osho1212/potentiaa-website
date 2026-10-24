import crypto from 'crypto';
import type { EventSettings } from './event-settings';
import { listAllBookings } from './storage-adapter';
import { validateBookingInput } from './payment-core';
import { contactAlreadyBooked } from './contact-guard';
import { capacityShortfall } from './capacity';
import { earlyBirdFits, earlyBirdStatus } from './early-bird';
import { FARES, quoteBooking } from '../../public/axp/pricing.js';

/** The fares an organiser may set by hand, re-exported from the price rules. */
export { FARES };

export class BookingRefusal extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Everything a new booking must pass before any money is asked for, and the
 * price it then pays. Online checkout and organiser-entered bookings both go
 * through here, so they follow the same rules and the same prices:
 * valid details, one pass per phone and email, room left at the event, and
 * early-bird prices only while the early bird can take the whole booking.
 *
 * priceList: 'auto' decides from the clock and the cap. An organiser entering
 * a booking after the fact can set 'early' or 'regular' instead; pre-bookings
 * pay regular prices either way.
 *
 * fareOverrides: a fare per attendee, in the same order, from an organiser
 * entering a booking by hand. Online checkout never passes them, so a guest
 * cannot ask for the couple price by editing the request; the manual-booking
 * endpoint is the only caller that does.
 */
export async function checkAndQuote({
  input,
  settings,
  mode,
  plan,
  priceList = 'auto',
  fareOverrides = null,
  requireTerms = true,
}: {
  input: any;
  settings: EventSettings;
  mode: 'test' | 'live';
  plan: 'full' | 'prebook';
  priceList?: 'auto' | 'early' | 'regular';
  fareOverrides?: (string | null)[] | null;
  requireTerms?: boolean;
}) {
  const validated = validateBookingInput(input, settings, { requireTerms });
  if (plan === 'prebook' && !settings.prebookEnabled) {
    throw new BookingRefusal('Pre-booking is not available. Choose to pay in full.');
  }

  const bookings = await listAllBookings();
  const conflict = contactAlreadyBooked({ mode, buyer: validated.buyer, attendees: validated.attendees }, bookings);
  if (conflict) throw new BookingRefusal(conflict, 409);

  const full = await capacityShortfall(settings, mode, validated.attendees.length, bookings);
  if (full) throw new BookingRefusal(full, 409);

  const early = earlyBirdStatus(settings, bookings, mode);
  const earlyBird =
    priceList === 'early' ? true : priceList === 'regular' ? false : earlyBirdFits(early, validated.attendees.length);
  const quote = quoteBooking(validated.attendees, settings, { plan, earlyBird, fareOverrides });
  if (quote.totalPaise === null || quote.payNowPaise === null) {
    throw new BookingRefusal('Final prices are unavailable.');
  }

  // Each attendee keeps the fare and price they were charged, so later price
  // changes never rewrite what a booking cost.
  const attendees = validated.attendees.map((guest, i) => ({
    ...guest,
    fare: quote.lines[i].fare,
    unitPaise: quote.lines[i].unitPaise,
    id: crypto.randomUUID(),
  }));

  return { validated, attendees, quote, early };
}
