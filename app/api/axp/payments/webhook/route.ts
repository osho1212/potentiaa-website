import { NextRequest, NextResponse } from 'next/server';
import { hmac, safeEqual } from '@/lib/axp/payment-core';
import { findBookingById, saveBooking } from '@/lib/axp/storage-adapter';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (secret && signature) {
      const expected = hmac(secret, rawBody);
      if (!safeEqual(expected, signature)) {
        return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const payment = event.payload?.payment?.entity;
      const notes = payment?.notes || {};
      const bookingId = notes.bookingId;

      if (bookingId) {
        const booking = await findBookingById(bookingId);
        if (booking && booking.status !== 'confirmed') {
          booking.status = 'confirmed';
          booking.paymentId = payment.id;
          await saveBooking(booking);
          console.log(`[Webhook] Confirmed booking ${bookingId} via payment ${payment.id}`);
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
