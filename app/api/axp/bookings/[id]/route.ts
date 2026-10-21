import { NextRequest, NextResponse } from 'next/server';
import { findBookingById } from '@/lib/axp/storage-adapter';
import { bookingView } from '@/lib/axp/booking-view';

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
    return NextResponse.json(bookingView(booking), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not fetch booking.' },
      { status: 500 }
    );
  }
}
