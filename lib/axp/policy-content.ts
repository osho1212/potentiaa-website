import { EventSettings } from './event-settings';

export const POLICY_VERSION = 'aagaz-2026-03';

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

const money = (value: number | null | undefined) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value ?? 0);

export function getPolicyContent(settings: EventSettings, slug: string): { title: string; html: string } | null {
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
    pricing: `<p>${event}.</p><table class="booking-table"><thead><tr><th>Pass</th><th>Early bird</th><th>Regular</th><th>Benefits</th></tr></thead><tbody><tr><td>Silver, single</td><td>${e(
      money(s.earlyNormalPrice)
    )}</td><td>${e(money(s.normalPrice))}</td><td>${e(s.normalDescription)}</td></tr><tr><td>Silver, couple or group (each)</td><td>${e(
      money(s.earlyNormalGroupPrice)
    )}</td><td>${e(money(s.normalGroupPrice))}</td><td>${e(s.normalDescription)}</td></tr><tr><td>Gold · 21+, single</td><td>${e(
      money(s.earlyAlcoholPrice)
    )}</td><td>${e(money(s.alcoholPrice))}</td><td>${e(s.alcoholDescription)}</td></tr><tr><td>Gold · 21+, couple or group (each)</td><td>${e(
      money(s.earlyAlcoholGroupPrice)
    )}</td><td>${e(money(s.alcoholGroupPrice))}</td><td>${e(s.alcoholDescription)}</td></tr></tbody></table><p>Prices are per person. Couple prices apply to two people of different genders on the same pass type; group prices apply when four or more people in one booking have the same pass type. Each pass type is priced separately within a booking.</p><p>${
      s.earlyBirdEnabled
        ? `Early-bird prices apply to bookings paid in full until ${e(
            new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(s.earlyBirdEndDate + 'T00:00:00Z'))
          )} at ${e(time(s.earlyBirdEndTime))} IST, or until ${e(s.earlyBirdCap)} early-bird passes are sold, whichever comes first. A booking gets early-bird prices only if all its passes fit within the remaining early-bird passes.`
        : 'Early-bird prices are not currently offered.'
    }</p>${
      s.prebookEnabled
        ? `<p>Pre-booking: hold your places with a non-refundable deposit of ${e(
            money(s.depositPerPerson)
          )} per person and pay the balance later, by UPI on your booking page or in cash at the venue. Pre-bookings pay regular prices; early-bird prices do not apply. Entry is by QR pass only, and a pre-booking gets its QR passes once it is paid in full.</p>`
        : ''
    }<p>${
      s.chargesConfirmed
        ? `Additional charge per person: ${e(money(s.extraPerPerson))}. Additional charge per booking: ${e(
            money(s.extraPerBooking)
          )}. These are the organiser-confirmed final additional charges, including applicable taxes.`
        : 'Additional charges are not yet confirmed. Guest payment cannot open until final charges are confirmed.'
    }</p><p>Mixed pass types are allowed. Your full payable amount is calculated and shown before payment. A saved booking retains its agreed prices.</p><p>Only the listed pass benefits are included. Any drinks menu or serving details still marked as unconfirmed must be finalised before sales open.</p>${merchant}${contact}`,
    terms: `<p>${event}. Last service is at ${e(time(s.barCloseTime))} IST.</p><ol><li>Passes are issued to named attendees and are non-transferable. Provide accurate buyer and attendee details. Contact support for corrections.</li><li>General entry is for attendees aged 20 or older. Gold passes are for attendees aged 21 or older. Organisers check photo ID and eligibility at the venue; this website does not request an ID-document upload.</li><li>A booking may contain up to ${s.maxPerBooking} attendees; larger groups should contact the organisers. Places are subject to availability. An unpaid checkout hold lasts 15 minutes.</li><li>Couple prices are for two people of different genders on the same pass type. Organisers check each person's gender against photo ID at the venue; if the details do not match, the difference to the single price is payable before entry.</li>${
      s.prebookEnabled
        ? `<li>A pre-booking holds places with a non-refundable deposit of ${e(money(s.depositPerPerson))} per person. The balance can be paid at any time by UPI on the booking page, or in cash at the venue. Pre-bookings pay regular prices. Entry is by QR pass only, and QR passes are issued only once a booking is paid in full. A guest paying the balance at the venue is admitted once the organisers have recorded the payment and issued the passes.</li>`
        : ''
    }<li>A booking is confirmed after the site verifies the correct captured payment. If a payment seems uncertain, check the existing booking or contact support before paying again.</li><li>Once a booking is paid in full, each attendee's named QR pass is emailed and can be downloaded from the booking page. Keep the pass and booking reference available for entry.</li><li>Each ticket may be checked in once. Keep its QR private. Refunded tickets are invalid for entry.</li><li>Guest cancellation and non-attendance follow the <a href="/axp-social/policies/refunds">cancellation and refund policy</a>. Organiser cancellation and refunds required by applicable law remain exceptions.</li></ol>${merchant}${contact}`,
    privacy: `<p>The registered collecting business is ${e(
      s.merchantLegalName
    )}, at ${e(
      s.merchantAddress
    )}, working with the AxP Social organiser team to administer this event.</p><h2>Information used for your booking</h2><p>We collect the buyer's full name, Instagram username, phone number and email address. For each attendee we collect a name, email address, phone number, Instagram username (optional), date of birth, gender and selected pass. Only the age group worked out from the date of birth is stored. Gender is used to apply couple prices and to check couple passes against photo ID at the venue. Booking records include amounts, payment references and status, ticket records and entry-check details.</p><h2>Purpose and access</h2><p>We use these records to administer your booking, verify payment, issue named tickets, manage capacity, respond to booking and payment questions and check attendees in. Authorised organiser team members can access these records using their own accounts. Booking does not subscribe you to marketing; marketing use requires separate permission.</p><h2>Service providers</h2><p>Our hosting providers process data needed to operate the website and booking records. Razorpay handles payment checkout and payment processing. Card, UPI and bank-entry details are handled through Razorpay's checkout. Booking confirmations and passes are sent by email through EmailJS. Cash and UPI payments taken by the organisers are recorded against the booking.</p><h2>Record retention and requests</h2><p>Booking and payment records are retained for event administration, payment or dispute handling and applicable merchant recordkeeping obligations. Contact event support about access, correction or deletion requests. Outstanding payment, dispute and legal recordkeeping needs may affect what can be deleted.</p>${contact}`,
    refunds: `<h2>Guest cancellation and non-attendance</h2><p>Successful bookings are not refundable for a guest's change of plans, cancellation or non-attendance. Named passes are non-transferable.</p>${
      s.prebookEnabled
        ? `<h2>Pre-booking deposits</h2><p>A pre-booking deposit of ${e(money(s.depositPerPerson))} per person is non-refundable. If the balance is never paid, the deposit is kept and no pass is issued.</p>`
        : ''
    }<h2>Organiser cancellation and required refunds</h2><p>If the organiser cancels the event, or a refund is required by applicable law, the organiser will arrange the applicable refund through the collecting merchant and payment provider. Contact support for the relevant payment reference and processing status. A refunded ticket is invalid for entry.</p><h2>Payment deducted without confirmation</h2><p>Check the existing booking and contact event support with your booking and payment reference before making another payment. The organiser will reconcile the payment with Razorpay and resolve duplicate or unfulfilled payments as applicable.</p>${merchant}${contact}`,
  };

  return {
    title: POLICY_PAGES[slug],
    html: pages[slug],
  };
}
