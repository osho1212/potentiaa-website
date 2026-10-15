import { NextRequest, NextResponse } from 'next/server';
import { checkInAttendee, findBookingById, listAllBookings, saveBooking } from '@/lib/axp/storage-adapter';

export async function POST(request: NextRequest) {
  try {
    const { code, mode = 'live', confirm = false, attendeeIds = [] } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Please enter or scan a valid QR code.' }, { status: 400 });
    }

    const trimmed = code.trim();
    let bookingId = '';
    let attendeeId = '';

    // Handle formats:
    // 1) AXPG1.<bookingId>.<hash>
    // 2) AXP1.<attendeeId>.<hash>
    // 3) Plain bookingId or attendeeId
    if (trimmed.startsWith('AXPG1.')) {
      const parts = trimmed.split('.');
      bookingId = parts[1] || '';
    } else if (trimmed.startsWith('AXP1.')) {
      const parts = trimmed.split('.');
      attendeeId = parts[1] || '';
    } else {
      bookingId = trimmed;
    }

    let booking = bookingId ? await findBookingById(bookingId) : null;

    if (!booking && attendeeId) {
      const all = await listAllBookings();
      for (const b of all) {
        if (b.attendees.some((a) => a.id === attendeeId)) {
          booking = b;
          break;
        }
      }
    }

    if (!booking) {
      return NextResponse.json({ error: 'No booking found matching this code.' }, { status: 404 });
    }

    if (booking.mode !== mode) {
      return NextResponse.json(
        { error: 'This QR belongs to a different payment mode. Test bookings cannot enter the live event.' },
        { status: 409 }
      );
    }

    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'This booking is not valid for entry. Check its payment status.' },
        { status: 409 }
      );
    }

    // Single attendee code
    if (attendeeId) {
      const attendee = booking.attendees.find((a) => a.id === attendeeId);
      if (!attendee) {
        return NextResponse.json({ error: 'Attendee not found in booking.' }, { status: 404 });
      }

      let newlyCheckedIn = false;
      const isAlreadyChecked = !!(attendee.checkedIn || (booking.checkedInAttendees || []).includes(attendee.id));

      if (confirm && !isAlreadyChecked) {
        const res = await checkInAttendee(booking.id, attendee.id);
        if (res.success) {
          newlyCheckedIn = true;
          attendee.checkedIn = true;
        }
      }

      return NextResponse.json({
        kind: 'ticket',
        name: attendee.name,
        pass: attendee.pass,
        mode: booking.mode,
        bookingId: booking.id,
        checkedInAt: (isAlreadyChecked || newlyCheckedIn) ? new Date().toISOString() : null,
        alreadyCheckedIn: confirm ? !newlyCheckedIn : isAlreadyChecked,
        newlyCheckedIn,
      });
    }

    // Group / Booking QR code
    let admittedCount = 0;
    const now = new Date().toISOString();

    if (confirm && Array.isArray(attendeeIds) && attendeeIds.length > 0) {
      booking.checkedInAttendees = booking.checkedInAttendees || [];
      for (const id of attendeeIds) {
        const a = booking.attendees.find((att) => att.id === id);
        if (a && !a.checkedIn && !booking.checkedInAttendees.includes(id)) {
          a.checkedIn = true;
          (a as any).checkedInAt = now;
          booking.checkedInAttendees.push(id);
          admittedCount++;
        }
      }
      await saveBooking(booking);
    }

    const checkedInCount = booking.attendees.filter(
      (a) => a.checkedIn || (booking?.checkedInAttendees || []).includes(a.id)
    ).length;

    return NextResponse.json({
      kind: 'booking',
      bookingId: booking.id,
      mode: booking.mode,
      buyerName: booking.buyer?.name || 'Guest',
      people: booking.guestCount || booking.attendees.length,
      admitted: admittedCount,
      checkedIn: checkedInCount,
      attendees: booking.attendees.map((a) => ({
        id: a.id,
        name: a.name,
        pass: a.pass,
        age: a.age,
        checkedInAt: a.checkedIn || (booking?.checkedInAttendees || []).includes(a.id)
          ? ((a as any).checkedInAt || booking?.createdAt)
          : null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Check-in failed.' }, { status: 500 });
  }
}

