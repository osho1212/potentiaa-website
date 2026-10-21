import { NextRequest, NextResponse } from 'next/server';
import { findBookingByIdempotency } from '@/lib/axp/storage-adapter';
import { bookingView } from '@/lib/axp/booking-view';

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

    return NextResponse.json(bookingView(booking));
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not recover booking.' },
      { status: 500 }
    );
  }
}
