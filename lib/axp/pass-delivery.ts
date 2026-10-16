import { findBookingById, saveBookingDelivery } from '@/lib/axp/storage-adapter';
import type { BookingRecord } from '@/lib/axp/storage-adapter';
import { sendBookingConfirmationEmails } from '@/lib/axp/email-service';
import { sendBookingPassesOnWhatsApp } from '@/lib/axp/whatsapp-service';
import { DEFAULT_SETTINGS } from '@/lib/axp/event-settings';

/**
 * The one place passes leave the building.
 *
 * A booking can be confirmed from two directions: the guest's browser calling
 * the verify route after checkout, or Razorpay's webhook when that browser is
 * gone. Either may arrive first, both may arrive, and the guest's confirmation
 * screen asks again whenever it loads. Every path calls this, and it sends the
 * confirmation email once per booking; only an explicit resend sends it again.
 * Because the email always comes from here, every copy carries the QR.
 *
 * WhatsApp goes once, on first delivery. Resend is an email action.
 */

export const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

export class PassDeliveryError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface PassDeliveryOutcome {
  /** Addresses this call actually sent to. */
  emailed: string[];
  /** True when nothing was sent because an earlier send already succeeded. */
  alreadySent: boolean;
  /** Every address the booking's passes have gone to so far. */
  recipients: string[];
  emailDelivery: BookingRecord['emailDelivery'] | null;
  whatsappDelivery: BookingRecord['whatsappDelivery'] | null;
  /** Set when a resend was refused because the last send was too recent. */
  retryAfterSeconds?: number;
}

export async function deliverPasses(
  bookingId: string,
  { resend = false }: { resend?: boolean } = {}
): Promise<PassDeliveryOutcome> {
  // Read fresh rather than trusting a caller's copy, so a send that has just
  // happened on the other path is seen and not repeated.
  const booking = await findBookingById(bookingId);
  if (!booking) throw new PassDeliveryError('Booking not found.', 404);
  if (booking.status !== 'confirmed') {
    throw new PassDeliveryError('Passes are sent only once payment is verified.', 409);
  }

  const settings = { ...DEFAULT_SETTINGS, ...(booking.snapshot?.settings || {}) };
  const previous = booking.emailDelivery || null;

  if (resend && previous?.sentAt) {
    const since = Date.now() - Date.parse(previous.sentAt);
    if (since < RESEND_COOLDOWN_MS) {
      return {
        emailed: [],
        alreadySent: false,
        recipients: previous.recipients || [],
        emailDelivery: previous,
        whatsappDelivery: booking.whatsappDelivery || null,
        retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - since) / 1000),
      };
    }
  }

  let emailDelivery = previous;
  let emailed: string[] = [];
  const alreadySent = !resend && !!previous?.success;

  // A failed earlier attempt is retried; a successful one is not repeated.
  if (!alreadySent) {
    const result = await sendBookingConfirmationEmails(booking);
    emailDelivery = {
      ...result,
      sentAt: new Date().toISOString(),
      resends: (previous?.resends || 0) + (resend ? 1 : 0),
    };
    emailed = result.recipients;
  }

  let whatsappDelivery = booking.whatsappDelivery || null;
  if (!whatsappDelivery && settings.whatsappEnabled) {
    try {
      whatsappDelivery = await sendBookingPassesOnWhatsApp(booking, settings);
    } catch (error) {
      console.error(`[Passes] WhatsApp delivery failed for ${booking.id}:`, error);
    }
  }

  if (emailDelivery !== previous || whatsappDelivery !== (booking.whatsappDelivery || null)) {
    await saveBookingDelivery(booking.id, {
      emailDelivery: emailDelivery || undefined,
      whatsappDelivery: whatsappDelivery || undefined,
    });
  }

  return {
    emailed,
    alreadySent,
    recipients: emailDelivery?.recipients || [],
    emailDelivery,
    whatsappDelivery,
  };
}
