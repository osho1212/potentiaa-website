import type { BookingRecord } from './storage-adapter';
import { DEFAULT_SETTINGS } from './event-settings';
import { balanceDue, paidSoFar } from './booking-payments';

/**
 * A booking as the guest's page sees it. Every route that returns a booking
 * to the browser uses this, so the page reads one shape whatever it asked.
 * Amounts are in rupees.
 */
export function bookingView(booking: BookingRecord) {
  const settings = { ...DEFAULT_SETTINGS, ...(booking.snapshot?.settings || {}) };
  return {
    id: booking.id,
    mode: booking.mode,
    status: booking.status,
    expiresAt: booking.expiresAt,
    people: booking.guestCount,
    total: booking.amountPaise / 100,
    currency: booking.currency,
    plan: booking.plan || 'full',
    priceList: booking.priceList || 'regular',
    source: booking.source || 'online',
    paid: paidSoFar(booking) / 100,
    balanceDue: balanceDue(booking) / 100,
    payNow: (booking.payNowPaise ?? booking.amountPaise) / 100,
    buyer: booking.buyer,
    attendees: booking.attendees,
    pricing: {
      normalPrice: settings.normalPrice,
      alcoholPrice: settings.alcoholPrice,
      subtotal: booking.amountPaise / 100,
      extraCharges: 0,
    },
    emailDelivery: booking.emailDelivery ?? null,
    whatsappDelivery: booking.whatsappDelivery ?? null,
    bookedEmail: booking.bookedEmail ? { success: booking.bookedEmail.success, recipients: booking.bookedEmail.recipients } : null,
  };
}
