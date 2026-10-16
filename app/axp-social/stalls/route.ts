import { rawStallsHtml } from '@/lib/axp/templates/stalls-html';

export function GET() {
  return new Response(rawStallsHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}
