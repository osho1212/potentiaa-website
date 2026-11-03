import { findBookingById, saveBookingFields } from './storage-adapter';
import { BookingRefusal } from './booking-quote';

/**
 * A note added to a cashbook row after the money was taken.
 *
 * The cashbook is squared against the tin and the UPI account at the end of
 * the night, and by then a row usually needs more said about it than whoever
 * took the money had time to write: who counted it, which envelope it went
 * into, why it is short, which guest came back to settle it.
 *
 * Notes are added, never edited. What was written when the payment was
 * recorded is the record of what the money was for, and an organiser must not
 * be able to quietly rewrite it hours later; everything since hangs off it in
 * order, each with the time it was added.
 *
 * A payment is addressed by its place in the booking's ledger together with
 * the time it was taken. The ledger is only ever appended to, so the position
 * holds, and the timestamp catches the case where it somehow has not.
 */

const BY_HAND = new Set(['cash', 'upi']);

export async function addPaymentNote(
  bookingId: string,
  paymentIndex: number,
  paymentAt: string,
  text: string
) {
  const note = String(text || '').trim().slice(0, 200);
  if (!note) {
    throw new BookingRefusal('Write the note before adding it.', 400);
  }

  const booking = await findBookingById(bookingId);
  if (!booking) throw new BookingRefusal('Booking not found.', 404);

  const payments = [...(booking.payments || [])];
  const payment = payments[paymentIndex];
  if (!payment) throw new BookingRefusal('That cashbook entry no longer exists.', 404);
  if (paymentAt && payment.at !== paymentAt) {
    throw new BookingRefusal('This cashbook entry has moved. Refresh the cashbook and try again.', 409);
  }
  if (!BY_HAND.has(payment.method)) {
    throw new BookingRefusal('Only money taken by hand is on the cashbook.', 400);
  }

  const notes = [...(payment.notes || []), { at: new Date().toISOString(), text: note }];
  payments[paymentIndex] = { ...payment, notes };
  // Only the ledger, so a check-in or a correction saved at the same moment
  // is not written back over.
  await saveBookingFields(booking.id, { payments });

  return { bookingId: booking.id, paymentIndex, notes };
}
