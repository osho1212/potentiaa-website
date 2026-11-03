import { NextRequest } from 'next/server';
import { rawDashboardHtml } from '@/lib/axp/templates/dashboard-html';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { renderPasscodeGateHtml } from '@/lib/axp/admin-auth-html';

const MANUAL_BOOKING_PANEL =
  '<section class="panel" id="manual-booking-panel"><h2>Add a booking</h2>' +
  '<p class="helper">For guests paying in cash or by UPI outside Razorpay. The same prices and rules as the booking form apply: one pass per phone and email, places left, and the early-bird cap. Paid in full: QR passes are emailed straight away. Deposit only: the booking is saved as Booked and the guest can pay the rest online or here. Each attendee&rsquo;s Offer is worked out as it is for a guest booking online; set it by hand to give the couple or group price to a pair the rules miss.</p>' +
  '<form id="manual-form" class="manual-form" novalidate>' +
  '<fieldset class="manual-group"><legend>Booking contact</legend><div class="field-grid">' +
  '<label>Full name<input id="m-buyer-name" required maxlength="100" autocomplete="off"></label>' +
  '<label>Phone<input id="m-buyer-phone" type="tel" required maxlength="20" value="+91 " autocomplete="off"></label>' +
  '<label>Email<input id="m-buyer-email" type="email" required maxlength="150" autocomplete="off"></label>' +
  '<label>Instagram · optional<input id="m-buyer-instagram" maxlength="31" autocomplete="off"></label>' +
  '</div></fieldset>' +
  '<div class="manual-count"><label>People in this booking<input id="m-count" type="number" min="1" max="10" value="1"></label><button type="button" id="m-copy-contact" class="secondary">Copy contact to attendee 1</button></div>' +
  '<div id="m-attendees"></div>' +
  '<fieldset class="manual-group"><legend>Payment</legend><div class="field-grid">' +
  '<label>Paid now<select id="m-plan"><option value="full">In full</option><option value="prebook">Deposit only (pre-booking)</option></select></label>' +
  '<label>Received by<select id="m-method"><option value="cash">Cash</option><option value="upi">UPI</option></select></label>' +
  '<label>Prices<select id="m-price-list"><option value="auto">Automatic (early bird while open)</option><option value="early">Early bird</option><option value="regular">Regular</option></select></label>' +
  '<label>Cashbook note<input id="m-note" maxlength="200" required placeholder="UPI reference, or who took the cash" autocomplete="off"></label>' +
  '</div></fieldset>' +
  '<div id="m-quote" class="manual-quote" role="status"></div>' +
  '<button type="submit" id="m-submit" class="primary">Save booking</button>' +
  '<p id="m-result" class="manual-result" role="status"></p>' +
  '</form></section>';

// Correcting a booking an organiser has already saved: every detail they enter
// when adding one, plus the price list it was charged on. public/axp/booking-edit.js
// fills it and asks the server to cost the change before it is saved.
const EDIT_BOOKING_DIALOG =
  '<dialog id="edit-booking" class="edit-booking">' +
  '<form id="edit-booking-form" class="manual-form" novalidate>' +
  '<h2>Correct booking details</h2>' +
  '<p class="helper" id="edit-booking-intro"></p>' +
  '<div id="edit-booking-fields"></div>' +
  '<fieldset class="manual-group"><legend>Prices</legend><div class="field-grid">' +
  '<label><span>Price list</span><select id="edit-price-list"></select></label>' +
  '</div><p class="helper">Money already received is never changed here. A correction that costs more leaves a balance due; one that costs less leaves an overpayment to settle by hand.</p></fieldset>' +
  '<p id="edit-booking-message" class="manual-result" role="alert" hidden></p>' +
  '<div class="edit-booking-actions">' +
  '<button type="submit" id="edit-booking-save" class="primary">Review and save</button>' +
  '<button type="button" id="edit-booking-close" class="secondary">Cancel</button>' +
  '</div></form></dialog>';

// Every payment taken by hand, in cash or by UPI, so the takings can be
// squared against the tin and the UPI account at the end of the night.
// public/axp/cashbook.js fills it.
const CASHBOOK_PANEL =
  '<section class="panel" id="cashbook-panel"><h2>Cashbook</h2>' +
  '<p class="helper">Every rupee taken by hand: bookings entered here, balances recorded against a booking, and differences settled at the gate. One row per payment, newest first, so a booking paid in parts appears once for each part. Razorpay payments are not listed &mdash; Razorpay already accounts for those. Times are shown in IST.</p>' +
  '<form id="cashbook-entry" class="manual-form cashbook-entry" novalidate>' +
  '<fieldset class="manual-group"><legend>Record a payment against a booking</legend>' +
  '<p class="helper">The next instalment on a booking that still owes something: a balance paid in cash or by UPI after the booking was taken. The booking is confirmed and its QR passes emailed once nothing is left due.</p>' +
  '<div class="field-grid">' +
  '<label><span>Booking</span><select id="cashbook-booking" required></select></label>' +
  '<label><span>Amount received</span><input id="cashbook-amount" type="number" min="1" step="0.01" required autocomplete="off"></label>' +
  '<label><span>Received by</span><select id="cashbook-method"><option value="cash">Cash</option><option value="upi">UPI</option></select></label>' +
  '<label><span>Cashbook note</span><input id="cashbook-note" maxlength="200" required placeholder="UPI reference, or who took the cash" autocomplete="off"></label>' +
  '</div>' +
  '<button type="submit" id="cashbook-save" class="primary">Record payment</button>' +
  '<p id="cashbook-entry-result" class="manual-result" role="status"></p>' +
  '</fieldset></form>' +
  '<div class="dashboard-actions"><button id="cashbook-refresh" type="button" class="secondary">Refresh cashbook</button>' +
  '<a id="cashbook-export" href="/api/admin/cashbook?export=csv">Download for Excel (.csv)</a>' +
  '<label>Search note, guest or reference<input id="cashbook-search" type="search" autocomplete="off"></label></div>' +
  '<div id="cashbook-totals" class="booking-totals"></div>' +
  '<p id="cashbook-state" role="status"></p>' +
  '<div class="table-scroll"><table class="booking-table"><thead><tr>' +
  '<th>Received</th><th>Amount</th><th>For</th><th>Guest</th><th>Note</th>' +
  '</tr></thead><tbody id="cashbook-rows"></tbody></table></div>' +
  '<p id="cashbook-count" class="helper"></p></section>';

export function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    const gateHtml = renderPasscodeGateHtml('Check-in Dashboard', '/axp-social/dashboard');
    return new Response(gateHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const html = rawDashboardHtml
    .replace('href="/style.css"', 'href="/axp/style.css"><link rel="stylesheet" href="/axp/fonts/fonts.css?v=2"><link rel="stylesheet" href="/axp/organiser.css?v=6"')
    .replace('<body class="organiser-dashboard">', '<body class="organiser-dashboard organiser-ui">')
    .replace('src="/dashboard.js"', 'src="/axp/dashboard.js?v=7"></script><script type="module" src="/axp/manual-booking.js"></script><script type="module" src="/axp/cashbook.js"')
    // Bookings entered by organisers, for guests paying cash or UPI outside
    // Razorpay. public/axp/manual-booking.js builds the attendee rows and
    // prices the booking as it is typed.
    .replace('<section class="panel"><h2>Attendees</h2>', MANUAL_BOOKING_PANEL + EDIT_BOOKING_DIALOG + '<section class="panel"><h2>Attendees</h2>')
    // Balance reminders go out on their own on the dates in settings; this
    // sends them now as well.
    .replace('Download for Excel (.csv)</a>', 'Download for Excel (.csv)</a><button id="send-reminders" type="button" class="secondary">Send balance reminders now</button>')
    .replace('<section class="panel"><h2>Business stall enquiries</h2>', CASHBOOK_PANEL + '<section class="panel"><h2>Business stall enquiries</h2>')
    .replace(
      '<header><a class="brand" href="/admin">AXP SOCIAL · ORGANISER</a><a href="/admin">Settings and team access</a></header>',
      '<header class="organiser-header"><a class="brand" href="/axp-social/admin">AXP SOCIAL · ORGANISER</a><div class="organiser-tools"><a href="/axp-social/admin">Settings & team</a><a href="/axp-social" class="tracker-link">Guest invitation ↗</a><button type="button" id="lock-signout" class="lock-button">Lock / Sign out</button></div></header>'
    )
    .replaceAll('href="/admin"', 'href="/axp-social/admin"')
    .replace(
      '<title>Aagaz organiser dashboard</title>',
      '<title>Organiser Dashboard · AxP Social</title>'
    );

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
