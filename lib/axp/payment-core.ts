import crypto from 'crypto';
import { EventSettings, MAX_PER_BOOKING_LIMIT } from './event-settings';
import { POLICY_VERSION } from './policy-content';
import { duplicateWithinBooking } from './contact-guard';
import { GENDERS } from '../../public/axp/pricing.js';

export type Gender = 'woman' | 'man' | 'nonbinary';
export type Fare = 'single' | 'couple' | 'group';

export interface AttendeeInput {
  name: string;
  instagram: string;
  phone: string;
  email?: string;
  age: '20' | '21plus';
  pass: 'normal' | 'alcohol';
  /** Required for bookings made since couple pricing; older bookings lack it. */
  gender?: Gender;
  /** The fare and per-person price this attendee was charged, fixed at booking. */
  fare?: Fare;
  unitPaise?: number;
}

export interface BuyerInput {
  name: string;
  instagram: string;
  phone: string;
  email: string;
}

/** The most attendees a booking may hold under these settings. */
export function bookingLimit(settings: EventSettings): number {
  return Math.min(settings.maxPerBooking, MAX_PER_BOOKING_LIMIT);
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

/** Like clean, but an absent or empty value is allowed and comes back as ''. */
function cleanOptional(value: any, label: string, max: number): string {
  if (value === undefined || value === null || value === '') return '';
  return clean(value, label, max);
}

/**
 * The age bracket as it will stand on the night, worked out from a date of
 * birth. Entry is 20+, so anything younger returns null and the caller refuses
 * the booking. Only the bracket is stored: the booking record never keeps the
 * date of birth itself, which is more personal data than the door needs.
 */
export function ageBracketFromDob(dob: string, eventDate: string): '20' | '21plus' | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate || '')) return null;
  const born = new Date(`${dob}T00:00:00Z`);
  const eventDay = new Date(`${eventDate}T00:00:00Z`);
  if (Number.isNaN(born.getTime()) || Number.isNaN(eventDay.getTime())) return null;

  let years = eventDay.getUTCFullYear() - born.getUTCFullYear();
  const months = eventDay.getUTCMonth() - born.getUTCMonth();
  if (months < 0 || (months === 0 && eventDay.getUTCDate() < born.getUTCDate())) years -= 1;

  if (years < 20 || years > 120) return null;
  return years >= 21 ? '21plus' : '20';
}

/**
 * Instagram is optional for everyone. Every person on a booking gives a phone
 * number: it is how a pass reaches them and how one pass per person is held.
 */
function person(value: any, label: string, options: { requirePhone?: boolean } = {}) {
  if (!value || typeof value !== 'object') throw new Error(`Enter ${label}.`);
  const name = clean(value.name, `${label} full name`, 100);
  const instagram = cleanOptional(value.instagram, `${label} Instagram username`, 31);
  let phone = cleanOptional(value.phone, `${label} phone number`, 20);
  // The form pre-fills a dial code, so a field left untouched arrives as '+91'.
  // Too few digits to be a number at all means the field was never filled in.
  if (phone && phone.replace(/\D/g, '').length <= 3) phone = '';

  if (instagram && !/^@?[A-Za-z0-9._]{1,30}$/.test(instagram)) {
    throw new Error(`Check ${label} Instagram username.`);
  }
  if (options.requirePhone !== false && !phone) {
    throw new Error(`Enter ${label} phone number.`);
  }
  if (phone && (!/^\+?[0-9 ()-]{8,20}$/.test(phone) || phone.replace(/\D/g, '').length < 8 || phone.replace(/\D/g, '').length > 15)) {
    throw new Error(`Check ${label} phone number.`);
  }
  return { name, instagram, phone };
}

/**
 * The buyer and attendees of a booking, checked and cleaned. Prices are not
 * worked out here: the caller quotes them with the pricing engine once it
 * knows whether the early bird is open to this booking.
 *
 * Organiser-entered bookings pass requireTerms: false, since the guest
 * accepted the terms in person rather than on the form.
 */
export function validateBookingInput(
  input: any,
  settings: EventSettings,
  { requireTerms = true }: { requireTerms?: boolean } = {}
) {
  if (!input || (requireTerms && input.terms !== true)) {
    throw new Error('Complete the required details and acknowledge the terms.');
  }

  const buyer = {
    ...person(input.buyer, 'booking contact'),
    email: clean(input.buyer?.email, 'ticket email', 150).toLowerCase(),
  };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email)) {
    throw new Error('Check the ticket email.');
  }

  const limit = bookingLimit(settings);
  if (!Array.isArray(input.attendees) || input.attendees.length < 1 || input.attendees.length > limit) {
    throw new Error(`Choose 1–${limit} attendees. For a larger group, contact event support.`);
  }

  const attendees: AttendeeInput[] = input.attendees.map((guest: any, i: number) => {
    const p = person(guest, `attendee ${i + 1}`);

    // A date of birth is what the form now asks for; the older age bracket is
    // still accepted so a booking in flight during a deploy does not fail.
    const age =
      typeof guest.dob === 'string' && guest.dob
        ? ageBracketFromDob(guest.dob, settings.eventDate)
        : ['20', '21plus'].includes(guest.age)
          ? (guest.age as '20' | '21plus')
          : null;
    if (!age) {
      throw new Error(
        `Attendee ${i + 1} must be 20 or older on the event date. Check their date of birth.`
      );
    }
    if (!['normal', 'alcohol'].includes(guest.pass) || (guest.pass === 'alcohol' && age !== '21plus')) {
      throw new Error(
        `Attendee ${i + 1} must be 21 or older on the event date for a Gold pass.`
      );
    }
    // Attendee 1 is usually the booking contact, so their email may be left
    // to the contact's. Everyone else's is optional: every pass goes to the
    // booking contact, and a guest with an email also gets their own.
    const guestEmail = typeof guest.email === 'string' ? guest.email.trim().toLowerCase() : '';
    const finalEmail = guestEmail || (i === 0 ? buyer.email : '');
    if (finalEmail && (finalEmail.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail))) {
      throw new Error(`Check attendee ${i + 1}'s email address.`);
    }
    if (!(GENDERS as readonly string[]).includes(guest.gender)) {
      throw new Error(`Choose attendee ${i + 1}'s gender.`);
    }
    return { ...p, email: finalEmail, age, pass: guest.pass, gender: guest.gender as Gender };
  });

  const duplicate = duplicateWithinBooking(attendees);
  if (duplicate) throw new Error(duplicate);

  if (!settings.chargesConfirmed) {
    throw new Error('Final prices have not been confirmed by the organiser.');
  }

  return { buyer, attendees, termsVersion: POLICY_VERSION };
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
    // A mock order lets the booking flow run in local development. A deployed
    // site without keys must not take bookings it can never be paid for.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Payments are not available right now. Please try again later.');
    }
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
    // Mock orders exist only in local development, and so does accepting their
    // unsigned payments. Without keys a deployed site verifies nothing.
    return process.env.NODE_ENV !== 'production';
  }
  const expected = hmac(creds.keySecret, `${params.orderId}|${params.paymentId}`);
  return safeEqual(expected, params.signature);
}
