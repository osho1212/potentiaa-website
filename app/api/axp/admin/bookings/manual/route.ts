import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { getEventSettings, saveBooking, BookingRecord } from '@/lib/axp/storage-adapter';
import { sha256 } from '@/lib/axp/payment-core';
import { BookingRefusal, checkAndQuote } from '@/lib/axp/booking-quote';
import { settlePayment } from '@/lib/axp/booking-payments';
import { bookingView } from '@/lib/axp/booking-view';

/**
 * A booking an organiser enters from the dashboard, for a guest paying in cash
 * or by UPI outside Razorpay: in full, or the pre-booking deposit.
 *
 * It passes the same checks and gets the same prices as an online booking
 * (one pass per phone and email, capacity, early-bird cap), then records the
 * money received. Paid in full: confirmed, and the QR passes are emailed.
 * Deposit only: booked, with the no-QR confirmation and a balance page.
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
    }
    const body = await request.json();
    const mode: 'test' | 'live' = body.mode === 'test' ? 'test' : 'live';
    const plan: 'full' | 'prebook' = body.plan === 'prebook' ? 'prebook' : 'full';
    const method = body.method === 'upi' ? 'upi' : body.method === 'cash' ? 'cash' : null;
    const priceList = ['early', 'regular'].includes(body.priceList) ? body.priceList : 'auto';
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : '';
    if (!method) {
      return NextResponse.json({ error: 'Choose how the money was received: cash or UPI.' }, { status: 400 });
    }

    const { settings } = await getEventSettings();
    const { validated, attendees, quote } = await checkAndQuote({
      input: { buyer: body.buyer, attendees: body.attendees },
      settings,
      mode,
      plan,
      priceList,
      requireTerms: false,
    });

    const bookingId = crypto.randomUUID();
    const now = new Date();
    const booking: BookingRecord = {
      id: bookingId,
      mode,
      idempotencyKey: `manual:${bookingId}`,
      accessHash: sha256(crypto.randomUUID()),
      requestHash: sha256(JSON.stringify(validated)),
      buyer: validated.buyer,
      attendees,
      guestCount: attendees.length,
      amountPaise: quote.totalPaise!,
      currency: 'INR',
      // Pending only until the payment below is recorded, a moment later. If
      // that fails, the hold lapses like an abandoned checkout.
      status: 'pending',
      plan,
      priceList: quote.priceList,
      source: 'manual',
      payNowPaise: quote.payNowPaise!,
      paidPaise: 0,
      payments: [],
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      snapshot: {
        settings,
        quote,
        termsVersion: validated.termsVersion,
        enteredBy: 'organiser',
        note,
      },
    };
    await saveBooking(booking);

    const outcome = await settlePayment(bookingId, {
      kind: plan === 'prebook' ? 'deposit' : 'full',
      method,
      amountPaise: quote.payNowPaise!,
      note: note || undefined,
    });

    return NextResponse.json({
      ...bookingView(outcome.booking),
      emailDelivery: outcome.delivery?.emailDelivery ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'The booking could not be saved.' },
      { status: error instanceof BookingRefusal ? error.status : 400 }
    );
  }
}
