import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { BookingRefusal } from '@/lib/axp/booking-quote';
import { addPaymentNote } from '@/lib/axp/cashbook-notes';

/**
 * Add a note to a cashbook row that is already recorded. Notes are added to
 * the row, never over it: the note written when the money was taken stays as
 * it was, and each later one is kept with the time it was added.
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId : '';
    const paymentIndex = Number(body.paymentIndex);
    if (!bookingId || !Number.isInteger(paymentIndex) || paymentIndex < 0) {
      return NextResponse.json({ error: 'Choose the cashbook entry to add a note to.' }, { status: 400 });
    }
    const result = await addPaymentNote(
      bookingId,
      paymentIndex,
      typeof body.paymentAt === 'string' ? body.paymentAt : '',
      body.text
    );
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Admin] Failed to add a cashbook note:', error);
    return NextResponse.json(
      { error: error?.message || 'The note could not be added.' },
      { status: error instanceof BookingRefusal ? error.status : 500 }
    );
  }
}
