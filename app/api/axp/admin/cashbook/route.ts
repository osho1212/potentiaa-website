import { NextRequest, NextResponse } from 'next/server';
import { listAllBookings, PaymentEntry } from '@/lib/axp/storage-adapter';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { spreadsheetCsv } from '@/lib/axp/spreadsheet';

/**
 * The cashbook: every rupee an organiser took by hand, in cash or by UPI,
 * outside Razorpay. One row per payment, not per booking, because a booking
 * can be paid in parts — a deposit in cash, the balance by UPI a week later,
 * a difference settled at the gate — and the cashbook has to square against
 * what is in the tin and in the UPI account, each entry on its own.
 *
 * Razorpay payments are left out: they are already reconciled by Razorpay,
 * and nobody has to account for them by hand.
 *
 * Every entry carries the note the organiser had to write when they recorded
 * it, so a row is traceable to a UPI reference or to whoever took the cash.
 * Entries recorded before notes were required show as "No note recorded".
 */

const BY_HAND = new Set(['cash', 'upi']);

const KIND_LABELS: Record<PaymentEntry['kind'], string> = {
  full: 'Paid in full',
  deposit: 'Pre-booking deposit',
  balance: 'Balance',
  adjustment: 'Gate adjustment',
};

const METHOD_LABELS: Record<string, string> = { cash: 'Cash', upi: 'UPI' };

interface CashbookEntry extends Record<string, unknown> {
  at: string;
  booking_id: string;
  booking_ref: string;
  method: string;
  method_label: string;
  kind: string;
  kind_label: string;
  amount_paise: number;
  amount: number;
  note: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  people: number;
  entered_as: string;
  booking_status: string;
  booking_total: number;
  booking_paid: number;
  booking_balance_due: number;
}

const CSV_FIELDS = [
  'at', 'booking_ref', 'booking_id', 'method', 'kind', 'amount', 'note',
  'buyer_name', 'buyer_phone', 'buyer_email', 'people', 'entered_as',
  'booking_status', 'booking_total', 'booking_paid', 'booking_balance_due',
];

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Organiser authentication required.' }, { status: 401 });
    }
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') === 'test' ? 'test' : 'live';
    const bookings = (await listAllBookings()).filter((booking) => booking.mode === mode);

    const entries: CashbookEntry[] = [];
    for (const booking of bookings) {
      // A refunded booking's payments stay on the ledger: the cash still came
      // in, and the refund is accounted for separately.
      for (const payment of booking.payments || []) {
        if (!BY_HAND.has(payment.method)) continue;
        const amountPaise = payment.amountPaise || 0;
        const paidPaise = (booking.payments || []).reduce((sum, item) => sum + (item.amountPaise || 0), 0);
        entries.push({
          at: payment.at,
          booking_id: booking.id,
          booking_ref: booking.id.slice(0, 8),
          method: payment.method,
          method_label: METHOD_LABELS[payment.method] || payment.method,
          kind: payment.kind,
          kind_label: KIND_LABELS[payment.kind] || payment.kind,
          amount_paise: amountPaise,
          amount: amountPaise / 100,
          note: payment.note || '',
          buyer_name: booking.buyer?.name || '',
          buyer_phone: booking.buyer?.phone || '',
          buyer_email: booking.buyer?.email || '',
          people: booking.guestCount || booking.attendees.length,
          // Where the booking itself came from: an organiser typing it in, or
          // the guest booking online and paying the rest by hand later.
          entered_as: booking.source === 'manual' ? 'Entered by organiser' : 'Booked online',
          booking_status: booking.status,
          booking_total: (booking.amountPaise || 0) / 100,
          booking_paid: paidPaise / 100,
          booking_balance_due: Math.max(0, (booking.amountPaise || 0) - paidPaise) / 100,
        });
      }
    }
    // Newest first, which is the order an organiser checks the day's takings in.
    entries.sort((a, b) => Date.parse(b.at || '') - Date.parse(a.at || ''));

    const sum = (method: string) =>
      entries.filter((entry) => entry.method === method).reduce((total, entry) => total + entry.amount_paise, 0);
    const cashPaise = sum('cash');
    const upiPaise = sum('upi');

    if (url.searchParams.get('export') === 'csv') {
      return new Response(spreadsheetCsv(CSV_FIELDS, entries), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="aagaz-${mode}-cashbook.csv"`,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    return NextResponse.json({
      mode,
      totals: {
        entries: entries.length,
        cash: cashPaise / 100,
        upi: upiPaise / 100,
        total: (cashPaise + upiPaise) / 100,
        unnoted: entries.filter((entry) => !entry.note).length,
      },
      entries,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'The cashbook could not be loaded.' }, { status: 500 });
  }
}
