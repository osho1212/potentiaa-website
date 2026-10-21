import { BookingRecord, PaymentEntry, findBookingById, saveBooking, saveBookingDelivery, saveBookingFields } from './storage-adapter';
import { deliverPasses, PassDeliveryOutcome } from './pass-delivery';
import { sendBookingReceivedEmail } from './email-service';
import { DEFAULT_SETTINGS } from './event-settings';
import { unitPrice } from '../../public/axp/pricing.js';

/**
 * Money received against a booking, from whichever direction it comes: the
 * guest's browser after Razorpay checkout, Razorpay's webhook, or an
 * organiser recording cash or UPI taken at the venue.
 *
 * A booking is confirmed, and only then gets QR passes, once everything it
 * costs has been received. A pre-booking whose deposit is in is "booked": its
 * guest gets a confirmation without a QR and a page to pay the balance on.
 */

/** What has been received so far. Bookings made before the payment ledger were paid in full or not at all. */
export function paidSoFar(booking: BookingRecord): number {
  if (typeof booking.paidPaise === 'number') return booking.paidPaise;
  return booking.status === 'confirmed' ? booking.amountPaise : 0;
}

export function balanceDue(booking: BookingRecord): number {
  return Math.max(0, booking.amountPaise - paidSoFar(booking));
}

/**
 * Which payment a Razorpay order is for on this booking, and for how much.
 * The amount comes from the booking's own record of the order, never from
 * the request. Null when the order is not one of this booking's.
 */
export function razorpayOrderFor(
  booking: BookingRecord,
  orderId: string
): { kind: PaymentEntry['kind']; amountPaise: number } | null {
  if (!orderId) return null;
  if (orderId === booking.orderId) {
    return {
      kind: booking.plan === 'prebook' ? 'deposit' : 'full',
      amountPaise: booking.payNowPaise ?? booking.amountPaise,
    };
  }
  const balanceOrder = (booking.balanceOrders || []).find((order) => order.id === orderId);
  return balanceOrder ? { kind: 'balance', amountPaise: balanceOrder.amountPaise } : null;
}

export interface SettleOutcome {
  booking: BookingRecord;
  /** False when this payment had already been recorded, so nothing changed. */
  recorded: boolean;
  delivery: PassDeliveryOutcome | null;
}

/**
 * Record one payment and act on it. Safe to call twice for the same
 * Razorpay payment (the verify route and the webhook both do): a payment id
 * already on the ledger changes nothing, and the paid total is always the sum
 * of the ledger, never a running counter two callers could both add to.
 */
export async function settlePayment(bookingId: string, entry: Omit<PaymentEntry, 'at'>): Promise<SettleOutcome> {
  // Read fresh, so a payment the other path has just recorded is seen.
  const booking = await findBookingById(bookingId);
  if (!booking) throw new Error('Booking not found.');

  const payments = booking.payments ? [...booking.payments] : [];
  if (entry.paymentId && payments.some((payment) => payment.paymentId === entry.paymentId)) {
    return { booking, recorded: false, delivery: null };
  }
  if (booking.status === 'refunded') {
    throw new Error('This booking was refunded. Contact event support.');
  }

  const wasConfirmed = booking.status === 'confirmed';
  payments.push({ ...entry, at: new Date().toISOString() });
  booking.payments = payments;
  booking.paidPaise = payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
  if (entry.paymentId && !booking.paymentId) booking.paymentId = entry.paymentId;
  booking.status = booking.paidPaise >= booking.amountPaise ? 'confirmed' : 'booked';
  // Saved before any message goes out: delivery reads the booking fresh and
  // must see it as confirmed.
  await saveBooking(booking);

  let delivery: PassDeliveryOutcome | null = null;
  if (booking.status === 'confirmed' && !wasConfirmed) {
    try {
      delivery = await deliverPasses(booking.id);
    } catch (error) {
      console.error(`[Payments] Pass delivery failed for ${booking.id}:`, error);
    }
  } else if (booking.status === 'booked' && !booking.bookedEmail?.success) {
    await sendBookedConfirmation(booking);
  }

  return { booking, recorded: true, delivery };
}

/** The deposit confirmation: no QR, the balance due, and the link to pay it. Sent once. */
export async function sendBookedConfirmation(booking: BookingRecord): Promise<void> {
  try {
    const result = await sendBookingReceivedEmail(booking, balanceDue(booking));
    const bookedEmail = { ...result, sentAt: new Date().toISOString() };
    booking.bookedEmail = bookedEmail;
    await saveBookingDelivery(booking.id, { bookedEmail });
  } catch (error) {
    console.error(`[Payments] Booking confirmation email failed for ${booking.id}:`, error);
  }
}

/**
 * The couple a couple-fare attendee belongs to: them and the other attendee
 * on the same pass who was charged the couple price. Null for anyone else.
 */
export function couplePair(booking: BookingRecord, attendeeId: string) {
  const first = booking.attendees.find((guest) => guest.id === attendeeId);
  if (!first || first.fare !== 'couple') return null;
  const second = booking.attendees.find(
    (guest) => guest.id !== first.id && guest.fare === 'couple' && guest.pass === first.pass
  );
  return second ? ([first, second] as const) : null;
}

/** What a couple owes at the gate if their details do not match: each moves to the single price. */
export function coupleDifference(booking: BookingRecord, attendeeId: string): number {
  const pair = couplePair(booking, attendeeId);
  if (!pair) return 0;
  const single = singlePricePaise(booking, pair[0].pass);
  return pair.reduce((sum, guest) => sum + Math.max(0, single - (guest.unitPaise ?? single)), 0);
}

/** The single price on the price list this booking was charged from, as the booking recorded it. */
function singlePricePaise(booking: BookingRecord, pass: 'normal' | 'alcohol'): number {
  const settings = { ...DEFAULT_SETTINGS, ...(booking.snapshot?.settings || {}) };
  return Math.round(unitPrice(settings, booking.priceList || 'regular', pass, 'single') * 100);
}

/**
 * At the gate, a couple whose genders do not match their photo IDs pays the
 * difference to the single price before entry (the terms say so). This
 * records it: both move to the single fare and price, the booking's total
 * rises by the difference, and the money taken is on the ledger as an
 * adjustment. Their passes and QR codes are unchanged.
 */
export async function recordCoupleDifference(
  bookingId: string,
  attendeeId: string,
  method: 'cash' | 'upi'
): Promise<{ booking: BookingRecord; differencePaise: number }> {
  const booking = await findBookingById(bookingId);
  if (!booking) throw new Error('Booking not found.');
  if (booking.status !== 'confirmed') throw new Error('Only a booking paid in full can be admitted.');
  const pair = couplePair(booking, attendeeId);
  if (!pair) throw new Error('This attendee is not on a couple price.');
  const differencePaise = coupleDifference(booking, attendeeId);
  if (differencePaise <= 0) throw new Error('There is no difference to pay.');

  const single = singlePricePaise(booking, pair[0].pass);
  const ids = new Set(pair.map((guest) => guest.id));
  const attendees = booking.attendees.map((guest) =>
    ids.has(guest.id) ? { ...guest, fare: 'single' as const, unitPaise: single } : guest
  );
  const payments: PaymentEntry[] = [
    ...(booking.payments || []),
    {
      kind: 'adjustment',
      method,
      amountPaise: differencePaise,
      at: new Date().toISOString(),
      note: `Couple details did not match photo ID at the gate: ${pair.map((guest) => guest.name).join(' and ')}.`,
    },
  ];
  const amountPaise = booking.amountPaise + differencePaise;
  const paidPaise = payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
  // Only these fields, so a check-in saved at the same moment is not undone.
  await saveBookingFields(booking.id, { attendees, payments, amountPaise, paidPaise });
  return { booking: { ...booking, attendees, payments, amountPaise, paidPaise }, differencePaise };
}
