import { bookingEntryCode } from '@/lib/axp/payment-core';
import { passQrUrl } from '@/lib/axp/whatsapp-service';
import { DEFAULT_SETTINGS } from '@/lib/axp/event-settings';

export interface EmailDeliveryResult {
  success: boolean;
  recipients: string[];
  errors: string[];
}

function emailJsAccount() {
  return {
    serviceId:
      process.env.NEXT_PUBLIC_EMAILJS_AXP_SERVICE_ID ||
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ||
      'service_59d1ylv',
    publicKey:
      process.env.NEXT_PUBLIC_EMAILJS_AXP_PUBLIC_KEY ||
      process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ||
      'wUJPfRnz1y09Ms68T',
  };
}

/** "Gold Pass · 21+", with "· Couple" or "· Group" when that fare was charged. */
function passLabel(guest: any): string {
  const base = guest?.pass === 'alcohol' ? 'Gold Pass · 21+' : 'Silver Pass';
  return guest?.fare === 'couple' ? `${base} · Couple` : guest?.fare === 'group' ? `${base} · Group` : base;
}

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://potentiaa.com').replace(/\/+$/, '');
}

/** "Friday, 6 November 2026 · 3:00 pm to midnight IST", from the booking's own settings. */
function eventWhen(settings: any): string {
  const day = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${settings.eventDate}T00:00:00Z`));
  const time = (value: string) =>
    new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })
      .format(new Date(`2000-01-01T${value}:00Z`))
      .toLowerCase();
  const end = settings.endTime === '00:00' ? 'midnight' : time(settings.endTime);
  return `${day} · ${time(settings.startTime)} to ${end} IST`;
}

/**
 * Everything the "booked" EmailJS template shows, for the deposit
 * confirmation or (reminder: true) a balance reminder. One template serves
 * both, so the wording that differs travels in these fields: subject,
 * inbox preview line, badge, heading, opening paragraph and button label.
 */
export function bookedEmailParams(booking: any, balancePaise: number, { reminder = false }: { reminder?: boolean } = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...(booking.snapshot?.settings || {}) };
  const attendees: any[] = Array.isArray(booking.attendees) ? booking.attendees : [];
  const people = booking.guestCount || attendees.length || 1;
  const paid = rupees(booking.amountPaise - balancePaise);
  const balance = rupees(balancePaise);
  const name = settings.eventName || 'Aagaz';
  return {
    to_name: booking.buyer?.name?.trim() || 'Guest',
    to_email: booking.buyer?.email?.trim().toLowerCase() || '',
    booking_id: booking.id,
    booking_id_short: String(booking.id).slice(0, 8).toUpperCase(),
    guest_count: String(people),
    amount_paid: paid,
    balance_due: balance,
    total: rupees(booking.amountPaise),
    attendees_list: attendees.map((a, i) => `${i + 1}. ${a.name} — ${passLabel(a)}`).join('\n'),
    balance_link: `${siteUrl()}/axp-social?booking=${encodeURIComponent(booking.id)}#balance`,
    event_name: name,
    event_when: eventWhen(settings),
    event_where: [settings.venueName, settings.venueLocation].filter(Boolean).join(', '),
    ...(reminder
      ? {
          subject_line: `Reminder: ${balance} still due for ${name}`,
          preview_line: `Pay your ${balance} balance by UPI in a minute, or in cash at the venue.`,
          email_badge: 'Balance reminder',
          email_heading: 'Your balance is still due',
          email_intro: `Just a reminder: ${balance} is still due on your ${name} booking for ${people} ${people === 1 ? 'guest' : 'guests'}. Pay it online by UPI in a minute, or in cash at the venue. Your QR passes are emailed the moment it is paid in full.`,
          cta_label: 'Pay the balance',
        }
      : {
          subject_line: `Your places at ${name} are held · ${balance} to pay`,
          preview_line: `Deposit received. Pay the ${balance} balance any time to get your QR passes.`,
          email_badge: 'Pre-booking confirmed',
          email_heading: 'Your places are held',
          email_intro: `We have received your deposit of ${paid}, and ${people === 1 ? 'your place' : `${people} places`} at ${name} ${people === 1 ? 'is' : 'are'} held for you. Pay the remaining ${balance} whenever you like: online by UPI from your booking page, or in cash at the venue.`,
          cta_label: 'Pay the balance now',
        }),
  };
}

/**
 * The confirmation a pre-booking gets once its deposit is paid: what was
 * received, the balance still due, and a link to the booking's page to pay it.
 * It carries no QR; passes go out only once the booking is paid in full.
 * With { reminder: true } the same email reminds a guest of the balance.
 *
 * Both use one EmailJS template (docs/emailjs-booked-template.html), set in
 * NEXT_PUBLIC_EMAILJS_AXP_BOOKED_TEMPLATE_ID; the wording that differs comes
 * from bookedEmailParams. Without the template nothing is sent and the
 * failure is recorded; the guest still sees the same details on the booking page.
 */
export async function sendBookingReceivedEmail(
  booking: any,
  balancePaise: number,
  { reminder = false }: { reminder?: boolean } = {}
): Promise<EmailDeliveryResult> {
  const templateId =
    process.env.NEXT_PUBLIC_EMAILJS_AXP_BOOKED_TEMPLATE_ID ||
    process.env.EMAILJS_AXP_BOOKED_TEMPLATE_ID ||
    process.env.NEXT_PUBLIC_EMAILJS_BOOKED_TEMPLATE_ID ||
    process.env.EMAILJS_BOOKED_TEMPLATE_ID;
  const params = bookedEmailParams(booking, balancePaise, { reminder });
  const to = params.to_email;
  if (!templateId) {
    return { success: false, recipients: [], errors: ['NEXT_PUBLIC_EMAILJS_AXP_BOOKED_TEMPLATE_ID is not set.'] };
  }
  if (!to) return { success: false, recipients: [], errors: ['The booking has no contact email.'] };

  const { serviceId, publicKey } = emailJsAccount();
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://potentiaa.com' },
      body: JSON.stringify({ service_id: serviceId, template_id: templateId, user_id: publicKey, template_params: params }),
    });
    const text = await res.text();
    if (res.ok && text.includes('OK')) return { success: true, recipients: [to], errors: [] };
    return { success: false, recipients: [], errors: [`Failed sending to ${to}: status ${res.status} ${text}`] };
  } catch (err: any) {
    return { success: false, recipients: [], errors: [`Error sending to ${to}: ${err?.message || err}`] };
  }
}

export async function sendBookingConfirmationEmails(booking: any): Promise<EmailDeliveryResult> {
  const { serviceId, publicKey } = emailJsAccount();
  const templateId =
    process.env.NEXT_PUBLIC_EMAILJS_AXP_TEMPLATE_ID ||
    process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ||
    'template_x1xmkvu';

  const buyerName = booking.buyer?.name?.trim() || 'Guest';
  const buyerEmail = booking.buyer?.email?.trim().toLowerCase();

  const recipients: {
    name: string;
    email: string;
    isBuyer: boolean;
    count: string;
    amount: string;
    list: string;
    entryCode: string;
    qrUrl: string;
  }[] = [];

  const attendees: any[] = Array.isArray(booking.attendees) ? booking.attendees : [];
  const attendeesList =
    attendees.length > 0
      ? attendees
          .map(
            (a, i) =>
              `${i + 1}. ${a.name} — ${passLabel(a)}${a.instagram ? ' (' + a.instagram + ')' : ''}`
          )
          .join('\n')
      : `1. ${buyerName} — Silver Pass`;

  const amountPaise = booking.amountPaise || (typeof booking.total === 'number' ? booking.total * 100 : 100);
  const formattedAmount = rupees(amountPaise);
  const passLink = `${siteUrl()}/axp-social?booking=${encodeURIComponent(booking.id || '')}#passes`;

  // The buyer gets the booking-wide code, which the gate accepts for the whole
  // group; each attendee gets the code for their own pass.
  const secret = process.env.TICKET_SIGNING_SECRET || 'axp-secret-key-2026';

  if (buyerEmail) {
    const groupCode = await bookingEntryCode(secret, booking.id);
    recipients.push({
      name: buyerName,
      email: buyerEmail,
      isBuyer: true,
      count: String(booking.guestCount || booking.people || attendees.length || 1),
      amount: formattedAmount,
      list: attendeesList,
      entryCode: groupCode,
      qrUrl: passQrUrl(groupCode),
    });
  }

  for (const guest of attendees) {
    const guestEmail = (guest.email || '').trim().toLowerCase();
    if (guestEmail && !recipients.some((r) => r.email === guestEmail)) {
      const guestCode = await bookingEntryCode(secret, `${booking.id}:${guest.id}`);
      recipients.push({
        name: guest.name || 'Guest',
        email: guest.email.trim(),
        isBuyer: false,
        count: '1 (Personal Pass)',
        amount: 'Paid by ' + buyerName,
        list: `• ${guest.name} — ${passLabel(guest)}${guest.instagram ? ' (' + guest.instagram + ')' : ''}\n(Booked in group order by ${buyerName})`,
        entryCode: guestCode,
        qrUrl: passQrUrl(guestCode),
      });
    }
  }

  const sentRecipients: string[] = [];
  const errors: string[] = [];

  for (const r of recipients) {
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://potentiaa.com',
        },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_name: r.name,
            to_email: r.email,
            booking_id: booking.id,
            booking_id_short: booking.id ? String(booking.id).slice(0, 8) : 'AAGAZ',
            guest_count: r.count,
            amount_paid: r.amount,
            attendees_list: r.list,
            pass_link: passLink,
            // The EmailJS template needs <img src="{{qr_url}}"> for this to
            // show; entry_code is the same pass as text, for clients that
            // block remote images.
            qr_url: r.qrUrl,
            entry_code: r.entryCode,
          },
        }),
      });

      const text = await res.text();
      if (res.ok && (text === 'OK' || text.includes('OK'))) {
        sentRecipients.push(r.email);
      } else {
        errors.push(`Failed sending to ${r.email}: status ${res.status} ${text}`);
      }
    } catch (err: any) {
      errors.push(`Error sending to ${r.email}: ${err?.message || err}`);
    }
  }

  return {
    success: sentRecipients.length > 0,
    recipients: sentRecipients,
    errors,
  };
}
