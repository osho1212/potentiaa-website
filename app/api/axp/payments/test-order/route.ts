import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { saveBooking } from '@/lib/axp/storage-adapter';
import { createRazorpayOrder, getRazorpayCredentials } from '@/lib/axp/payment-core';

export async function POST(request: NextRequest) {
  try {
    const creds = getRazorpayCredentials('live');
    if (!creds.isConfigured) {
      return NextResponse.json(
        { error: 'Live Razorpay credentials are not configured on the server.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body.buyer?.name || body.name || '').trim();
    const phone = String(body.buyer?.phone || body.phone || '').trim();
    const email = String(body.buyer?.email || body.email || '').trim().toLowerCase();
    const instagram = String(body.buyer?.instagram || body.instagram || '@test').trim();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Please enter your full name in Section 02 first.' }, { status: 400 });
    }
    if (!phone || phone.replace(/\D/g, '').length < 8) {
      return NextResponse.json({ error: 'Please enter a valid phone number in Section 02 first.' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address in Section 02 first.' }, { status: 400 });
    }

    const bookingId = crypto.randomUUID();
    const amountPaise = 100; // Exactly 1 Rupee = 100 paise

    // Create live Razorpay order
    const order = await createRazorpayOrder({
      amountPaise,
      currency: 'INR',
      receipt: `rcpt_1rs_${bookingId.slice(0, 8)}`,
      mode: 'live',
      notes: {
        bookingId,
        buyerName: name,
        buyerPhone: phone,
        purpose: '₹1 Live Payment Test',
      },
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const bookingRecord = {
      id: bookingId,
      mode: 'live' as const,
      idempotencyKey: `live:test-1rs-${bookingId}`,
      accessHash: crypto.createHash('sha256').update(bookingId).digest('hex'),
      requestHash: crypto.createHash('sha256').update(`${name}:${phone}:${email}`).digest('hex'),
      buyer: {
        name,
        instagram: instagram || '@test',
        phone,
        email,
      },
      attendees: [
        {
          id: crypto.randomUUID(),
          name,
          instagram: instagram || '@test',
          phone,
          age: '21plus' as const,
          pass: 'normal' as const,
        },
      ],
      guestCount: 1,
      amountPaise,
      currency: 'INR',
      status: 'pending' as const,
      orderId: order.id,
      expiresAt,
      createdAt: new Date().toISOString(),
      snapshot: {
        settings: {
          eventName: 'AxP Social (₹1 Live Test)',
          normalPrice: 1,
          alcoholPrice: 1,
          chargesConfirmed: true,
          salesOpen: true,
        },
        termsVersion: '1.0-test',
        termsAcceptedAt: new Date().toISOString(),
      },
    };

    await saveBooking(bookingRecord);

    return NextResponse.json({
      id: bookingId,
      orderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      key: order.key,
      checkout: {
        key: order.key,
        amount: amountPaise,
        currency: 'INR',
        name: 'AxP Social · Live Test',
        description: '₹1 Live Payment Test',
        orderId: order.id,
        prefill: {
          name,
          email,
          phone,
        },
      },
    });
  } catch (error: any) {
    console.error('Test order creation failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not create ₹1 test order with Razorpay.' },
      { status: 500 }
    );
  }
}
