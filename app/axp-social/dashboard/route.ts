import { NextRequest } from 'next/server';
import { rawDashboardHtml } from '@/lib/axp/templates/dashboard-html';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { renderPasscodeGateHtml } from '@/lib/axp/admin-auth-html';

const MANUAL_BOOKING_PANEL =
  '<section class="panel" id="manual-booking-panel"><h2>Add a booking</h2>' +
  '<p class="helper">For guests paying in cash or by UPI outside Razorpay. The same prices and rules as the booking form apply: one pass per phone and email, places left, and the early-bird cap. Paid in full: QR passes are emailed straight away. Deposit only: the booking is saved as Booked and the guest can pay the rest online or here.</p>' +
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
  '<label>Note · optional<input id="m-note" maxlength="200" placeholder="UPI reference, or who took the cash" autocomplete="off"></label>' +
  '</div></fieldset>' +
  '<div id="m-quote" class="manual-quote" role="status"></div>' +
  '<button type="submit" id="m-submit" class="primary">Save booking</button>' +
  '<p id="m-result" class="manual-result" role="status"></p>' +
  '</form></section>';

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
    .replace('href="/style.css"', 'href="/axp/style.css"><link rel="stylesheet" href="/axp/fonts/fonts.css?v=2"><link rel="stylesheet" href="/axp/organiser.css?v=3"')
    .replace('<body class="organiser-dashboard">', '<body class="organiser-dashboard organiser-ui">')
    .replace('src="/dashboard.js"', 'src="/axp/dashboard.js?v=5"></script><script type="module" src="/axp/manual-booking.js"')
    // Bookings entered by organisers, for guests paying cash or UPI outside
    // Razorpay. public/axp/manual-booking.js builds the attendee rows and
    // prices the booking as it is typed.
    .replace('<section class="panel"><h2>Attendees</h2>', MANUAL_BOOKING_PANEL + '<section class="panel"><h2>Attendees</h2>')
    // Balance reminders go out on their own on the dates in settings; this
    // sends them now as well.
    .replace('Download for Excel (.csv)</a>', 'Download for Excel (.csv)</a><button id="send-reminders" type="button" class="secondary">Send balance reminders now</button>')
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
