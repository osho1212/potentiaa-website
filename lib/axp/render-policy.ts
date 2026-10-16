import { EventSettings } from './event-settings';

export const POLICY_VERSION = 'aagaz-2026-02';

export const POLICY_PAGES: Record<string, string> = {
  about: 'About us',
  contact: 'Contact us',
  pricing: 'Pricing details',
  terms: 'Terms and conditions',
  privacy: 'Privacy policy',
  refunds: 'Cancellation and refunds',
};

const escape = (value: any) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);

export function renderPolicyHtml(settings: EventSettings, slug: string): string | null {
  if (!Object.hasOwn(POLICY_PAGES, slug)) return null;

  const s = settings;
  const e = escape;

  const day = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(s.eventDate + 'T00:00:00Z'));

  const time = (value: string) =>
    new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    }).format(new Date('2000-01-01T' + value + ':00Z'));

  const contact = `<p>Event support: <a href="tel:${e(
    s.supportPhone.replace(/[^+\d]/g, '')
  )}">${e(s.supportPhone)}</a>${
    s.supportEmail ? ` · <a href="mailto:${e(s.supportEmail)}">${e(s.supportEmail)}</a>` : ''
  }.</p>`;

  const merchant = `<p>Authorised collecting merchant: <strong>${e(
    s.merchantName
  )}</strong>. Registered business: <strong>${e(s.merchantLegalName)}</strong>.</p><p>Registered business address: ${e(
    s.merchantAddress
  )}.</p><p>Merchant contact: <a href="mailto:${e(s.merchantEmail)}">${e(s.merchantEmail)}</a>.${
    s.merchantGstin ? ` GSTIN: ${e(s.merchantGstin)}.` : ''
  }</p>`;

  const event = `${e(s.eventName)} on ${e(day)}, from ${e(time(s.startTime))} until ${
    s.endTime === '00:00' ? 'midnight (the start of the following day)' : e(time(s.endTime))
  } IST, at ${e(s.venueName)}, ${e(s.venueLocation)}`;

  const pages: Record<string, string> = {
    about: `<p>AxP Social brings people together through social gatherings. ${event} is our first chapter.</p><p>This website provides named event bookings, verified payments, individual QR tickets and organiser entry checks. Book up to ${s.maxPerBooking} attendees together, subject to the event capacity of ${s.capacity} people.</p>${merchant}<p>The collecting merchant's name may appear in Razorpay checkout and payment records.</p>${contact}`,

    contact: `<p>For booking questions, attendee corrections, ticket access and payment concerns, contact the event organiser. Quote your booking reference and, for a payment concern, the payment reference when available.</p>${contact}${merchant}<p>Venue: ${e(
      s.venueName
    )}, ${e(s.venueLocation)}.</p>`,

    pricing: `<p>${event}.</p><table class="booking-table"><thead><tr><th>Pass</th><th>Base price per person</th><th>Benefits</th></tr></thead><tbody><tr><td>Silver</td><td>${e(
      money(s.normalPrice)
    )}</td><td>${e(s.normalDescription)}</td></tr><tr><td>Gold · 21+</td><td>${e(
      money(s.alcoholPrice)
    )}</td><td>${e(s.alcoholDescription)}</td></tr></tbody></table><p>${
      s.chargesConfirmed
        ? `Additional charge per person: ${e(money(s.extraPerPerson ?? 0))}. Additional charge per booking: ${e(
            money(s.extraPerBooking ?? 0)
          )}. These are the organiser-confirmed final additional charges, including applicable taxes.`
        : 'Additional charges are not yet confirmed. Guest payment cannot open until final charges are confirmed.'
    }</p><p>Mixed pass types are allowed. Your full payable amount is calculated and shown before payment. A saved booking retains its agreed prices.</p><p>Only the listed pass benefits are included. Any drinks menu or serving details still marked as unconfirmed must be finalised before sales open.</p>${merchant}${contact}`,

    terms: `<p>${event}. Last service is at ${e(time(s.barCloseTime))} IST.</p><ol><li>Passes are issued to named attendees and are non-transferable. Provide accurate buyer and attendee details. Contact support for corrections.</li><li>General entry is for attendees aged 20 or older. Gold passes are for attendees aged 21 or older. Organisers check photo ID and eligibility at the venue; this website does not request an ID-document upload.</li><li>A booking may contain up to ${
      s.maxPerBooking
    } attendees. Places are subject to availability. An unpaid checkout hold lasts 15 minutes.</li><li>A booking is confirmed after the site verifies the correct captured payment. If a payment seems uncertain, check the existing booking or contact support before paying again.</li><li>After verification, view and download each attendee's named QR ticket from the confirmation page. Automatic ticket emails are not currently enabled. Keep the ticket file and booking reference available for entry.</li><li>Each ticket may be checked in once. Keep its QR private. Refunded tickets are invalid for entry.</li><li>Guest cancellation and non-attendance follow the <a href="/axp-social/policies/refunds">cancellation and refund policy</a>. Organiser cancellation and refunds required by applicable law remain exceptions.</li></ol>${merchant}${contact}`,

    privacy: `<p>The registered collecting business is ${e(s.merchantLegalName)}, at ${e(
      s.merchantAddress
    )}, working with the AxP Social organiser team to administer this event.</p><h2>Information used for your booking</h2><p>We collect the buyer's full name, Instagram username, phone number and email address. For each attendee we collect a name, Instagram username, phone number, age group and selected pass. Booking records include amounts, payment references and status, ticket records and entry-check details.</p><h2>Purpose and access</h2><p>We use these records to administer your booking, verify payment, issue named tickets, manage capacity, respond to booking and payment questions and check attendees in. Authorised organiser team members can access these records using their own accounts. Booking does not subscribe you to marketing; marketing use requires separate permission.</p><h2>Service providers</h2><p>Our hosting providers process data needed to operate the website and booking records. Razorpay handles payment checkout and payment processing. Card, UPI and bank-entry details are handled through Razorpay's checkout. Automatic ticket email is currently deferred; confirmed guests download tickets from this website.</p><h2>Record retention and requests</h2><p>Booking and payment records are retained for event administration, payment or dispute handling and applicable merchant recordkeeping obligations. Contact event support about access, correction or deletion requests. Outstanding payment, dispute and legal recordkeeping needs may affect what can be deleted.</p>${contact}`,

    refunds: `<h2>Guest cancellation and non-attendance</h2><p>Successful bookings are not refundable for a guest's change of plans, cancellation or non-attendance. Named passes are non-transferable.</p><h2>Organiser cancellation and required refunds</h2><p>If the organiser cancels the event, or a refund is required by applicable law, the organiser will arrange the applicable refund through the collecting merchant and payment provider. Contact support for the relevant payment reference and processing status. A refunded ticket is invalid for entry.</p><h2>Payment deducted without confirmation</h2><p>Check the existing booking and contact event support with your booking and payment reference before making another payment. The organiser will reconcile the payment with Razorpay and resolve duplicate or unfulfilled payments as applicable.</p>${merchant}${contact}`,
  };

  const navigation = Object.entries(POLICY_PAGES)
    .map(
      ([key, title]) =>
        `<a href="/axp-social/policies/${key}"${key === slug ? ' aria-current="page"' : ''}>${title}</a>`
    )
    .join(' · ');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(
    POLICY_PAGES[slug]
  )} · ${e(
    s.eventName
  )} · AxP Social</title><link rel="stylesheet" href="/axp/style.css"><link rel="stylesheet" href="/axp/fonts/fonts.css"><link rel="stylesheet" href="/axp/axp-preview.css"><script type="module" src="/axp/reveal.js"></script></head><body class="axp-edition policy-page"><header class="policy-header"><a class="hero-brand policy-brand" href="/axp-social" aria-label="AxP Social — ${e(
    s.eventName
  )}"><img src="/axp/emblem.png" alt="" width="44" height="44"><span class="axp-wordmark">AxP <span>SOCIAL</span></span></a><a href="/axp-social" class="tracker-link">Back to the invitation ↗</a></header><main class="policy-main"><article class="panel"><h1>${e(
    POLICY_PAGES[slug]
  )}</h1><p class="helper">${e(
    s.eventName
  )} · Policy version ${POLICY_VERSION} · 15 October 2026</p>${
    pages[slug]
  }</article><nav class="policy-nav" aria-label="Event information and policies">${navigation}</nav></main></body></html>`;
}
