import { rawAdminHtml } from '@/lib/axp/templates/admin-html';

export function GET() {
  const html = rawAdminHtml
    .replace('href="/style.css"', 'href="/axp/style.css"')
    .replace('src="/admin.js"', 'src="/axp/admin.js"')
    .replace('src="/team.js"', 'src="/axp/team.js"')
    .replace('src="/payment-setup.js"', 'src="/axp/payment-setup.js"')
    .replace(
      'href="/" class="tracker-link">Back to booking form ↗</a>',
      'href="/axp-social" class="tracker-link">Back to booking form ↗</a><a href="/axp-social/dashboard" class="tracker-link" style="margin-left: 10px;">Check-in dashboard ↗</a>'
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
