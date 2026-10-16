import { NextRequest, NextResponse } from 'next/server';
import { findBookingById } from '@/lib/axp/storage-adapter';
import { generateQrDataUrl, generateQrSvg } from '@/lib/axp/confirmation-image';
import { bookingEntryCode } from '@/lib/axp/payment-core';
import { DEFAULT_SETTINGS } from '@/lib/axp/event-settings';

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

    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Tickets are available only after payment is verified.' },
        { status: 403 }
      );
    }

    const secret = process.env.TICKET_SIGNING_SECRET || 'axp-secret-key-2026';
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(booking.snapshot?.settings || {}),
    };

    const attendeeTickets = await Promise.all(
      booking.attendees.map(async (attendee, idx) => {
        const entryCode = await bookingEntryCode(secret, `${booking.id}:${attendee.id}`);
        const [qrDataUrl, svg] = await Promise.all([
          generateQrDataUrl(entryCode),
          generateQrSvg(entryCode),
        ]);
        return {
          id: attendee.id,
          position: idx + 1,
          name: attendee.name,
          email: attendee.email || '',
          instagram: attendee.instagram,
          phone: attendee.phone,
          pass: attendee.pass,
          ageGroup: attendee.age,
          entryCode,
          code: entryCode,
          qrDataUrl,
          svg,
        };
      })
    );

    return NextResponse.json({
      bookingId: booking.id,
      mode: booking.mode,
      buyer: booking.buyer,
      event: settings,
      tickets: attendeeTickets,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not generate tickets.' },
      { status: 500 }
    );
  }
}
