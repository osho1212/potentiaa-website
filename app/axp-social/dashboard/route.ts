import { rawDashboardHtml } from '@/lib/axp/templates/dashboard-html';

export function GET() {
  const html = rawDashboardHtml
    .replace('href="/style.css"', 'href="/axp/style.css"')
    .replace('src="/dashboard.js"', 'src="/axp/dashboard.js"')
    .replace(
      '<header><a class="brand" href="/admin">AXP SOCIAL · ORGANISER</a><a href="/admin">Settings and team access</a></header>',
      '<header><a class="brand" href="/axp-social/admin">AXP SOCIAL · ORGANISER</a><div><a href="/axp-social/admin" style="margin-right: 18px;">Settings and team access</a><a href="/axp-social" class="tracker-link">Booking form ↗</a></div></header>'
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
