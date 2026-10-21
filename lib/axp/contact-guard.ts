import type { BookingRecord } from './storage-adapter';

/**
 * One pass per person, where a person is a phone number and an email address.
 *
 * A phone number or email may appear on one booking only, as the booking
 * contact or as an attendee, and no two attendees in a booking may share one.
 * The booking contact is usually also the first attendee, so the contact and
 * one attendee sharing details is the same person and allowed.
 *
 * Numbers are compared by their last ten digits, so "+91 98977 98748",
 * "09897798748" and "9897798748" are one number. Emails are compared
 * case-insensitively, and Gmail addresses ignore dots and "+tags", which
 * Gmail itself ignores.
 */

export function phoneKey(phone?: string | null): string {
  const digits = String(phone || '').replace(/\D/g, '');
  // The form pre-fills a dial code, so a bare "+91" is an empty field.
  if (digits.length <= 3) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function emailKey(email?: string | null): string {
  const value = String(email || '').trim().toLowerCase();
  const at = value.lastIndexOf('@');
  if (at < 1) return '';
  const domain = value.slice(at + 1);
  let local = value.slice(0, at);
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.split('+')[0].replace(/\./g, '');
    return `${local}@gmail.com`;
  }
  return `${local}@${domain}`;
}

interface Contact {
  phone?: string | null;
  email?: string | null;
}

/** Two attendees in one booking with the same number or email. */
export function duplicateWithinBooking(attendees: Contact[]): string | null {
  const phones = new Map<string, number>();
  const emails = new Map<string, number>();
  for (let i = 0; i < attendees.length; i++) {
    const phone = phoneKey(attendees[i].phone);
    if (phone) {
      const first = phones.get(phone);
      if (first !== undefined) {
        return `Attendee ${first + 1} and attendee ${i + 1} have the same phone number. Each person needs their own number.`;
      }
      phones.set(phone, i);
    }
    const email = emailKey(attendees[i].email);
    if (email) {
      const first = emails.get(email);
      if (first !== undefined) {
        return `Attendee ${first + 1} and attendee ${i + 1} have the same email address. Each person needs their own email, or leave it blank.`;
      }
      emails.set(email, i);
    }
  }
  return null;
}

/** Bookings that hold their passes: paid, or being paid for right now. */
function holdsPasses(booking: BookingRecord, now: number): boolean {
  if (['confirmed', 'booked', 'paid_review', 'order_uncertain'].includes(booking.status)) return true;
  if (booking.status === 'pending' || booking.status === 'creating') {
    return !booking.expiresAt || Date.parse(booking.expiresAt) > now;
  }
  // Refunded bookings, and holds that expired unpaid, free their contacts.
  return false;
}

/**
 * The first contact in a new booking that another booking already uses, as a
 * message for the guest, or null when every contact is free.
 */
export function contactAlreadyBooked(
  candidate: { mode: string; buyer: Contact; attendees: Contact[] },
  bookings: BookingRecord[],
  now: number = Date.now()
): string | null {
  const buyerPhone = phoneKey(candidate.buyer.phone);
  const buyerEmail = emailKey(candidate.buyer.email);
  const takenPhones = new Set<string>();
  const takenEmails = new Set<string>();

  for (const booking of bookings) {
    // Test checkouts never block real ones, nor the other way round.
    if (booking.mode !== candidate.mode || !holdsPasses(booking, now)) continue;
    // The same contact starting over, while their own unpaid attempt has not
    // yet expired, is not a second person.
    const unpaid = booking.status === 'pending' || booking.status === 'creating';
    if (
      unpaid &&
      buyerPhone &&
      phoneKey(booking.buyer?.phone) === buyerPhone &&
      emailKey(booking.buyer?.email) === buyerEmail
    ) {
      continue;
    }
    for (const person of [booking.buyer, ...(booking.attendees || [])]) {
      const phone = phoneKey(person?.phone);
      const email = emailKey(person?.email);
      if (phone) takenPhones.add(phone);
      if (email) takenEmails.add(email);
    }
  }

  const rule = 'Each phone number and email can be used for one person only.';
  if (buyerPhone && takenPhones.has(buyerPhone)) {
    return `This phone number has already been used for a booking. ${rule} To change an existing booking, contact event support.`;
  }
  if (buyerEmail && takenEmails.has(buyerEmail)) {
    return `This email address has already been used for a booking. ${rule} To change an existing booking, contact event support.`;
  }
  for (let i = 0; i < candidate.attendees.length; i++) {
    const phone = phoneKey(candidate.attendees[i].phone);
    if (phone && takenPhones.has(phone)) {
      return `Attendee ${i + 1}'s phone number has already been used for a booking. ${rule}`;
    }
    const email = emailKey(candidate.attendees[i].email);
    if (email && takenEmails.has(email)) {
      return `Attendee ${i + 1}'s email address has already been used for a booking. ${rule}`;
    }
  }
  return null;
}
