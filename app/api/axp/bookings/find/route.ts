import { NextRequest, NextResponse } from 'next/server';
import { listAllBookings } from '@/lib/axp/storage-adapter';
import { allowAttempt, findBookingByReference, normaliseReference } from '@/lib/axp/booking-lookup';

/**
 * "Find my booking": a booking reference and the email or phone it was made
 * with return the booking's id, which opens its page (/axp-social?booking=…).
 */
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (!allowAttempt(`find:${ip}`)) {
    return NextResponse.json(
      { error: 'Too many tries. Wait a few minutes, or contact event support.' },
      { status: 429, headers: { ...headers, 'Retry-After': '600' } }
    );
  }
  try {
    const body = await request.json().catch(() => null);
    const reference = String(body?.ref ?? '').slice(0, 40);
    const contact = String(body?.contact ?? '').trim().slice(0, 150);
    if (normaliseReference(reference).length !== 8 || !contact) {
      return NextResponse.json(
        { error: 'Enter the 8-character booking reference and the email or phone you booked with.' },
        { status: 400, headers }
      );
    }
    const mode = body?.mode === 'test' ? 'test' : 'live';
    const booking = findBookingByReference(await listAllBookings(), reference, contact, mode);
    if (!booking) {
      return NextResponse.json(
        { error: 'We could not find a booking with those details. Check the reference on your confirmation, and use the email or phone you booked with.' },
        { status: 404, headers }
      );
    }
    return NextResponse.json({ id: booking.id }, { headers });
  } catch (error) {
    console.error('[Bookings] Find my booking failed:', error);
    return NextResponse.json({ error: 'Bookings could not be searched just now. Try again in a minute.' }, { status: 503, headers });
  }
}
