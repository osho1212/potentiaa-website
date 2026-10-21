import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { recordCoupleDifference } from '@/lib/axp/booking-payments';
import { bookingView } from '@/lib/axp/booking-view';

/**
 * Gate staff recording a couple's difference to the single price, taken in
 * cash or by UPI, when their genders do not match their photo IDs.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const method = body.method === 'upi' ? 'upi' : body.method === 'cash' ? 'cash' : null;
    if (!method) {
      return NextResponse.json({ error: 'Choose how the difference was paid: cash or UPI.' }, { status: 400 });
    }
    if (typeof body.attendeeId !== 'string' || !body.attendeeId) {
      return NextResponse.json({ error: 'Choose one of the couple.' }, { status: 400 });
    }
    const { booking, differencePaise } = await recordCoupleDifference(id, body.attendeeId, method);
    return NextResponse.json({ ...bookingView(booking), recorded: differencePaise / 100 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'The difference could not be recorded.' }, { status: 400 });
  }
}
