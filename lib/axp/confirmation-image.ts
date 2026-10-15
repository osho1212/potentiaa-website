import QRCode from 'qrcode';
import { bookingEntryCode } from './payment-core';
import { BookingRecord } from './storage-adapter';

export const CONFIRMATION_SIZE = 1254;

const xml = (text: any) =>
  String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export async function generateQrSvg(code: string): Promise<string> {
  return QRCode.toString(code, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });
}

export async function generateQrDataUrl(code: string): Promise<string> {
  return QRCode.toDataURL(code, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });
}

export async function generateConfirmationSvg(
  booking: BookingRecord,
  secret: string = process.env.TICKET_SIGNING_SECRET || 'axp-secret-key-2026'
): Promise<{ code: string; svg: string }> {
  const code = await bookingEntryCode(secret, booking.id);
  const qrSvg = await generateQrSvg(code);

  const buyer = booking.buyer;
  const settings = booking.snapshot?.settings || {};
  const eventDate = settings.eventDate || '2026-11-06';
  const dateObj = new Date(eventDate + 'T12:00:00+05:30');
  const dateText = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
    .format(dateObj)
    .toUpperCase();

  const name = xml(buyer.name.toUpperCase());
  const guestCount = booking.guestCount;
  const isTest = booking.mode === 'test';

  const parts = [
    // Background card
    `<rect width="1254" height="1254" fill="#FAF6EE"/>`,
    `<rect x="40" y="40" width="1174" height="1174" fill="#FFFDF9" stroke="#D7C6AE" stroke-width="2"/>`,
    `<rect x="60" y="60" width="1134" height="1134" fill="none" stroke="#D7C6AE" stroke-width="1" stroke-dasharray="4 4"/>`,

    // Header wordmark
    `<text x="627" y="160" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, serif" font-size="64" font-weight="600" fill="#211E24" letter-spacing="4">AxP SOCIAL</text>`,
    `<text x="627" y="210" text-anchor="middle" font-family="'DM Sans', Arial, sans-serif" font-size="16" font-weight="500" fill="#876744" letter-spacing="8">AAGAZ · FIRST CHAPTER</text>`,
    `<line x1="327" y1="240" x2="927" y2="240" stroke="#D7C6AE" stroke-width="1"/>`,

    // Booking confirmed badge
    `<text x="627" y="320" text-anchor="middle" font-family="'DM Sans', Arial, sans-serif" font-size="20" font-weight="600" fill="#402347" letter-spacing="3">BOOKING CONFIRMED</text>`,

    // Guest Name
    `<text x="627" y="420" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, serif" font-size="56" font-weight="600" fill="#291C2F">${name}</text>`,

    // Guest Count & Date
    `<text x="627" y="500" text-anchor="middle" font-family="'DM Sans', Arial, sans-serif" font-size="24" font-weight="500" fill="#876744" letter-spacing="2">BOOKING FOR ${guestCount} ${guestCount === 1 ? 'GUEST' : 'GUESTS'}</text>`,
    `<text x="627" y="550" text-anchor="middle" font-family="'DM Sans', Arial, sans-serif" font-size="20" font-weight="400" fill="#716970" letter-spacing="1">${dateText} · 3 PM TILL MIDNIGHT</text>`,
    `<text x="627" y="590" text-anchor="middle" font-family="'DM Sans', Arial, sans-serif" font-size="18" font-weight="400" fill="#716970">Sukh Saklana Haveli: Royalty, Rishikesh</text>`,

    // QR container box
    `<rect x="467" y="650" width="320" height="320" fill="#FFFFFF" stroke="#D7C6AE" stroke-width="2" rx="8"/>`,
    qrSvg.replace('<svg ', '<svg x="467" y="650" width="320" height="320" '),

    // QR footer label
    `<text x="627" y="1020" text-anchor="middle" font-family="'DM Sans', Arial, sans-serif" font-size="16" font-weight="500" fill="${isTest ? '#A12727' : '#402347'}" letter-spacing="2">${isTest ? 'TEST ONLY — NOT VALID FOR ENTRY' : 'SHOW THIS QR TO THE ORGANISER AT VENUE'}</text>`,
    `<text x="627" y="1060" text-anchor="middle" font-family="'DM Sans', Arial, sans-serif" font-size="14" font-weight="400" fill="#716970">Booking ID: ${booking.id}</text>`,

    // Footer decoration
    `<text x="627" y="1150" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, serif" font-size="24" fill="#96744E">✧</text>`,
  ];

  if (isTest) {
    parts.unshift(
      `<rect x="60" y="60" width="1134" height="40" fill="#FFF3EB"/>`,
      `<text x="627" y="86" text-anchor="middle" font-family="'DM Sans', Arial, sans-serif" font-size="18" font-weight="700" fill="#A12727" letter-spacing="2">TEST CONFIRMATION — NOT VALID FOR EVENT ENTRY</text>`
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254" viewBox="0 0 1254 1254">${parts.join('')}</svg>`;
  return { code, svg };
}
