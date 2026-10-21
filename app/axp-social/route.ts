import { rawBookingHtml } from '@/lib/axp/templates/booking-html';

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

export function GET() {
  const html = rawBookingHtml
    .replace('<title>Aagaz · AXP Social</title>', '<title>AAGAZ · AxP Social · Invitation edition</title>')
    .replace('href="style.css"', 'href="/axp/style.css?v=2"')
    .replace('src="app.js"', 'src="/axp/app.js?v=12"')
    .replace('src="payment.js"', 'src="/axp/payment.js?v=6"')
    .replace('width=device-width, initial-scale=1', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .replace('</head>', '<link rel="stylesheet" href="/axp/fonts/fonts.css"><link rel="stylesheet" href="/axp/axp-preview.css?v=18"><link rel="preload" as="image" href="/axp/ivory-plum-gathering.png"><script type="module" src="/axp/reveal.js"></script></head>')
    .replace('<body>', '<body class="axp-edition"><a class="axp-skip" href="#your-details">Skip to booking form</a>')
    .replace(/<header>[\s\S]*?<\/header>/, '')
    .replace('<section class="hero"', '<section id="event-details" class="hero"')
    .replace('<div id="event-rules"', '<div class="hero-actions"><a id="hero-cta" class="hero-cta" href="#your-details">Book your passes <span aria-hidden="true">→</span></a><div id="event-countdown" class="event-countdown" hidden><span class="cd-label">Doors open in</span><span id="event-countdown-units" class="cd-units"></span></div></div><ul id="hero-offers" class="hero-offers" aria-label="Offers" hidden></ul><div id="event-rules"')
    .replace('<div id="event-kicker"', '<p class="axp-presenter"><img src="/axp/emblem.png" alt="" width="34" height="34"><span>AxP Social presents</span></p><div id="event-kicker"')
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
    .replace('</article></div></section><section id="what-is-on"', '</article></div><p class="pass-selection-note">You choose Silver or Gold for your booking in its first step, or a mix of both.</p></section><section id="what-is-on"')
    .replace('<div class="layout">', bookingOffers + stallSpotlight + '<div class="layout">')
    .replace('<a id="stall-link" href="/axp-social/stalls">Apply for a stall ↗</a>', '<a id="stall-link" href="#business-stalls">Explore stall opportunities &#8593;</a>')
    .replace('<div class="layout">', '<nav class="axp-steps" aria-label="Booking steps"><a href="#your-details"><span>01</span> Passes</a><i aria-hidden="true"></i><a href="#your-guests"><span>02</span> Attendees</a><i aria-hidden="true"></i><a href="#payment-step"><span>03</span> Review &amp; pay</a></nav><div class="layout">')
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

  return new Response(threeStepBooking(html), {
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
 * Three booking steps instead of five:
 *   1. Passes: how many people, whether the booker is one of them, and which pass.
 *   2. Attendees: each guest's details, with the booking contact's own fields
 *      shown only when they are booking for others.
 *   3. Review & pay: the review, the terms and the payment choice on one screen,
 *      with the Pay button straight after the choice.
 * "The event" was never a booking step, so it leaves the form and becomes
 * part of the page, just above it.
 */
function threeStepBooking(input: string): string {
  let html = input;

  // The event: out of the form, above the booking steps, ending in a way in.
  const event = cut(html, '<section id="event-info-step"', '<section id="your-details"');
  html = event.rest;
  let eventInfo = swap(event.piece, 'id="event-info-step" class="panel step-panel"', 'id="event-info" class="panel event-panel"');
  eventInfo = swap(eventInfo, /<span class="step">01<\/span>/, '');
  eventInfo = swap(
    eventInfo,
    /<div class="step-nav">[\s\S]*<\/div><\/section>\s*$/,
    '<div class="event-cta-row"><a class="hero-cta event-cta" href="#your-details" data-start-booking>Book your passes <span aria-hidden="true">→</span></a></div></section>'
  );
  html = swap(html, '<nav class="axp-steps"', `<div class="layout event-layout"><div class="form-column">${eventInfo}</div></div><nav class="axp-steps"`);

  // Step 1, passes. The contact fields move to step 2, where they show only
  // when the booker is not coming.
  const note = cut(html, '<p class="required-note">', '<div class="guest-count">');
  html = note.rest;
  const contact = cut(html, '<div class="field-grid">', '<div class="step-nav">');
  html = contact.rest;
  html = swap(html, '<span class="step">02</span><div><h2>Your booking details</h2><p>One contact for payment and all the tickets.</p>', '<span class="step">01</span><div><h2>Your passes</h2><p>How many are coming, and which pass.</p>');
  html = swap(
    html,
    /(<section id="your-details"[\s\S]*?<div class="guest-count">[\s\S]*?<\/div><\/div>)/,
    '$1' +
      '<label class="check attending-toggle"><input id="booking-for-others" type="checkbox" name="bookingForOthers"><span>I’m booking for others and not coming myself</span></label>' +
      '<fieldset id="pass-choice" class="plan-choice pass-choice"><legend>Which pass? <span class="required-marker" aria-hidden="true">*</span></legend>' +
      '<label class="plan-option"><input type="radio" id="booking-pass-normal" name="booking-pass" value="normal" required data-field-label="Pass" aria-describedby="booking-pass-normal-error"><span class="plan-text"><strong>Silver</strong><small id="pass-choice-normal-note"></small></span><b id="pass-choice-normal-amount" class="plan-amount"></b></label>' +
      '<label class="plan-option"><input type="radio" name="booking-pass" value="alcohol"><span class="plan-text"><strong>Gold · 21+</strong><small id="pass-choice-alcohol-note"></small></span><b id="pass-choice-alcohol-amount" class="plan-amount"></b></label>' +
      '<label class="plan-option"><input type="radio" name="booking-pass" value="mix"><span class="plan-text"><strong>A mix of both</strong><small>Choose Silver or Gold for each person on the next step.</small></span></label>' +
      '</fieldset><small id="booking-pass-normal-error" class="field-error" hidden></small>' +
      '<p id="pass-choice-quote" class="pass-choice-quote" aria-live="polite"></p>'
  );

  // Step 2, attendees, with the contact fields for someone booking for others.
  html = swap(html, '<span class="step">03</span><div><h2>Who’s coming?</h2>', '<span class="step">02</span><div><h2>Who’s coming?</h2>');
  html = swap(html, '<button class="text-button" id="copy-buyer" type="button">Use my details for attendee 1</button>', '');
  html = swap(
    html,
    '<div id="attendees"></div>',
    `${note.piece}<div id="booking-contact" class="booking-contact" hidden><h3>Booking contact</h3><p class="helper">The payment receipt and every pass are sent here.</p>${contact.piece}</div><div id="attendees"></div>`
  );

  // Step 3, review and pay. The review's own total goes: the payment choice
  // right below it already shows what each way of paying costs.
  const review = cut(html, '<section id="booking-review"', '<section id="payment-step"');
  html = review.rest;
  const checks = cut(review.piece, '<div class="review-body">', '<button id="review-booking-button"');
  let reviewBody = swap(checks.piece, /<div class="subtotal"><span>[^<]*<\/span><strong id="review-total"><\/strong><\/div>/, '');
  reviewBody = swap(reviewBody, '<h3 class="review-heading">Your booking so far</h3>', '<h3 class="review-heading">Your booking</h3>');
  html = swap(
    html,
    /<span class="step">05<\/span><div><h2>Payment<\/h2><p>[^<]*<\/p><\/div><\/div>/,
    `<span class="step">03</span><div><h2>Review &amp; pay</h2><p>Check your booking, then choose how to pay.</p></div></div>${reviewBody}<p id="form-message" class="message" role="status"></p>`
  );
  // The Pay button follows the payment choice; the invitation card, a third
  // look at the same total, moves below it.
  const card = cut(html, '<div class="payment-summary">', '<div class="payment-status">');
  html = card.rest;
  html = swap(html, '<div class="support">', `${card.piece}<div class="support">`);
  return html;
}
