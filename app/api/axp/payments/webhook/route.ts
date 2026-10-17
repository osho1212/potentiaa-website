import { NextRequest, NextResponse } from 'next/server';
import { hmac, safeEqual } from '@/lib/axp/payment-core';
import { findBookingById, saveBooking } from '@/lib/axp/storage-adapter';
import { deliverPasses } from '@/lib/axp/pass-delivery';

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
        if (booking && booking.orderId && paidOrder && paidOrder !== booking.orderId) {
          console.error(`[Webhook] Payment ${payment.id} is for order ${paidOrder}, not booking ${bookingId}'s order; ignored.`);
        } else if (booking && booking.status !== 'confirmed' && booking.status !== 'refunded') {
          booking.status = 'confirmed';
          booking.paymentId = payment.id;
          await saveBooking(booking);
          console.log(`[Webhook] Confirmed booking ${bookingId} via payment ${payment.id}`);
          // The guest's browser may never come back to confirm this booking, so
          // the webhook sends the passes itself. Delivery is once per booking,
          // so the verify route arriving as well does not send them twice.
          try {
            await deliverPasses(bookingId);
          } catch (deliveryErr) {
            console.error(`[Webhook] Pass delivery failed for ${bookingId}:`, deliveryErr);
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
