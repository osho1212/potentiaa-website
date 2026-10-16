import crypto from 'crypto';
import { EventSettings, DEFAULT_SETTINGS } from './event-settings';
import { POLICY_VERSION } from './policy-content';

export interface AttendeeInput {
  name: string;
  instagram: string;
  phone: string;
  email?: string;
  age: '20' | '21plus';
  pass: 'normal' | 'alcohol';
}

export interface BuyerInput {
  name: string;
  instagram: string;
  phone: string;
  email: string;
}

export interface BookingCalculation {
  normal: number;
  alcohol: number;
  people: number;
  subtotal: number;
  extraCharges: number | null;
  total: number | null;
}

export function calculateBooking(
  attendees: AttendeeInput[],
  settings: EventSettings = DEFAULT_SETTINGS
): BookingCalculation {
  if (
    !Array.isArray(attendees) ||
    attendees.length < 1 ||
    attendees.length > Math.min(settings.maxPerBooking, 5)
  ) {
    throw new Error(`Choose between 1 and ${Math.min(settings.maxPerBooking, 5)} attendees.`);
  }

  let normal = 0;
  let alcohol = 0;

  for (const guest of attendees) {
    if (!['normal', 'alcohol'].includes(guest.pass)) {
      throw new Error('Choose a valid pass type.');
    }
    if (guest.pass === 'alcohol' && guest.age !== '21plus') {
      throw new Error('Alcohol-inclusive passes require age 21 or over.');
    }
    if (guest.pass === 'normal') normal++;
    else alcohol++;
  }

  const subtotalPaise =
    normal * Math.round(settings.normalPrice * 100) +
    alcohol * Math.round(settings.alcoholPrice * 100);

  const extrasPaise =
    settings.chargesConfirmed &&
    settings.extraPerPerson !== null &&
    settings.extraPerBooking !== null
      ? attendees.length * Math.round(settings.extraPerPerson * 100) +
        Math.round(settings.extraPerBooking * 100)
      : null;

  return {
    normal,
    alcohol,
    people: attendees.length,
    subtotal: subtotalPaise / 100,
    extraCharges: extrasPaise === null ? null : extrasPaise / 100,
    total: extrasPaise === null ? null : (subtotalPaise + extrasPaise) / 100,
  };
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function hmac(secret: string, value: string): string {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function clean(value: any, label: string, max: number): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > max ||
    /[\u0000-\u001f<>]/.test(value)
  ) {
    throw new Error(`Check ${label}.`);
  }
  return value.trim();
}

function person(value: any, label: string) {
  if (!value || typeof value !== 'object') throw new Error(`Enter ${label}.`);
  const name = clean(value.name, `${label} full name`, 100);
  const instagram = clean(value.instagram, `${label} Instagram username`, 31);
  const phone = clean(value.phone, `${label} phone number`, 20);

  if (!/^@?[A-Za-z0-9._]{1,30}$/.test(instagram)) {
    throw new Error(`Check ${label} Instagram username.`);
  }
  if (!/^\+?[0-9 ()-]{8,20}$/.test(phone) || phone.replace(/\D/g, '').length < 8 || phone.replace(/\D/g, '').length > 15) {
    throw new Error(`Check ${label} phone number.`);
  }
  return { name, instagram, phone };
}

export function validateBookingInput(input: any, settings: EventSettings) {
  if (!input || input.terms !== true) {
    throw new Error('Complete the required details and acknowledge the terms.');
  }

  const buyer = {
    ...person(input.buyer, 'booking contact'),
    email: clean(input.buyer?.email, 'ticket email', 150).toLowerCase(),
  };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email)) {
    throw new Error('Check the ticket email.');
  }

  if (
    !Array.isArray(input.attendees) ||
    input.attendees.length < 1 ||
    input.attendees.length > settings.maxPerBooking ||
    input.attendees.length > 5
  ) {
    throw new Error(`Choose 1–${Math.min(settings.maxPerBooking, 5)} attendees.`);
  }

  const attendees: AttendeeInput[] = input.attendees.map((guest: any, i: number) => {
    const p = person(guest, `attendee ${i + 1}`);
    if (!['20', '21plus'].includes(guest.age)) {
      throw new Error(`Choose attendee ${i + 1}'s age group.`);
    }
    if (
      !['normal', 'alcohol'].includes(guest.pass) ||
      (guest.pass === 'alcohol' && guest.age !== '21plus')
    ) {
      throw new Error(`Check attendee ${i + 1}'s pass and age.`);
    }
    const guestEmail = typeof guest.email === 'string' ? guest.email.trim().toLowerCase() : '';
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      throw new Error(`Check attendee ${i + 1}'s email address.`);
    }
    const finalEmail = guestEmail || (i === 0 && buyer?.email ? buyer.email : undefined);
    return { ...p, email: finalEmail, age: guest.age, pass: guest.pass };
  });

  if (!settings.chargesConfirmed) {
    throw new Error('Final prices have not been confirmed by the organiser.');
  }

  const total = calculateBooking(attendees, settings);
  if (total.total === null) {
    throw new Error('Final prices are unavailable.');
  }

  return { buyer, attendees, total, termsVersion: POLICY_VERSION };
}

export async function bookingEntryCode(secret: string, bookingId: string): Promise<string> {
  const sig = hmac(secret || 'default-secret-key-potentiaa-axp-2026', bookingId);
  return `AXP:${bookingId}:${sig.slice(0, 16)}`;
}

export function verifyBookingEntryCode(secret: string, entryCode: string): string | null {
  const parts = entryCode.split(':');
  if (parts[0] !== 'AXP') return null;
  if (parts.length === 3) {
    const bookingId = parts[1];
    const sig = parts[2];
    const expectedSig = hmac(secret || 'default-secret-key-potentiaa-axp-2026', bookingId).slice(0, 16);
    if (safeEqual(sig, expectedSig)) return bookingId;
    return null;
  }
  if (parts.length === 4) {
    const bookingId = parts[1];
    const attendeeId = parts[2];
    const sig = parts[3];
    const expectedSig = hmac(secret || 'default-secret-key-potentiaa-axp-2026', `${bookingId}:${attendeeId}`).slice(0, 16);
    if (safeEqual(sig, expectedSig)) return bookingId;
    return null;
  }
  return null;
}

export function getRazorpayCredentials(mode: 'test' | 'live' = 'test') {
  const isLive = mode === 'live';
  const keyId = isLive
    ? process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID
    : process.env.RAZORPAY_TEST_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const keySecret = isLive
    ? process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET
    : process.env.RAZORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

  return {
    keyId: keyId || '',
    keySecret: keySecret || '',
    isConfigured: !!(keyId && keySecret),
  };
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
  mode?: 'test' | 'live';
}) {
  const creds = getRazorpayCredentials(params.mode);
  if (!creds.isConfigured) {
    // If not yet configured, return a mock order for testing and development preview
    return {
      id: 'order_mock_' + crypto.randomUUID().slice(0, 14),
      amount: params.amountPaise,
      currency: params.currency,
      receipt: params.receipt,
      status: 'created',
      isMock: true,
      key: 'rzp_test_mockKeyPlaceholder',
    };
  }

  const authHeader = 'Basic ' + Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: params.currency || 'INR',
      receipt: params.receipt,
      notes: params.notes || {},
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.description || 'Razorpay order creation failed.');
  }

  const order = await response.json();
  return {
    ...order,
    key: creds.keyId,
    isMock: false,
  };
}

export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  mode?: 'test' | 'live';
}): boolean {
  const creds = getRazorpayCredentials(params.mode);
  if (!creds.isConfigured) {
    // For mock testing
    return true;
  }
  const expected = hmac(creds.keySecret, `${params.orderId}|${params.paymentId}`);
  return safeEqual(expected, params.signature);
}
