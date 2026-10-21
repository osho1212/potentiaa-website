import { NextRequest, NextResponse } from 'next/server';
import { findBookingById, getEventSettings, saveBookingFields } from '@/lib/axp/storage-adapter';
import { createRazorpayOrder, getRazorpayCredentials } from '@/lib/axp/payment-core';
import { balanceDue } from '@/lib/axp/booking-payments';

/**
 * Opens Razorpay checkout for the rest of a pre-booking. The booking's page
 * calls this from its "Pay balance" button; it stays available for as long as
 * a balance is due, with no end date.
 *
 * The amount is always what the booking still owes, worked out here. An order
 * already opened for exactly that amount is reused, so pressing the button
 * twice cannot leave two live orders a guest could both pay.
 *
 * Access follows the rest of the booking routes: the booking id is the key.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await findBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    if (booking.status === 'confirmed') {
      return NextResponse.json({ error: 'This booking is already paid in full.' }, { status: 409 });
    }
    const due = balanceDue(booking);
    if (booking.status !== 'booked' || due <= 0) {
      return NextResponse.json({ error: 'There is no balance to pay on this booking.' }, { status: 409 });
    }

    let order = (booking.balanceOrders || []).filter((o) => o.amountPaise === due).at(-1);
    let key = getRazorpayCredentials(booking.mode).keyId;
    if (!order) {
      const created = await createRazorpayOrder({
        amountPaise: due,
        currency: 'INR',
        receipt: `bal_${booking.id.slice(0, 10)}`,
        mode: booking.mode,
        notes: { bookingId: booking.id, kind: 'balance' },
      });
      key = created.key;
      order = { id: created.id, amountPaise: due, createdAt: new Date().toISOString() };
      const balanceOrders = [...(booking.balanceOrders || []), order];
      await saveBookingFields(booking.id, { balanceOrders });
    }

    const { settings } = await getEventSettings();
    return NextResponse.json({
      balanceDue: due / 100,
      checkout: {
        key: key || 'rzp_test_mockKeyPlaceholder',
        amount: due,
        currency: 'INR',
        name: settings.eventName,
        description: `Balance for booking ${booking.id.slice(0, 8)}`,
        orderId: order.id,
        prefill: {
          name: booking.buyer?.name,
          email: booking.buyer?.email,
          phone: booking.buyer?.phone,
        },
      },
    });
  } catch (error: any) {
    console.error('Balance order error:', error);
    return NextResponse.json({ error: error?.message || 'The balance payment could not be opened.' }, { status: 500 });
  }
}
