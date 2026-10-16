import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getEventSettings, saveBooking, findBookingByIdempotency, listAllBookings } from '@/lib/axp/storage-adapter';
import { contactAlreadyBooked } from '@/lib/axp/contact-guard';
import {
  validateBookingInput,
  createRazorpayOrder,
  sha256,
} from '@/lib/axp/payment-core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buyer, attendees, terms, mode = 'test', accessToken, idempotencyKey } = body;

    if (!accessToken || !idempotencyKey) {
      return NextResponse.json({ error: 'Missing access credentials.' }, { status: 400 });
    }

    const { settings } = await getEventSettings();
    const validated = validateBookingInput({ buyer, attendees, terms }, settings);

    const key = `${mode}:${idempotencyKey}`;
    const existing = await findBookingByIdempotency(key);
    if (existing) {
      return NextResponse.json(existing);
    }

    // One pass per person: no phone number or email already on another
    // booking. Checked before the order exists, so nothing is held or charged.
    const conflict = contactAlreadyBooked(
      { mode: mode === 'live' ? 'live' : 'test', buyer: validated.buyer, attendees: validated.attendees },
      await listAllBookings()
    );
    if (conflict) {
      return NextResponse.json({ error: conflict }, { status: 409 });
    }

    const accessHash = sha256(accessToken);
    const requestHash = sha256(JSON.stringify(validated));
    const bookingId = crypto.randomUUID();
    const amountPaise = Math.round(validated.total.total! * 100);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Create Razorpay order
    const order = await createRazorpayOrder({
      amountPaise,
      currency: 'INR',
      receipt: `rcpt_${bookingId.slice(0, 10)}`,
      mode: mode === 'live' ? 'live' : 'test',
      notes: {
        bookingId,
        buyerName: validated.buyer.name,
        buyerPhone: validated.buyer.phone,
        guestCount: String(validated.attendees.length),
      },
    });

    const bookingRecord = {
      id: bookingId,
      mode: mode === 'live' ? ('live' as const) : ('test' as const),
      idempotencyKey: key,
      accessHash,
      requestHash,
      buyer: validated.buyer,
      attendees: validated.attendees.map((a, i) => ({
        ...a,
        id: crypto.randomUUID(),
      })),
      guestCount: validated.attendees.length,
      amountPaise,
      currency: 'INR',
      status: 'pending' as const,
      orderId: order.id,
      expiresAt,
      createdAt: new Date().toISOString(),
      snapshot: {
        settings,
        termsVersion: validated.termsVersion,
        termsAcceptedAt: new Date().toISOString(),
      },
    };

    await saveBooking(bookingRecord);

    return NextResponse.json({
      id: bookingId,
      status: bookingRecord.status,
      expiresAt: bookingRecord.expiresAt,
      total: validated.total.total,
      currency: 'INR',
      people: validated.attendees.length,
      attendees: bookingRecord.attendees,
      pricing: {
        normalPrice: settings.normalPrice,
        alcoholPrice: settings.alcoholPrice,
        subtotal: validated.total.subtotal,
        extraCharges: validated.total.extraCharges || 0,
      },
      checkout: {
        key: order.key,
        amount: amountPaise,
        currency: 'INR',
        name: settings.eventName,
        description: `Booking for ${validated.attendees.length} ${
          validated.attendees.length === 1 ? 'person' : 'people'
        }`,
        orderId: order.id,
        prefill: {
          name: validated.buyer.name,
          email: validated.buyer.email,
          phone: validated.buyer.phone,
        },
      },
    });
  } catch (error: any) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not create booking.' },
      { status: 400 }
    );
  }
}
