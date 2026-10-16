import { bookingEntryCode } from '@/lib/axp/payment-core';
import { passQrUrl } from '@/lib/axp/whatsapp-service';

export interface EmailDeliveryResult {
  success: boolean;
  recipients: string[];
  errors: string[];
}

export async function sendBookingConfirmationEmails(booking: any): Promise<EmailDeliveryResult> {
  const serviceId =
    process.env.NEXT_PUBLIC_EMAILJS_AXP_SERVICE_ID ||
    process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ||
    'service_59d1ylv';
  const templateId =
    process.env.NEXT_PUBLIC_EMAILJS_AXP_TEMPLATE_ID ||
    process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ||
    'template_x1xmkvu';
  const publicKey =
    process.env.NEXT_PUBLIC_EMAILJS_AXP_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ||
    'wUJPfRnz1y09Ms68T';

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
              `${i + 1}. ${a.name} — ${
                a.pass === 'alcohol' ? 'Alcohol-inclusive Pass · 21+' : 'Classic Pass · Non-alcoholic'
              }${a.instagram ? ' (' + a.instagram + ')' : ''}`
          )
          .join('\n')
      : `1. ${buyerName} — Classic Pass · Non-alcoholic`;

  const amountPaise = booking.amountPaise || (typeof booking.total === 'number' ? booking.total * 100 : 100);
  const formattedAmount = `₹${(amountPaise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: amountPaise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://potentiaa.com').replace(/\/+$/, '');
  const passLink = `${siteUrl}/axp-social?booking=${encodeURIComponent(booking.id || '')}#passes`;

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
        list: `• ${guest.name} — ${
          guest.pass === 'alcohol' ? 'Alcohol-inclusive Pass · 21+' : 'Classic Pass · Non-alcoholic'
        }${guest.instagram ? ' (' + guest.instagram + ')' : ''}\n(Booked in group order by ${buyerName})`,
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
