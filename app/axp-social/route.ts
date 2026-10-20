import { rawBookingHtml } from '@/lib/axp/templates/booking-html';

const lotus = `<svg class="axp-lotus" viewBox="0 0 64 64" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="1.1"><path d="M32 47C19 38 21 24 32 13c11 11 13 25 0 34Z"/><path d="M32 47C15 45 10 33 11 23c14 0 24 9 21 24Zm0 0c17-2 22-14 21-24-14 0-24 9-21 24Z"/><path d="M32 47C16 51 8 44 4 35c12-5 25-1 28 12Zm0 0c16 4 24-3 28-12-12-5-25-1-28 12Z"/><path d="m22 51 10 7 10-7M32 47v11"/></g></svg>`;

export function GET() {
  const html = rawBookingHtml
    .replace('<title>Aagaz · AXP Social</title>', '<title>AAGAZ · AxP Social · Invitation edition</title>')
    .replace('href="style.css"', 'href="/axp/style.css"')
    .replace('src="app.js"', 'src="/axp/app.js?v=3"')
    .replace('src="payment.js"', 'src="/axp/payment.js?v=2"')
    .replace('width=device-width, initial-scale=1', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .replace('</head>', '<link rel="stylesheet" href="/axp/fonts/fonts.css"><link rel="stylesheet" href="/axp/axp-preview.css"><link rel="preload" as="image" href="/axp/ivory-plum-gathering.png"><script type="module" src="/axp/reveal.js"></script></head>')
    .replace('<body>', '<body class="axp-edition"><a class="axp-skip" href="#your-details">Skip to booking form</a>')
    .replace(/<header>[\s\S]*?<\/header>/, '')
    .replace('<section class="hero"', '<section id="event-details" class="hero"')
    .replace('<div id="event-rules"', '<div class="hero-actions"><a id="hero-cta" class="hero-cta" href="#your-details">Book your passes <span aria-hidden="true">→</span></a><div id="event-countdown" class="event-countdown" hidden><span class="cd-label">Doors open in</span><span id="event-countdown-units" class="cd-units"></span></div></div><div id="event-rules"')
    .replace('<div id="event-kicker"', '<p class="axp-presenter"><img src="/axp/emblem.png" alt="" width="34" height="34"><span>AxP Social presents</span></p><div id="event-kicker"')
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
    .replace('</article></div></section><section id="what-is-on"', '</article></div><p class="pass-selection-note">You\u2019ll choose a Silver or Gold pass for each attendee during booking, after entering your details.</p></section><section id="what-is-on"')
    .replace('<div class="layout">', '<nav class="axp-steps" aria-label="Booking steps"><a href="#event-info-step"><span>01</span> The event</a><i aria-hidden="true"></i><a href="#your-details"><span>02</span> Your details</a><i aria-hidden="true"></i><a href="#your-guests"><span>03</span> Attendees</a><i aria-hidden="true"></i><a href="#booking-review"><span>04</span> Review</a><i aria-hidden="true"></i><a href="#payment-step"><span>05</span> Payment</a></nav><div class="layout">')
    .replace('<section class="panel"><div class="section-top"><span class="step">02', '<section id="your-details" class="panel step-panel"><div class="section-top"><span class="step">02')
    .replace('<section class="panel"><div class="section-top"><span class="step">03', '<section id="your-guests" class="panel step-panel"><div class="section-top"><span class="step">03')
    .replace('<section class="panel"><div class="section-top"><span class="step">04', '<section id="booking-review" class="panel step-panel"><div class="section-top"><span class="step">04')
    .replace('<input id="buyer-name"', '<input placeholder="Your full name" id="buyer-name"')
    .replace('<input id="buyer-email"', '<input placeholder="you@example.com" id="buyer-email"')
    .replace('<span class="eyebrow">YOUR EVENING</span>', `${lotus}<span class="eyebrow">YOUR EVENING</span>`)
    .replace('<h2 id="summary-title">Booking summary</h2>', '<h2 id="summary-title">Your invitation</h2>')
    // The policy links move into the footer, above the copyright line.
    .replace(/(<nav class="policy-nav"[^>]*>[\s\S]*?<\/nav>)\s*<footer>[\s\S]*?<\/footer>/, '<footer class="axp-footer">$1<div class="footer-meta"><span>AxP SOCIAL · AAGAZ / THE FIRST CHAPTER</span><span id="footer-copyright" class="footer-copyright"></span></div></footer>')
    .replaceAll('href="/policies/', 'href="/axp-social/policies/');

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}
