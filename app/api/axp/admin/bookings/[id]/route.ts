import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { findBookingById, deleteBooking } from '@/lib/axp/storage-adapter';

/**
 * Organiser booking operations.
 * DELETE: Permanently remove a booking (and its attendee/payment records)
 * from both local cache and Firestore. Used by organisers to purge test runs.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Valid booking ID required.' }, { status: 400 });
    }

    const booking = await findBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    await deleteBooking(id);

    return NextResponse.json({
      success: true,
      message: `Booking ${id} deleted successfully.`,
      id,
    });
  } catch (error: any) {
    console.error(`[Admin] Failed to delete booking:`, error);
    return NextResponse.json(
      { error: error?.message || 'The booking could not be deleted.' },
      { status: 500 }
    );
  }
}
