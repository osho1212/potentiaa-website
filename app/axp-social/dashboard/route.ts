import { NextRequest } from 'next/server';
import { rawDashboardHtml } from '@/lib/axp/templates/dashboard-html';
import { verifyAdminAuth } from '@/lib/axp/admin-auth';
import { renderPasscodeGateHtml } from '@/lib/axp/admin-auth-html';

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
    .replace('href="/style.css"', 'href="/axp/style.css"')
    .replace('src="/dashboard.js"', 'src="/axp/dashboard.js?v=2"')
    .replace(
      '<header><a class="brand" href="/admin">AXP SOCIAL · ORGANISER</a><a href="/admin">Settings and team access</a></header>',
      '<header><a class="brand" href="/axp-social/admin">AXP SOCIAL · ORGANISER</a><div><a href="/axp-social/admin" style="margin-right: 18px;">Settings & team</a><a href="/axp-social" class="tracker-link">Guest invitation ↗</a><button type="button" onclick="fetch(\'/api/axp/admin/auth\',{method:\'DELETE\'}).then(()=>location.reload())" style="margin-left: 12px; background: none; border: 1px solid #ccc; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer;">Lock / Sign out</button></div></header>'
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
