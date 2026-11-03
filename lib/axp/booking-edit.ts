import type { BookingRecord } from './storage-adapter';
import { findBookingById, getEventSettings, listAllBookings, saveBookingFields } from './storage-adapter';
import { validateBookingInput } from './payment-core';
import { contactAlreadyBooked } from './contact-guard';
import { paidSoFar } from './booking-payments';
import { DEFAULT_SETTINGS } from './event-settings';
import { BookingRefusal } from './booking-quote';
import { FARES, quoteBooking } from '../../public/axp/pricing.js';

/**
 * Correcting a booking an organiser has already saved.
 *
 * Organisers type bookings in at the door, and a wrong name, number, date of
 * birth or pass has to be fixable without deleting the booking and losing its
 * reference, its payments and its entry record. Every detail an organiser
 * enters when adding a booking can be changed here, and the booking is priced
 * again from the corrected details exactly as it was when it was entered.
 *
 * What it will not do:
 *  - add or remove people, which would change capacity and the early-bird
 *    count: delete the booking and enter it again for that;
 *  - touch the payment ledger. Money received stays as it was received, so a
 *    correction that raises the price leaves a balance due, and one that
 *    lowers it below what is paid leaves an overpayment for the organiser to
 *    settle by hand. Nothing is refunded here.
 *
 * Prices come from the booking's own snapshot, so an edit never re-charges an
 * old booking at today's prices; `priceList` can move it between the
 * early-bird and regular lists when that was what was entered wrongly.
 */

/** Statuses an organiser may correct: a booking that has been paid for, in part or in full. */
const EDITABLE: BookingRecord['status'][] = ['confirmed', 'booked', 'paid_review', 'order_uncertain'];

export type PriceListChoice = 'keep' | 'early' | 'regular';

export interface BookingEditInput {
  buyer: any;
  attendees: any[];
  priceList?: PriceListChoice;
}

export interface BookingEditOutcome {
  booking: BookingRecord;
  /** True when the change was costed but not saved. */
  preview: boolean;
  before: { totalPaise: number; balancePaise: number; status: BookingRecord['status']; priceList: 'early' | 'regular' };
  after: {
    totalPaise: number;
    balancePaise: number;
    status: BookingRecord['status'];
    priceList: 'early' | 'regular';
    /** Received over the corrected total: the organiser settles it by hand. */
    overpaidPaise: number;
  };
  paidPaise: number;
  /** True when the passes already emailed no longer match the saved details. */
  passesOutOfDate: boolean;
}

export async function editBooking(
  bookingId: string,
  edit: BookingEditInput,
  { preview = false }: { preview?: boolean } = {}
): Promise<BookingEditOutcome> {
  const booking = await findBookingById(bookingId);
  if (!booking) throw new BookingRefusal('Booking not found.', 404);

  if (!EDITABLE.includes(booking.status)) {
    throw new BookingRefusal(
      booking.status === 'refunded'
        ? 'This booking was refunded, so its details can no longer be changed.'
        : 'This booking is still in checkout. Wait until it is paid for, or delete it and enter it again.',
      409
    );
  }

  const expected = booking.attendees.length;
  if (!Array.isArray(edit.attendees) || edit.attendees.length !== expected) {
    throw new BookingRefusal(
      `This booking is for ${expected} ${expected === 1 ? 'person' : 'people'}. Changing details cannot add or remove anyone — delete the booking and enter it again for that.`,
      400
    );
  }

  // Matched by id rather than position, so a reordered form still updates the
  // right person and keeps their entry record.
  const sent = new Map<string, any>();
  for (const guest of edit.attendees) {
    const id = String(guest?.id || '');
    if (id) sent.set(id, guest);
  }
  const incoming = booking.attendees.map((existing, i) => {
    const guest = sent.get(existing.id);
    if (!guest) throw new BookingRefusal(`Attendee ${i + 1} is missing from this change.`, 400);
    return guest;
  });

  const { settings } = await getEventSettings();
  const validated = validateBookingInput(
    {
      buyer: edit.buyer,
      attendees: incoming.map((guest, i) => ({
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        instagram: guest.instagram,
        pass: guest.pass,
        gender: guest.gender,
        // A date of birth is only sent when the organiser retypes one. Left
        // blank, the attendee keeps the age bracket they were booked with:
        // bookings store the bracket, not the date.
        ...(typeof guest.dob === 'string' && guest.dob ? { dob: guest.dob } : { age: booking.attendees[i].age }),
      })),
    },
    settings,
    { requireTerms: false }
  );

  // One pass per phone and email still holds, but this booking's own contacts
  // are not a clash with itself.
  const others = (await listAllBookings()).filter((other) => other.id !== booking.id);
  const conflict = contactAlreadyBooked(
    { mode: booking.mode, buyer: validated.buyer, attendees: validated.attendees },
    others
  );
  if (conflict) throw new BookingRefusal(conflict, 409);

  const plan: 'full' | 'prebook' = booking.plan === 'prebook' ? 'prebook' : 'full';
  const wasEarly = (booking.priceList || 'regular') === 'early';
  const choice: PriceListChoice =
    edit.priceList === 'early' || edit.priceList === 'regular' ? edit.priceList : 'keep';
  const earlyBird = choice === 'keep' ? wasEarly : choice === 'early';

  const priceSettings = { ...DEFAULT_SETTINGS, ...(booking.snapshot?.settings || {}) };
  const fareOverrides = incoming.map((guest: any) =>
    typeof guest.fare === 'string' && FARES.includes(guest.fare) ? guest.fare : null
  );
  const quote = quoteBooking(validated.attendees, priceSettings, { plan, earlyBird, fareOverrides });
  if (quote.totalPaise === null || quote.payNowPaise === null) {
    throw new BookingRefusal('This booking has no confirmed prices to cost the change against.');
  }

  const attendees = booking.attendees.map((existing, i) => ({
    // The entry record (checkedIn, checkedInAt) survives a correction: someone
    // already through the gate does not come back out because their name was
    // spelled wrong.
    ...existing,
    ...validated.attendees[i],
    id: existing.id,
    fare: quote.lines[i].fare,
    unitPaise: quote.lines[i].unitPaise,
  }));

  const paidPaise = paidSoFar(booking);
  const amountPaise = quote.totalPaise;
  const status: BookingRecord['status'] =
    paidPaise >= amountPaise ? 'confirmed' : paidPaise > 0 ? 'booked' : booking.status;
  const payNowPaise = plan === 'prebook' ? quote.payNowPaise : amountPaise;

  const passesOutOfDate =
    booking.status === 'confirmed' &&
    !!booking.emailDelivery &&
    JSON.stringify(booking.attendees.map((guest) => [guest.name, guest.pass])) !==
      JSON.stringify(attendees.map((guest) => [guest.name, guest.pass]));

  if (!preview) {
    // Only the fields this change owns, so a check-in or a payment saved at
    // the same moment is not written back over.
    await saveBookingFields(booking.id, {
      buyer: validated.buyer,
      attendees,
      amountPaise,
      payNowPaise,
      priceList: quote.priceList,
      status,
    });
  }

  const updated: BookingRecord = {
    ...booking,
    buyer: validated.buyer,
    attendees,
    amountPaise,
    payNowPaise,
    priceList: quote.priceList,
    status,
  };

  return {
    booking: updated,
    preview,
    before: {
      totalPaise: booking.amountPaise,
      balancePaise: Math.max(0, booking.amountPaise - paidPaise),
      status: booking.status,
      priceList: booking.priceList || 'regular',
    },
    after: {
      totalPaise: amountPaise,
      balancePaise: Math.max(0, amountPaise - paidPaise),
      status,
      priceList: quote.priceList,
      overpaidPaise: Math.max(0, paidPaise - amountPaise),
    },
    paidPaise,
    passesOutOfDate,
  };
}
