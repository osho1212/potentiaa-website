import { rawStallsHtml } from '@/lib/axp/templates/stalls-html';
import { site } from '@/lib/site';
import { shareTags } from '@/lib/axp/share-tags';

export function GET() {
  const html = rawStallsHtml.replace(
    /<meta name="description" content="[^"]*">/,
    shareTags({
      title: 'Business stalls at AAGAZ · AxP Social',
      description: 'Apply for a business stall at AAGAZ, a private Diwali sundowner on Friday 6 November in Rishikesh. ₹6,000 a stall, event entry included.',
      url: `${site.url}/axp-social/stalls`,
      image: `${site.url}/axp/share-aagaz.jpg`,
      imageAlt: 'AAGAZ, a private Diwali sundowner by AxP Social, Friday 6 November at Sukh Saklana Haveli, Rishikesh',
    })
  );
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}
