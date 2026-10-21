import { rawBookingHtml } from '@/lib/axp/templates/booking-html';
import { site } from '@/lib/site';
import { shareTags } from '@/lib/axp/share-tags';

const lotus = `<svg class="axp-lotus" viewBox="0 0 64 64" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="1.1"><path d="M32 47C19 38 21 24 32 13c11 11 13 25 0 34Z"/><path d="M32 47C15 45 10 33 11 23c14 0 24 9 21 24Zm0 0c17-2 22-14 21-24-14 0-24 9-21 24Z"/><path d="M32 47C16 51 8 44 4 35c12-5 25-1 28 12Zm0 0c16 4 24-3 28-12-12-5-25-1-28 12Z"/><path d="m22 51 10 7 10-7M32 47v11"/></g></svg>`;

const bookingOffers = `<section id="offer-list-wrap" class="booking-offers" aria-labelledby="booking-offers-title" hidden>
  <div class="booking-offers-heading"><span class="eyebrow">OFFERS &amp; PRE-BOOKING</span><h2 id="booking-offers-title">Your evening, your way.</h2></div>
  <ul id="offer-list" class="booking-offers-grid"></ul>
</section>`;

const stallSpotlight = `<section id="business-stalls" class="stall-spotlight" aria-labelledby="stall-spotlight-title">
  <div class="stall-spotlight-copy">
    <span class="eyebrow">FOR BRANDS &amp; SMALL BUSINESSES</span>
    <h2 id="stall-spotlight-title">Bring your brand to AAGAZ.</h2>
    <p>Showcase your products, meet new customers, and be part of the celebration.</p>
    <p class="stall-spotlight-availability">Limited stall spaces &middot; Subject to organiser approval</p>
  </div>
  <div class="stall-spotlight-action">
    <p class="stall-spotlight-price"><strong>&#8377;6,000</strong><span>/ stall</span></p>
    <p class="stall-spotlight-inclusion">Event entry included. Pass allocation confirmed by the organisers.</p>
    <a class="stall-spotlight-cta" href="/axp-social/stalls">Apply for a stall <span aria-hidden="true">&#8594;</span></a>
    <p class="stall-spotlight-note">No payment required to apply.</p>
  </div>
</section>`;

// For guests who have lost their confirmation page or email: the booking
// reference plus the email or phone they booked with. find-booking.js runs it.
const findBooking = `<dialog id="find-booking" class="find-booking" aria-labelledby="find-booking-title">
  <form id="find-booking-form" novalidate>
    <h2 id="find-booking-title">Find your booking</h2>
    <p class="helper">Enter the booking reference from your confirmation or email, and the email address or phone number you booked with.</p>
    <label><span>Booking reference</span><input id="find-ref" name="ref" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" placeholder="For example 4795D474" required></label>
    <label><span>Email or phone</span><input id="find-contact" name="contact" autocomplete="email" maxlength="150" placeholder="you@example.com or +91 98765 43210" required></label>
    <p id="find-booking-message" class="find-booking-message" role="alert" hidden></p>
    <div class="find-booking-actions"><button type="submit" class="primary" id="find-booking-submit">Find booking</button><button type="button" class="secondary" id="find-booking-close">Close</button></div>
  </form>
</dialog>`;

// On a laptop the guests step has a second column: what the booking costs so
// far and the way on, kept in view while the cards are filled in. app.js
// fills it; on a phone the bar at the foot of the screen does this job.
const bookingAside = `<aside id="booking-aside" class="booking-aside" aria-label="Your booking so far">
  <span class="eyebrow">YOUR BOOKING</span>
  <p class="booking-aside-event"><strong id="aside-event">AAGAZ</strong><span id="aside-when"></span></p>
  <div id="aside-lines" class="booking-aside-lines"></div>
  <p class="booking-aside-total"><span>Total</span><strong id="aside-total"></strong></p>
  <p id="aside-saving" class="booking-aside-saving" hidden></p>
  <button type="button" id="aside-action" class="primary booking-aside-action">Review &amp; pay <span aria-hidden="true">→</span></button>
  <p class="booking-aside-note">Secure payment by Razorpay. A named QR pass for every guest.</p>
</aside>`;

export function GET() {
  const html = rawBookingHtml
    .replace('<title>Aagaz · AXP Social</title>', '<title>AAGAZ · Diwali Sundowner · 6 Nov, Rishikesh · AxP Social</title>')
    .replace(
      /<meta name="description" content="[^"]*">/,
      shareTags({
        title: 'AAGAZ · A private Diwali sundowner by AxP Social',
        description: 'Friday 6 November, 3 pm to midnight, at Sukh Saklana Haveli, Rishikesh. Named passes, early-bird, couple and group prices.',
        url: `${site.url}/axp-social`,
        image: `${site.url}/axp/share-aagaz.jpg`,
        imageAlt: 'AAGAZ, a private Diwali sundowner by AxP Social, Friday 6 November at Sukh Saklana Haveli, Rishikesh',
      })
    )
    .replace('href="style.css"', 'href="/axp/style.css?v=2"')
    .replace('src="app.js"', 'src="/axp/app.js?v=16"')
    .replace('src="payment.js"', 'src="/axp/payment.js?v=9"></script><script type="module" src="/axp/find-booking.js?v=1"')
    .replace('width=device-width, initial-scale=1', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .replace('</head>', '<link rel="stylesheet" href="/axp/fonts/fonts.css?v=2"><link rel="stylesheet" href="/axp/axp-preview.css?v=23"><link rel="preload" as="image" type="image/webp" href="/axp/ivory-plum-gathering.webp" fetchpriority="high"><script type="module" src="/axp/reveal.js"></script></head>')
    .replace('<body>', '<body class="axp-edition"><a class="axp-skip" href="#your-guests">Skip to booking form</a>')
    .replace(/<header>[\s\S]*?<\/header>/, '')
    .replace('<section class="hero"', '<section id="event-details" class="hero"')
    .replace('<div id="event-rules"', '<div class="hero-actions"><a id="hero-cta" class="hero-cta" href="#your-guests">Book your passes <span aria-hidden="true">→</span></a><div class="hero-more"><a id="hero-prebook" class="hero-more-link" href="#your-guests" hidden><span>Pre-book for <span id="hero-prebook-amount">₹500</span><span class="hero-more-extra"> a person</span></span></a><a id="hero-stall" class="hero-more-link" href="/axp-social/stalls"><span><span class="hero-more-extra">Have a brand? </span>Apply for a stall</span></a></div><div id="event-countdown" class="event-countdown" hidden><span class="cd-label">Doors open in</span><span id="event-countdown-units" class="cd-units"></span></div></div><p id="hero-early" class="hero-early" role="status" hidden></p><ul id="hero-offers" class="hero-offers" aria-label="Offers" hidden></ul><div id="event-rules"')
    .replace('<div id="event-kicker"', '<p class="axp-presenter"><img src="/axp/emblem-256.png" alt="" width="34" height="34"><span>AxP Social presents</span></p><div id="event-kicker"')
    .replace('<ul id="hero-offers" class="hero-offers" aria-label="Offers" hidden></ul>', '')
    .replace('It starts with us.', 'A new circle. A beautiful beginning.')
    .replace('The first gathering of AXP Social. A new circle, a beautiful haveli, and an afternoon that turns into a night to remember.', 'An afternoon that becomes an evening to remember. Join us for the first gathering of AxP Social.')
    .replace(/(<div id="event-rules"[^>]*>[\s\S]*?<\/div>)(<\/section>)/, '$1<div class="axp-hero-art" aria-hidden="true"></div>$2')
    // The rules strip leaves the hero. Its one rule stated nowhere else, the
    // entry age, moves into the passes hint in the event step.
    .replace(/<div id="event-rules"[^>]*>[\s\S]*?<\/div>/, '')
    // The Where box shows the venue and the map link only.
    .replace(/<span id="event-location">[^<]*<\/span>/, '')
    .replace('<strong id="merchant-name">Avyanta Hotels</strong>', '<strong id="merchant-name">Potentiaa</strong>')
    // Keeps the arrow with "Maps" when the link wraps in a narrow box.
    .replaceAll('Open in Google Maps ↗', 'Open in Google Maps ↗')
    .replace('Choose up to five passes. Mixing pass types is welcome.', 'Entry is for guests aged 20 and over. Choose up to 5 passes per booking; mixing pass types is welcome.')
    .replace('</article></div></section><section id="what-is-on"', '</article></div><p class="pass-selection-note">You choose Silver or Gold for each guest when you book.</p></section><section id="what-is-on"')
    .replace('<div class="layout">', bookingOffers + '<div class="layout">')
    .replace('<a id="stall-link" href="/axp-social/stalls">Apply for a stall ↗</a>', '<a id="stall-link" href="#business-stalls">Explore stall opportunities &#8595;</a>')
    .replace('<div class="layout">', '<p class="find-booking-link"><button type="button" class="text-button" data-find-booking>Already booked? Find your booking</button></p><nav class="axp-steps" aria-label="Booking steps"><a href="#your-guests"><span>01</span> Guests</a><i aria-hidden="true"></i><a href="#payment-step"><span>02</span> Review &amp; pay</a></nav><div class="layout booking-layout">')
    .replace('<section class="panel"><div class="section-top"><span class="step">02', '<section id="your-details" class="panel step-panel"><div class="section-top"><span class="step">02')
    .replace('<section class="panel"><div class="section-top"><span class="step">03', '<section id="your-guests" class="panel step-panel"><div class="section-top"><span class="step">03')
    .replace('<section class="panel"><div class="section-top"><span class="step">04', '<section id="booking-review" class="panel step-panel"><div class="section-top"><span class="step">04')
    .replace('<input id="buyer-name"', '<input placeholder="Your full name" id="buyer-name"')
    .replace('<input id="buyer-email"', '<input placeholder="you@example.com" id="buyer-email"')
    .replace('<span class="eyebrow">YOUR EVENING</span>', `${lotus}<span class="eyebrow">YOUR EVENING</span>`)
    .replace('<h2 id="summary-title">Booking summary</h2>', '<h2 id="summary-title">Your invitation</h2>')
    // The review shows the final amount, not a subtotal before charges.
    .replace('<span>Base subtotal</span><strong id="review-total">', '<span>Total</span><strong id="review-total">')
    // The policy links move into the footer, above the copyright line.
    .replace(/(<nav class="policy-nav"[^>]*>[\s\S]*?<\/nav>)\s*<footer>[\s\S]*?<\/footer>/, '<footer class="axp-footer">$1<div class="footer-meta"><span>AxP SOCIAL · AAGAZ / THE FIRST CHAPTER</span><span id="footer-copyright" class="footer-copyright"></span></div></footer>')
    .replace('<a href="/policies/about">About us</a>', '<a href="#find-booking" data-find-booking>Find my booking</a> · <a href="/policies/about">About us</a>')
    .replaceAll('href="/policies/', 'href="/axp-social/policies/')
    // How to pay: in full now, or a deposit now and the balance later. app.js
    // fills in the amounts and hides the choice when pre-booking is off.
    .replace(
      '<div class="payment-summary">',
      '<fieldset id="plan-choice" class="plan-choice"><legend>How would you like to pay?</legend>' +
        '<label class="plan-option"><input type="radio" name="booking-plan" value="full" checked><span class="plan-text"><strong>Pay in full</strong><small id="plan-full-note"></small></span><b id="plan-full-amount" class="plan-amount"></b></label>' +
        '<label class="plan-option"><input type="radio" name="booking-plan" value="prebook"><span class="plan-text"><strong>Pre-book with a deposit</strong><small id="plan-prebook-note"></small></span><b id="plan-prebook-amount" class="plan-amount"></b></label>' +
        '</fieldset>' +
        // Opened by app.js when a guest picks pre-booking while early-bird prices apply.
        '<dialog id="prebook-notice" class="prebook-notice" aria-labelledby="prebook-notice-title" aria-describedby="prebook-notice-text"><h2 id="prebook-notice-title">Early-bird prices need full payment</h2><p id="prebook-notice-text"></p><div class="prebook-notice-actions"><button type="button" id="prebook-notice-full" class="primary">Pay in full instead</button><button type="button" id="prebook-notice-continue" class="secondary">Continue with pre-booking</button></div></dialog>' +
        '<div class="payment-summary">'
    )
    .replace(
      /(<li id="bar-rule">[^<]*<\/li>)/,
      '$1<li id="prebook-rule">Entry is by QR pass only. A pre-booking gets its QR passes once it is paid in full; until then it cannot be admitted. The balance can be paid any time by UPI on your booking page, or in cash at the venue, where our team records it and issues the passes before entry. The deposit is non-refundable.</li>'
    );

  return new Response(twoStepBooking(html), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}

/**
 * Cuts the piece of `html` from `start` up to, not including, `end`. Every
 * marker is required: a template change that drops one fails loudly here
 * rather than shipping a booking form with a step missing.
 */
function cut(html: string, start: string, end: string): { rest: string; piece: string } {
  const from = html.indexOf(start);
  const to = from < 0 ? -1 : html.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`Booking page markup changed: cannot find ${from < 0 ? start : end}.`);
  return { rest: html.slice(0, from) + html.slice(to), piece: html.slice(from, to) };
}

function swap(html: string, find: string | RegExp, replacement: string): string {
  const next = html.replace(find, replacement);
  if (next === html) throw new Error(`Booking page markup changed: cannot find ${String(find)}.`);
  return next;
}

/**
 * Two booking steps instead of five:
 *   1. Guests: how many are coming, whether the booker is one of them, and
 *      each guest's details and pass, Silver or Gold, chosen person by person.
 *      The booking contact's own fields show only when they are booking for
 *      others.
 *   2. Review & pay: the booking and its price, the payment choice, the terms
 *      and the Pay button, in that order.
 * "The event" was never a booking step, so it leaves the form and becomes
 * part of the page, just above it.
 */
function twoStepBooking(input: string): string {
  let html = input;

  // The event: out of the form, above the booking steps, ending in a way in.
  const event = cut(html, '<section id="event-info-step"', '<section id="your-details"');
  html = event.rest;
  let eventInfo = swap(event.piece, 'id="event-info-step" class="panel step-panel"', 'id="event-info" class="panel event-panel"');
  eventInfo = swap(eventInfo, /<span class="step">01<\/span>/, '');
  eventInfo = swap(
    eventInfo,
    /<div class="step-nav">[\s\S]*<\/div><\/section>\s*$/,
    '<div class="event-cta-row"><a class="hero-cta event-cta" href="#your-guests" data-start-booking>Book your passes <span aria-hidden="true">→</span></a></div></section>'
  );
  html = swap(html, '<nav class="axp-steps"', `<div class="layout event-layout"><div class="form-column">${eventInfo}</div></div><nav class="axp-steps"`);

  // The old details step is taken apart: its guest count and required-fields
  // note join the guests step, and its contact fields show there only when the
  // booker is not coming.
  const details = cut(html, '<section id="your-details"', '<section id="your-guests"');
  html = details.rest;
  const note = cut(details.piece, '<p class="required-note">', '<div class="guest-count">').piece;
  const count = cut(details.piece, '<div class="guest-count">', '<div class="field-grid">').piece;
  const contact = cut(details.piece, '<div class="field-grid">', '<div class="step-nav">').piece;

  // Step 1, guests. app.js fills in the prices, the early-bird and booking-size
  // notes, and shows "same pass for everyone" once there are two or more.
  html = swap(
    html,
    '<span class="step">03</span><div><h2>Who’s coming?</h2><p>Each attendee gets a named pass. No ticket transfers.</p></div></div>',
    '<span class="step">01</span><div><h2>Who’s coming?</h2><p>A named pass for each guest, Silver or Gold. No ticket transfers.</p></div></div>' +
      '<p id="pass-prices" class="pass-prices" aria-live="polite"></p>' +
      '<p id="early-bird-left" class="early-bird-left" role="status" hidden></p>' +
      count +
      '<p id="booking-limit-note" class="booking-limit-note" hidden></p>' +
      '<label class="check attending-toggle"><input id="booking-for-others" type="checkbox" name="bookingForOthers"><span>I’m booking for others and not coming myself</span></label>' +
      '<div id="pass-all" class="pass-all" hidden><span>Same pass for everyone?</span><button type="button" class="pass-all-option" data-pass="normal">All Silver</button><button type="button" class="pass-all-option" data-pass="alcohol">All Gold · 21+</button></div>'
  );
  html = swap(html, '<button class="text-button" id="copy-buyer" type="button">Use my details for attendee 1</button>', '');
  html = swap(
    html,
    '<div id="attendees"></div>',
    `${note}<div id="booking-contact" class="booking-contact" hidden><h3>Booking contact</h3><p class="helper">The payment receipt and every pass are sent here.</p>${contact}</div><div id="attendees"></div>`
  );

  // Step 2, review and pay: the booking and its price first, then how to
  // pay, the terms (folded, with the box to tick left out) and the Pay button.
  const review = cut(html, '<section id="booking-review"', '<section id="payment-step"');
  html = review.rest;
  let reviewBody = cut(review.piece, '<div class="review-body">', '<ul class="terms">').piece;
  reviewBody = swap(reviewBody, /<div class="subtotal"><span>[^<]*<\/span><strong id="review-total"><\/strong><\/div>/, '');
  reviewBody = swap(reviewBody, '<h3 class="review-heading">Your booking so far</h3>', '<h3 class="review-heading">Your booking</h3>');
  const terms = cut(review.piece, '<ul class="terms">', '<label class="check">').piece;
  const tick = cut(review.piece, '<label class="check">', '<p class="privacy">').piece;
  const privacy = cut(review.piece, '<p class="privacy">', '<div id="validation-summary"').piece;
  const readiness = cut(review.piece, '<div id="validation-summary"', '<button id="review-booking-button"').piece;
  const termsBox =
    '<details class="terms-details"><summary>Read the booking terms</summary>' +
    terms +
    privacy +
    '<p class="terms-links"><a href="/axp-social/policies/terms" target="_blank" rel="noopener">Terms and conditions</a> · <a href="/axp-social/policies/refunds" target="_blank" rel="noopener">Cancellation and refunds</a> · <a href="/axp-social/policies/privacy" target="_blank" rel="noopener">Privacy policy</a></p>' +
    '</details>';
  html = swap(
    html,
    /<span class="step">05<\/span><div><h2>Payment<\/h2><p>[^<]*<\/p><\/div><\/div>/,
    `<span class="step">02</span><div><h2>Review &amp; pay</h2><p>Check your booking and its price, then choose how to pay.</p></div></div>${reviewBody}`
  );
  // The price breakdown follows the booking, before any choice or button.
  const card = cut(html, '<div class="payment-summary">', '<div class="payment-status">');
  html = card.rest;
  html = swap(html, '<p id="ticket-delivery-note"', `${card.piece}<p id="ticket-delivery-note"`);
  // Terms, the box to tick and what is still missing sit just above Pay.
  html = swap(html, '<div class="payment-status">', `${termsBox}${tick}${readiness}<p id="form-message" class="message" role="status"></p><div class="payment-status">`);
  // The guests step's summary column, shown on a laptop, before its buttons.
  html = swap(html, /(<section id="your-guests"[\s\S]*?)(<div class="step-nav">)/, `$1${bookingAside}$2`);
  // The stall promo follows the booking form: it is for businesses, not
  // guests, so it no longer stands between the offers and the event.
  html = swap(html, '</form></div>\n</div><section class="brand-strip"', `</form></div>\n</div>${stallSpotlight}${findBooking}<section class="brand-strip"`);
  return html;
}
