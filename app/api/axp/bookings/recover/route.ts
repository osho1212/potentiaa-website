import { NextRequest, NextResponse } from 'next/server';
import { findBookingByIdempotency } from '@/lib/axp/storage-adapter';

export async function POST(request: NextRequest) {
  try {
    const { mode, idempotencyKey } = await request.json();
    if (!idempotencyKey) {
      return NextResponse.json({ error: 'Missing idempotency key.' }, { status: 400 });
    }

    const key = `${mode || 'test'}:${idempotencyKey}`;
    const booking = await findBookingByIdempotency(key);
    if (!booking) {
      return NextResponse.json({ error: 'No previous booking found.' }, { status: 404 });
    }

    const settings = booking.snapshot?.settings || {};

    return NextResponse.json({
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
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not recover booking.' },
      { status: 500 }
    );
  }
}
