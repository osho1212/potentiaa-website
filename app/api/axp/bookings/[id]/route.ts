import { NextRequest, NextResponse } from 'next/server';
import { findBookingById } from '@/lib/axp/storage-adapter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await findBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
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
        subtotal: (booking.amountPaise / 100),
        extraCharges: 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not fetch booking.' },
      { status: 500 }
    );
  }
}
