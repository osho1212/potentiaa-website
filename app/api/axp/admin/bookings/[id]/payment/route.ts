import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { findBookingById } from '@/lib/axp/storage-adapter';
import { balanceDue, settlePayment } from '@/lib/axp/booking-payments';
import { bookingView } from '@/lib/axp/booking-view';

/**
 * An organiser recording a pre-booking's balance, taken in cash or by UPI at
 * the venue or beforehand. The whole balance by default; a smaller amount
 * leaves the rest due. Once nothing is due the booking is confirmed and its
 * QR passes are emailed, so the guest can be scanned in straight away.
 *
 * The note is required, as it is for a booking entered by hand: this payment
 * is a cashbook row, and a row nobody can account for is worse than none.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const method = body.method === 'upi' ? 'upi' : body.method === 'cash' ? 'cash' : null;
    if (!method) {
      return NextResponse.json({ error: 'Choose how the money was received: cash or UPI.' }, { status: 400 });
    }
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : '';
    if (!note) {
      return NextResponse.json({ error: 'Add a cashbook note: the UPI reference, or who took the cash.' }, { status: 400 });
    }

    const booking = await findBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    const due = balanceDue(booking);
    if (booking.status !== 'booked' || due <= 0) {
      return NextResponse.json({ error: 'This booking has no balance due.' }, { status: 409 });
    }

    let amountPaise = due;
    if (body.amount !== undefined && body.amount !== null && body.amount !== '') {
      const rupees = Number(body.amount);
      if (!Number.isFinite(rupees) || rupees <= 0 || Math.round(rupees * 100) > due) {
        return NextResponse.json(
          { error: `Enter an amount between ₹1 and the ₹${(due / 100).toLocaleString('en-IN')} due.` },
          { status: 400 }
        );
      }
      amountPaise = Math.round(rupees * 100);
    }

    const outcome = await settlePayment(id, {
      kind: 'balance',
      method,
      amountPaise,
      note,
    });

    return NextResponse.json({
      ...bookingView(outcome.booking),
      emailDelivery: outcome.delivery?.emailDelivery ?? null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'The payment could not be recorded.' }, { status: 500 });
  }
}
