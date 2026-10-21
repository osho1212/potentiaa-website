import { NextRequest, NextResponse } from 'next/server';
import { findBookingById } from '@/lib/axp/storage-adapter';
import { bookingView } from '@/lib/axp/booking-view';

/**
 * The booking page's "Resume this checkout" button: the same Razorpay order
 * again, while its 15-minute hold lasts. Nothing new is created or charged.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const booking = await findBookingById(id);
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  const checkout = booking.snapshot?.checkout;
  if (booking.status !== 'pending' || !checkout || Date.parse(booking.expiresAt) <= Date.now()) {
    return NextResponse.json(
      { error: 'This checkout can no longer be resumed. Check its payment status, or start a new booking.' },
      { status: 409 }
    );
  }
  return NextResponse.json({ ...bookingView(booking), checkout });
}
