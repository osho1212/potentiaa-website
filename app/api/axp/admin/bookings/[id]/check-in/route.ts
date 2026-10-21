import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { checkInAttendee, resetAttendeeCheckIn, findBookingById } from '@/lib/axp/storage-adapter';

/**
 * Organiser attendee check-in toggle.
 * POST: Manually check-in or reset (undo) check-in for an attendee
 * in a booking without needing the QR scanner.
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
    const { attendeeId, action = 'checkin' } = body;

    if (!id || !attendeeId) {
      return NextResponse.json({ error: 'Booking ID and attendee ID are required.' }, { status: 400 });
    }

    const booking = await findBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    if (action === 'reset') {
      const result = await resetAttendeeCheckIn(id, attendeeId);
      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        action: 'reset',
        message: result.message,
        booking: result.booking,
      });
    }

    // Default action: 'checkin'
    const result = await checkInAttendee(id, attendeeId, { force: true });
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action: 'checkin',
      message: result.message,
      booking: result.booking,
    });
  } catch (error: any) {
    console.error(`[Admin] Attendee check-in toggle error:`, error);
    return NextResponse.json(
      { error: error?.message || 'Check-in state could not be updated.' },
      { status: 500 }
    );
  }
}
