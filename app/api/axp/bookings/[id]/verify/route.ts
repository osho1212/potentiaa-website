import { NextRequest, NextResponse } from 'next/server';
import { findBookingById, saveBooking } from '@/lib/axp/storage-adapter';
import { verifyRazorpaySignature } from '@/lib/axp/payment-core';
import { razorpayOrderFor, settlePayment } from '@/lib/axp/booking-payments';
import { bookingView } from '@/lib/axp/booking-view';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await findBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    // A settled booking is reported as it stands. Verifying it again could
    // only ever move a paid booking into review, and a stray or forged call
    // must not be able to void someone's passes.
    if (booking.status === 'confirmed' || booking.status === 'refunded') {
      return NextResponse.json(bookingView(booking));
    }

    const body = await request.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};

    // The signature proves a payment against an order, so the order must be
    // one of this booking's own: its first order (the total, or the deposit)
    // or an order it opened for the balance. Taking the order from the
    // request alone would let one real payment's receipt confirm any number
    // of other, unpaid bookings.
    const order = razorpayOrderFor(booking, razorpay_order_id);
    if (!order || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'This payment does not match this booking. Contact event support.' },
        { status: 400 }
      );
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      mode: booking.mode,
    });

    if (!isValid) {
      // A booking already holding a verified deposit keeps it; only an
      // unpaid one is put in front of the organisers.
      if (booking.status !== 'booked') {
        booking.status = 'paid_review';
        await saveBooking(booking);
      }
      return NextResponse.json(
        { error: 'Payment signature could not be verified. Contact event support.' },
        { status: 400 }
      );
    }

    // Passes (or, for a deposit, the booking confirmation) go out once,
    // whichever of this route or the Razorpay webhook records the payment first.
    const outcome = await settlePayment(booking.id, {
      kind: order.kind,
      method: 'razorpay',
      amountPaise: order.amountPaise,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    return NextResponse.json({
      ...bookingView(outcome.booking),
      emailDelivery: outcome.delivery?.emailDelivery ?? outcome.booking.emailDelivery ?? null,
      whatsappDelivery: outcome.delivery?.whatsappDelivery ?? outcome.booking.whatsappDelivery ?? null,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not verify payment.' },
      { status: 500 }
    );
  }
}
