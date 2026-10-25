/**
 * The business stall application page. Written as a readable template literal
 * rather than the single-line escaped strings the older pages use, because
 * nothing rewrites this one with string replacement.
 */
export const rawStallsHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'none'; base-uri 'none'; object-src 'none'">
<title>Business stalls &middot; AAGAZ &middot; AxP Social</title>
<meta name="description" content="Apply for a business stall at Aagaz, the first AxP Social gathering.">
<link rel="stylesheet" href="/axp/style.css">
<link rel="stylesheet" href="/axp/fonts/fonts.css?v=2">
<link rel="stylesheet" href="/axp/axp-preview.css?v=24">
<script type="module" src="/axp/stalls.js?v=2"></script>
<script type="module" src="/axp/reveal.js"></script>
</head>
<body class="axp-edition">
<a class="axp-skip" href="#stall-form">Skip to the application form</a>
<main>
  <section class="hero stall-hero" aria-labelledby="stall-title">
    <a class="axp-presenter" href="/axp-social" aria-label="AxP Social presents Aagaz — back to the invitation"><img src="/axp/emblem-256.png" alt="" width="34" height="34"><span>AxP Social presents</span></a>
    <h1 id="stall-title">Business stalls<span>Bring your table to the circle.</span></h1>
    <p class="intro">Aagaz gathers a small, curated room. A limited number of stall spaces are open to businesses whose work the room would want to meet. Tell us about yours and the organisers will come back to you.</p>
    <a class="hero-cta stall-hero-cta" href="#stall-form">Apply for a stall <span aria-hidden="true">&#8595;</span></a>
  </section>

  <section class="event-description" aria-labelledby="stall-about">
    <span class="eyebrow">BEFORE YOU APPLY</span>
    <h2 id="stall-about">How it works</h2>
    <p><strong>&#8377;6,000 per stall, with event entry included.</strong> The organisers will confirm the included pass allocation and setup details with you. This is an enquiry, not a booking: no payment is required to apply, and submitting this form does not hold a space. Applications are subject to organiser approval. Stall spaces are limited.</p>
  </section>

  <div class="layout stall-layout">
    <div class="form-column">
      <form id="stall-form" novalidate>
        <section class="panel">
          <div class="section-top"><span class="step">01</span>
            <div><h2>Your business</h2><p>Who you are and what you would bring.</p></div>
          </div>
          <div class="field-grid">
            <label><span>Business name <span class="required-marker" aria-hidden="true">*</span></span>
              <input id="stall-business" name="businessName" maxlength="120" placeholder="Studio Saffron" required></label>
            <label><span>Contact name <span class="required-marker" aria-hidden="true">*</span></span>
              <input id="stall-contact" name="contactName" maxlength="100" placeholder="Aarav Sharma" required></label>
            <label><span>Phone <span class="required-marker" aria-hidden="true">*</span></span>
              <input id="stall-phone" name="phone" type="tel" maxlength="20" placeholder="+91 98765 43210" required></label>
            <label><span>Email <span class="optional-marker">(optional)</span></span>
              <input id="stall-email" name="email" type="email" maxlength="150" placeholder="aarav@example.com"></label>
          </div>
          <label class="stall-wide"><span>What would your stall offer? <span class="required-marker" aria-hidden="true">*</span></span>
            <input id="stall-offering" name="offering" maxlength="200" placeholder="Hand-poured candles and a small gifting bar" required></label>
          <label class="stall-wide"><span>Anything else <span class="optional-marker">(optional)</span></span>
            <textarea id="stall-notes" name="notes" rows="4" maxlength="1000" placeholder="Space or power you would need, what you would like to display, links to your work."></textarea></label>
          <p class="privacy">Your details are used only to contact you about a stall at this event. They are not published and do not subscribe you to marketing.</p>
          <p id="stall-message" class="message" role="status"></p>
          <button type="submit" id="stall-submit" class="primary">Send stall enquiry <span aria-hidden="true">&#8594;</span></button>
        </section>
      </form>
      <section id="stall-done" class="panel" hidden aria-live="polite">
        <h2>Your enquiry is in.</h2>
        <p>Thank you. The organisers have your details and will come back to you about a stall at Aagaz. Nothing has been charged and no space is held yet.</p>
        <a class="venue-link" href="/axp-social">Back to the guest invitation &#8599;</a>
      </section>
    </div>
  </div>

  <footer class="axp-footer">
    <nav class="policy-nav" aria-label="Event information and policies">
      <a href="/axp-social/policies/about">About us</a> &middot; <a href="/axp-social/policies/contact">Contact us</a> &middot; <a href="/axp-social/policies/terms">Terms and conditions</a> &middot; <a href="/axp-social/policies/privacy">Privacy policy</a>
    </nav>
    <div class="footer-meta"><span>AxP SOCIAL &middot; AAGAZ / THE FIRST CHAPTER</span><span id="footer-copyright" class="footer-copyright"></span></div>
  </footer>
</main>
</body></html>
`;
