import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getEventSettings, saveBooking, findBookingByIdempotency, BookingRecord } from '@/lib/axp/storage-adapter';
import { createRazorpayOrder, sha256 } from '@/lib/axp/payment-core';
import { BookingRefusal, checkAndQuote } from '@/lib/axp/booking-quote';
import { bookingView } from '@/lib/axp/booking-view';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buyer, attendees, terms, mode: requestedMode = 'test', accessToken, idempotencyKey } = body;
    const mode: 'test' | 'live' = requestedMode === 'live' ? 'live' : 'test';
    const plan: 'full' | 'prebook' = body.plan === 'prebook' ? 'prebook' : 'full';

    if (!accessToken || !idempotencyKey) {
      return NextResponse.json({ error: 'Missing access credentials.' }, { status: 400 });
    }

    const { settings } = await getEventSettings();

    const key = `${requestedMode}:${idempotencyKey}`;
    const existing = await findBookingByIdempotency(key);
    if (existing) {
      return NextResponse.json({ ...bookingView(existing), checkout: existing.snapshot?.checkout ?? null });
    }

    // Details, one pass per person, capacity and the price, all checked before
    // the order exists, so nothing is held or charged for a refused booking.
    const { validated, attendees: priced, quote } = await checkAndQuote({
      input: { buyer, attendees, terms },
      settings,
      mode,
      plan,
    });

    const bookingId = crypto.randomUUID();
    const payNowPaise = quote.payNowPaise!;
    const order = await createRazorpayOrder({
      amountPaise: payNowPaise,
      currency: 'INR',
      receipt: `rcpt_${bookingId.slice(0, 10)}`,
      mode,
      notes: {
        bookingId,
        kind: plan === 'prebook' ? 'deposit' : 'full',
        buyerName: validated.buyer.name,
        buyerPhone: validated.buyer.phone,
        guestCount: String(priced.length),
      },
    });

    const checkout = {
      key: order.key,
      amount: payNowPaise,
      currency: 'INR',
      name: settings.eventName,
      description:
        plan === 'prebook'
          ? `Pre-booking deposit for ${priced.length} ${priced.length === 1 ? 'person' : 'people'}`
          : `Booking for ${priced.length} ${priced.length === 1 ? 'person' : 'people'}`,
      orderId: order.id,
      prefill: {
        name: validated.buyer.name,
        email: validated.buyer.email,
        phone: validated.buyer.phone,
      },
    };

    const bookingRecord: BookingRecord = {
      id: bookingId,
      mode,
      idempotencyKey: key,
      accessHash: sha256(accessToken),
      requestHash: sha256(JSON.stringify(validated)),
      buyer: validated.buyer,
      attendees: priced,
      guestCount: priced.length,
      amountPaise: quote.totalPaise!,
      currency: 'INR',
      status: 'pending',
      plan,
      priceList: quote.priceList,
      source: 'online',
      payNowPaise,
      paidPaise: 0,
      payments: [],
      orderId: order.id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      snapshot: {
        settings,
        quote,
        checkout,
        termsVersion: validated.termsVersion,
        termsAcceptedAt: new Date().toISOString(),
      },
    };

    await saveBooking(bookingRecord);

    return NextResponse.json({
      ...bookingView(bookingRecord),
      quote: {
        priceList: quote.priceList,
        savings: quote.savingPaise / 100,
        lines: quote.lines.map((line) => ({ ...line, unit: line.unitPaise / 100 })),
      },
      checkout,
    });
  } catch (error: any) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not create booking.' },
      { status: error instanceof BookingRefusal ? error.status : 400 }
    );
  }
}
