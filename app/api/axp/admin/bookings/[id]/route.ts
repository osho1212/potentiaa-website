import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { findBookingById, deleteBooking } from '@/lib/axp/storage-adapter';
import { bookingView } from '@/lib/axp/booking-view';
import { BookingRefusal } from '@/lib/axp/booking-quote';
import { editBooking } from '@/lib/axp/booking-edit';

/**
 * Organiser booking operations.
 * GET: One booking in full, as the edit form on the dashboard loads it.
 * PATCH: Correct the details an organiser entered, and price the booking
 *   again from them. `preview` costs the change without saving it, so the
 *   organiser is shown what it does to the total before they agree to it.
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


/** One booking, for the dashboard's edit form. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
    }
    const { id } = await params;
    const booking = await findBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    return NextResponse.json(bookingView(booking));
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'The booking could not be loaded.' },
      { status: 500 }
    );
  }
}

/**
 * Correct a saved booking's details.
 *
 * The body carries the booking contact and every attendee, each with the id
 * it already has; people cannot be added or removed here. The booking is
 * priced again from the corrected details, against its own saved prices.
 * Money already received is never touched: a correction that costs more
 * leaves a balance due, and one that costs less leaves an overpayment for
 * the organiser to settle by hand.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const outcome = await editBooking(
      id,
      { buyer: body.buyer, attendees: body.attendees, priceList: body.priceList },
      { preview: body.preview === true }
    );
    return NextResponse.json({
      ...bookingView(outcome.booking),
      preview: outcome.preview,
      change: {
        before: outcome.before,
        after: outcome.after,
        paidPaise: outcome.paidPaise,
        passesOutOfDate: outcome.passesOutOfDate,
      },
    });
  } catch (error: any) {
    console.error('[Admin] Failed to change booking details:', error);
    return NextResponse.json(
      { error: error?.message || 'The booking could not be changed.' },
      { status: error instanceof BookingRefusal ? error.status : 400 }
    );
  }
}
