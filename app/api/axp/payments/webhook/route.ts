import { NextRequest, NextResponse } from 'next/server';
import { hmac, safeEqual } from '@/lib/axp/payment-core';
import { findBookingById } from '@/lib/axp/storage-adapter';
import { razorpayOrderFor, settlePayment } from '@/lib/axp/booking-payments';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // This route confirms bookings, so an event it cannot prove came from
    // Razorpay is refused, never processed. A missing secret or a missing
    // signature header is a refusal too: anyone can POST a "payment.captured"
    // body here, and skipping the check for them would issue free passes.
    if (!secret) {
      console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET is not set; refusing the event.');
      return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
    }
    if (!signature || !safeEqual(hmac(secret, rawBody), signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const payment = event.payload?.payment?.entity;
      const order = event.payload?.order?.entity;
      // The booking id is on the order's notes; a payment only carries it when
      // Razorpay copies them across, so look at both.
      const bookingId = payment?.notes?.bookingId || order?.notes?.bookingId;

      if (bookingId && payment?.id) {
        const booking = await findBookingById(bookingId);
        const paidOrder = payment.order_id || order?.id;
        // The order must be one of this booking's own: its first order (the
        // total, or the deposit) or one opened for its balance.
        const match = booking ? razorpayOrderFor(booking, paidOrder) : null;
        if (booking && !match) {
          console.error(`[Webhook] Payment ${payment.id} is for order ${paidOrder}, not one of booking ${bookingId}'s orders; ignored.`);
        } else if (booking && match && booking.status !== 'confirmed' && booking.status !== 'refunded') {
          // The guest's browser may never come back to verify, so the webhook
          // records the payment itself. A payment already recorded by the
          // verify route changes nothing, and nothing is sent twice.
          const outcome = await settlePayment(bookingId, {
            kind: match.kind,
            method: 'razorpay',
            amountPaise: match.amountPaise,
            orderId: paidOrder,
            paymentId: payment.id,
          });
          if (outcome.recorded) {
            console.log(`[Webhook] Recorded ${match.kind} payment ${payment.id} on booking ${bookingId}; now ${outcome.booking.status}.`);
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
