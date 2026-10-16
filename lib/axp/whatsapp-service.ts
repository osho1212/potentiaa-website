import { bookingEntryCode } from '@/lib/axp/payment-core';

/**
 * WhatsApp Business Cloud API delivery for confirmed passes.
 *
 * Meta only lets a business open a conversation with a pre-approved template,
 * which is always the situation here: a guest has not messaged us before their
 * booking is confirmed, so the free-form 24 hour window is closed. The template
 * is referenced by name and locale and takes positional body parameters, so the
 * approved body must read its six placeholders in this order:
 *
 *   {{1}} attendee name      {{2}} pass type        {{3}} event name
 *   {{4}} date and venue     {{5}} booking ref      {{6}} entry code
 *
 * The template also needs an IMAGE header, which carries that attendee's QR so
 * the message is a scannable pass rather than a notice about one. Set
 * WHATSAPP_TEMPLATE_HAS_IMAGE=false only if the approved template has no
 * header, or Meta rejects every send.
 *
 * Credentials are secrets, so they live in the deployment environment and never
 * in the settings store that the organiser page can write:
 *
 *   WHATSAPP_PHONE_NUMBER_ID   sending number's id from Meta        (required)
 *   WHATSAPP_ACCESS_TOKEN      permanent system-user token          (required)
 *   WHATSAPP_TEMPLATE_NAME     default aagaz_pass_confirmation
 *   WHATSAPP_TEMPLATE_LOCALE   default en
 *   WHATSAPP_API_VERSION       default v21.0
 *   WHATSAPP_DEFAULT_COUNTRY   default 91, applied to local numbers
 *
 * The organiser still has to switch delivery on in the admin panel, so a
 * half-finished Meta setup cannot start messaging guests on its own.
 */

export interface WhatsAppDeliveryResult {
  success: boolean;
  configured: boolean;
  attempted: number;
  recipients: string[];
  errors: string[];
}

/** Absolute, publicly reachable PNG of a pass QR; Meta fetches this itself. */
export function passQrUrl(entryCode: string): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://potentiaa.com').replace(/\/+$/, '');
  return `${site}/api/axp/pass-qr?code=${encodeURIComponent(entryCode)}`;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

/**
 * Meta wants a bare international number: digits only, no plus, no spaces.
 * A ten digit Indian mobile is the common case, so a number with no country
 * code gets WHATSAPP_DEFAULT_COUNTRY in front of it.
 */
export function toE164(raw: unknown, defaultCountry = '91'): string | null {
  const text = String(raw ?? '').trim();
  const digits = text.replace(/\D/g, '');
  if (!digits) return null;

  let national = digits;
  if (!text.startsWith('+')) {
    if (national.length === 10) {
      national = defaultCountry + national;
    } else if (national.startsWith('0')) {
      national = defaultCountry + national.replace(/^0+/, '');
    }
  }

  if (national.length < 10 || national.length > 15) return null;
  return national;
}

/** Template parameters cannot carry newlines, tabs or long runs of spaces. */
function templateSafe(value: unknown): string {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {4,}/g, '   ')
    .trim();
}

function passLabel(pass: string): string {
  return pass === 'alcohol' ? 'Alcohol-inclusive Pass (21+)' : 'Classic Pass (non-alcoholic)';
}

export async function sendBookingPassesOnWhatsApp(
  booking: any,
  settings: any = {}
): Promise<WhatsAppDeliveryResult> {
  const result: WhatsAppDeliveryResult = {
    success: false,
    configured: isWhatsAppConfigured(),
    attempted: 0,
    recipients: [],
    errors: [],
  };

  if (!result.configured) {
    result.errors.push('WhatsApp credentials are not set on this deployment.');
    return result;
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'aagaz_pass_confirmation';
  const locale = process.env.WHATSAPP_TEMPLATE_LOCALE || 'en';
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const country = process.env.WHATSAPP_DEFAULT_COUNTRY || '91';
  const withQrHeader = process.env.WHATSAPP_TEMPLATE_HAS_IMAGE !== 'false';
  const secret = process.env.TICKET_SIGNING_SECRET || 'axp-secret-key-2026';

  const eventName = templateSafe(settings.eventName || 'Aagaz');
  const venueName = templateSafe(settings.venueName || '');
  let dateLabel = '';
  if (settings.eventDate) {
    const parsed = new Date(`${settings.eventDate}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) {
      dateLabel = new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      }).format(parsed);
    }
  }
  const whenWhere = templateSafe([dateLabel, venueName].filter(Boolean).join(' · ')) || 'See your email';
  const bookingRef = String(booking.id || '').slice(0, 8).toUpperCase() || 'AAGAZ';

  const attendees: any[] = Array.isArray(booking.attendees) ? booking.attendees : [];
  const seen = new Set<string>();

  for (const attendee of attendees) {
    const to = toE164(attendee.phone, country);
    if (!to) {
      result.errors.push(`No usable WhatsApp number for ${attendee.name || 'an attendee'}.`);
      continue;
    }
    if (seen.has(to)) continue;
    seen.add(to);

    const entryCode = await bookingEntryCode(secret, `${booking.id}:${attendee.id}`);
    const parameters = [
      templateSafe(attendee.name || 'Guest'),
      passLabel(attendee.pass),
      eventName,
      whenWhere,
      bookingRef,
      templateSafe(entryCode),
    ].map((text) => ({ type: 'text', text }));

    // The header image is the attendee's own QR, so the message itself is the
    // pass. Meta fetches this URL from its servers, so it has to be public.
    const components: any[] = [];
    if (withQrHeader) {
      components.push({
        type: 'header',
        parameters: [{ type: 'image', image: { link: passQrUrl(entryCode) } }],
      });
    }
    components.push({ type: 'body', parameters });

    result.attempted += 1;

    try {
      const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: locale },
            components,
          },
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(payload?.messages) && payload.messages.length > 0) {
        result.recipients.push(to);
      } else {
        const detail = payload?.error?.message || `status ${response.status}`;
        result.errors.push(`Failed sending to ${to}: ${detail}`);
      }
    } catch (error: any) {
      result.errors.push(`Error sending to ${to}: ${error?.message || error}`);
    }
  }

  result.success = result.recipients.length > 0;
  return result;
}
