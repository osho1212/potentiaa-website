import { bookingEntryCode } from '@/lib/axp/payment-core';
import { passQrUrl } from '@/lib/axp/whatsapp-service';

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

/**
 * The confirmation a pre-booking gets once its deposit is paid: what was
 * received, the balance still due, and a link to the booking's page to pay it.
 * It carries no QR; passes go out only once the booking is paid in full.
 * With { reminder: true } the same email reminds a guest of the balance.
 *
 * Both use one EmailJS template (docs/emailjs-booked-template.html), set in
 * NEXT_PUBLIC_EMAILJS_AXP_BOOKED_TEMPLATE_ID; the heading and opening line
 * come from here. Without it nothing is sent and the failure is recorded; the
 * guest still sees the same details on the booking page.
 */
export async function sendBookingReceivedEmail(
  booking: any,
  balancePaise: number,
  { reminder = false }: { reminder?: boolean } = {}
): Promise<EmailDeliveryResult> {
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_AXP_BOOKED_TEMPLATE_ID;
  const to = booking.buyer?.email?.trim().toLowerCase();
  if (!templateId) {
    return { success: false, recipients: [], errors: ['NEXT_PUBLIC_EMAILJS_AXP_BOOKED_TEMPLATE_ID is not set.'] };
  }
  if (!to) return { success: false, recipients: [], errors: ['The booking has no contact email.'] };

  const { serviceId, publicKey } = emailJsAccount();
  const attendees: any[] = Array.isArray(booking.attendees) ? booking.attendees : [];
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://potentiaa.com' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_name: booking.buyer?.name?.trim() || 'Guest',
          to_email: to,
          booking_id: booking.id,
          booking_id_short: String(booking.id).slice(0, 8),
          guest_count: String(booking.guestCount || attendees.length || 1),
          amount_paid: rupees(booking.amountPaise - balancePaise),
          balance_due: rupees(balancePaise),
          total: rupees(booking.amountPaise),
          attendees_list: attendees.map((a, i) => `${i + 1}. ${a.name} — ${passLabel(a)}`).join('\n'),
          balance_link: `${siteUrl()}/axp-social?booking=${encodeURIComponent(booking.id)}#balance`,
          subject_line: reminder
            ? `Reminder: ${rupees(balancePaise)} due on your Aagaz booking`
            : `Your Aagaz booking is held · balance ${rupees(balancePaise)}`,
          email_badge: reminder ? 'Reminder · balance due' : 'Booked · balance due',
          email_intro: reminder
            ? `A reminder that ${rupees(balancePaise)} is still due on your Aagaz booking. Entry is by QR pass only, and your QR passes are issued once the booking is paid in full. Pay online by UPI whenever you like, or in cash at the venue.`
            : 'Your deposit is received and your places at Aagaz are held. Pay the balance whenever you like, online by UPI or in cash at the venue. Entry is by QR pass only, and your QR passes are emailed as soon as the booking is paid in full.',
        },
      }),
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
