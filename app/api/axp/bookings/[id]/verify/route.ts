import { NextRequest, NextResponse } from 'next/server';
import { findBookingById, saveBooking, BookingRecord } from '@/lib/axp/storage-adapter';
import { verifyRazorpaySignature } from '@/lib/axp/payment-core';
import { DEFAULT_SETTINGS } from '@/lib/axp/event-settings';
import { deliverPasses, PassDeliveryOutcome } from '@/lib/axp/pass-delivery';

function bookingResponse(booking: BookingRecord, delivery: PassDeliveryOutcome | null) {
  const settings = { ...DEFAULT_SETTINGS, ...(booking.snapshot?.settings || {}) };
  return {
    id: booking.id,
    mode: booking.mode,
    status: booking.status,
    expiresAt: booking.expiresAt,
    people: booking.guestCount,
    total: booking.amountPaise / 100,
    currency: booking.currency,
    buyer: booking.buyer,
    attendees: booking.attendees,
    pricing: {
      normalPrice: settings.normalPrice,
      alcoholPrice: settings.alcoholPrice,
      subtotal: booking.amountPaise / 100,
      extraCharges: 0,
    },
    emailDelivery: delivery?.emailDelivery ?? booking.emailDelivery ?? null,
    whatsappDelivery: delivery?.whatsappDelivery ?? booking.whatsappDelivery ?? null,
  };
}

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
      return NextResponse.json(bookingResponse(booking, null));
    }

    const body = await request.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};

    // The signature proves a payment against an order, so the order must be
    // this booking's own. Taking it from the request would let one real
    // payment's receipt confirm any number of other, unpaid bookings.
    if (!booking.orderId || razorpay_order_id !== booking.orderId || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'This payment does not match this booking. Contact event support.' },
        { status: 400 }
      );
    }

    const isValid = verifyRazorpaySignature({
      orderId: booking.orderId,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      mode: booking.mode,
    });

    if (!isValid) {
      booking.status = 'paid_review';
      await saveBooking(booking);
      return NextResponse.json(
        { error: 'Payment signature could not be verified. Contact event support.' },
        { status: 400 }
      );
    }

    booking.status = 'confirmed';
    booking.paymentId = razorpay_payment_id;
    // Saved before delivery, which reads the booking fresh and must see it as
    // confirmed.
    await saveBooking(booking);

    // Passes go out once per booking, whichever of this route or the Razorpay
    // webhook confirms it first.
    let delivery: PassDeliveryOutcome | null = null;
    try {
      delivery = await deliverPasses(booking.id);
    } catch (deliveryErr) {
      console.error('Pass delivery failed after verification:', deliveryErr);
    }

    return NextResponse.json(bookingResponse(booking, delivery));
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not verify payment.' },
      { status: 500 }
    );
  }
}
