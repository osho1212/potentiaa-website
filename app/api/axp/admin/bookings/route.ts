import { NextRequest, NextResponse } from 'next/server';
import { listAllBookings } from '@/lib/axp/storage-adapter';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { toE164, WhatsAppDeliveryResult } from '@/lib/axp/whatsapp-service';

function spreadsheetCell(value: any) {
  const text = String(value ?? '');
  return '"' + (/^[\s]*[=+\-@]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
}

/**
 * A booking only carries whatsappDelivery when the organiser had WhatsApp pass
 * delivery switched on as the payment was verified, so a booking without one
 * predates the feature or was paid with it off — not a failure. The numbers in
 * `recipients` are the ones Meta accepted, in the form toE164 produces, so an
 * attendee is matched by normalising their own phone the same way.
 */
function whatsappStateFor(
  delivery: WhatsAppDeliveryResult | undefined,
  attendee: { name?: string; phone?: string }
): { status: 'sent' | 'failed' | 'not_applicable'; detail: string } {
  if (!delivery) return { status: 'not_applicable', detail: '' };
  const to = toE164(attendee.phone, process.env.WHATSAPP_DEFAULT_COUNTRY || '91');
  const recipients = Array.isArray(delivery.recipients) ? delivery.recipients : [];
  if (to && recipients.includes(to)) return { status: 'sent', detail: to };

  const errors = Array.isArray(delivery.errors) ? delivery.errors : [];
  const reason =
    (to ? errors.find((line) => line.includes(to)) : '') ||
    errors.find((line) => line.includes(`for ${attendee.name || 'an attendee'}.`)) ||
    (delivery.configured === false ? errors[0] : '') ||
    'No WhatsApp delivery was recorded for this number.';
  return { status: 'failed', detail: reason };
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
    }
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') === 'test' ? 'test' : 'live';
    const allBookings = await listAllBookings();
    const modeBookings = allBookings.filter((b) => b.mode === mode);

    const confirmedBookings = modeBookings.filter((b) => b.status === 'confirmed');
    const heldBookings = modeBookings.filter((b) =>
      ['creating', 'pending', 'order_uncertain'].includes(b.status) &&
      new Date(b.expiresAt).getTime() > Date.now()
    );
    const needsReviewBookings = modeBookings.filter((b) => b.status === 'paid_review');

    let totalConfirmedAttendees = 0;
    let checkedInAttendees = 0;
    let totalCollectedPaise = 0;

    const entries: Record<string, any>[] = [];

    for (const booking of modeBookings) {
      if (booking.status === 'confirmed') {
        totalConfirmedAttendees += booking.guestCount || booking.attendees.length;
        totalCollectedPaise += booking.amountPaise || 0;
      }

      for (const attendee of booking.attendees) {
        const isCheckedIn = !!(
          attendee.checkedIn || (booking.checkedInAttendees && booking.checkedInAttendees.includes(attendee.id))
        );
        if (booking.status === 'confirmed' && isCheckedIn) {
          checkedInAttendees++;
        }

        const whatsapp = whatsappStateFor(booking.whatsappDelivery, attendee);

        entries.push({
          id: booking.id,
          mode: booking.mode,
          status: booking.status,
          guest_count: booking.guestCount,
          total: (booking.amountPaise || 0) / 100,
          gateway_order: booking.orderId || '',
          gateway_payment: booking.paymentId || '',
          buyer_name: booking.buyer?.name || '',
          buyer_instagram: booking.buyer?.instagram || '',
          buyer_phone: booking.buyer?.phone || '',
          buyer_email: booking.buyer?.email || '',
          attendee_id: attendee.id,
          name: attendee.name,
          email: attendee.email || '',
          instagram: attendee.instagram,
          phone: attendee.phone,
          age_group: attendee.age,
          pass_type: attendee.pass,
          whatsapp_status: whatsapp.status,
          whatsapp_detail: whatsapp.detail,
          created_at: booking.createdAt,
          confirmed_at: booking.createdAt,
          checked_in_at: isCheckedIn ? booking.createdAt : null,
        });
      }
    }

    if (url.searchParams.get('export') === 'csv') {
      const fields = [
        'id', 'mode', 'status', 'guest_count', 'total', 'gateway_order', 'gateway_payment',
        'buyer_name', 'buyer_instagram', 'buyer_phone', 'buyer_email', 'name', 'email', 'instagram',
        'phone', 'age_group', 'pass_type', 'whatsapp_status', 'whatsapp_detail',
        'created_at', 'confirmed_at', 'checked_in_at'
      ];
      const csv = '\uFEFF' + [
        fields.map(spreadsheetCell).join(','),
        ...entries.map((row) => fields.map((key) => spreadsheetCell(row[key])).join(','))
      ].join('\r\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="aagaz-${mode}-attendees.csv"`,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    return NextResponse.json({
      mode,
      totals: {
        confirmed: totalConfirmedAttendees,
        held: heldBookings.reduce((acc, b) => acc + (b.guestCount || 0), 0),
        collected: totalCollectedPaise,
        needs_review: needsReviewBookings.length,
      },
      attendance: {
        confirmed: totalConfirmedAttendees,
        checked_in: checkedInAttendees,
        remaining: Math.max(0, totalConfirmedAttendees - checkedInAttendees),
      },
      entries,
      notices: [],
      limit: 2000,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to list bookings.' }, { status: 500 });
  }
}

