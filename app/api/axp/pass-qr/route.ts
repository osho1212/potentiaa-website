import { NextRequest } from 'next/server';
import QRCode from 'qrcode';
import { verifyBookingEntryCode } from '@/lib/axp/payment-core';

/**
 * The pass QR as a PNG, for places that can only reference an image by URL:
 * the confirmation email, and the WhatsApp template's image header, which Meta
 * fetches from its own servers.
 *
 * The entry code in the query string is its own credential. It is HMAC-signed
 * with TICKET_SIGNING_SECRET, so it cannot be guessed or forged, and anyone
 * holding it already holds the pass it encodes. An unsigned or tampered code
 * gets a 404 rather than an image.
 *
 * PNG rather than the SVG the download path uses: mail clients and the
 * WhatsApp Cloud API both reject SVG.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code') || '';
  const secret = process.env.TICKET_SIGNING_SECRET || 'axp-secret-key-2026';

  if (!code || !verifyBookingEntryCode(secret, code)) {
    return new Response('Not found', { status: 404 });
  }

  const png = await QRCode.toBuffer(code, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: { dark: '#2e1533ff', light: '#ffffffff' },
  });

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(png.length),
      // The code is the credential, so the rendered image is safe to cache and
      // Gmail's image proxy needs it to be.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
