import { NextRequest } from 'next/server';
import { rawAdminHtml } from '@/lib/axp/templates/admin-html';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { renderPasscodeGateHtml } from '@/lib/axp/admin-auth-html';

export function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    const gateHtml = renderPasscodeGateHtml('Admin Settings', '/axp-social/admin');
    return new Response(gateHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const html = rawAdminHtml
    .replace('href="/style.css"', 'href="/axp/style.css"><link rel="stylesheet" href="/axp/fonts/fonts.css"><link rel="stylesheet" href="/axp/organiser.css"')
    .replace('<body>', '<body class="organiser-ui">')
    .replace('<header>', '<header class="organiser-header">')
    .replace('src="/admin.js"', 'src="/axp/admin.js"')
    .replace('src="/team.js"', 'src="/axp/team.js"')
    .replace('src="/payment-setup.js"', 'src="/axp/payment-setup.js"')
    .replace(
      '<a href="/" class="tracker-link">Back to booking form ↗</a>',
      '<div class="organiser-tools"><a href="/axp-social" class="tracker-link">Guest invitation ↗</a><a href="/axp-social/dashboard" class="tracker-link">Check-in dashboard ↗</a><button type="button" id="lock-signout" class="lock-button">Lock / Sign out</button></div>'
    )
    .replaceAll('href="/"', 'href="/axp-social"')
    .replaceAll('href="/admin"', 'href="/axp-social/admin"')
    .replace(
      '<title>Organiser settings · Aagaz</title>',
      '<title>Organiser Settings · AxP Social</title>'
    );

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
