const el = id => document.getElementById(id);
const form = el('stall-form');
const message = el('stall-message');
const submit = el('stall-submit');

el('footer-copyright').textContent = `\u00a9 ${new Date().getFullYear()} Potentiaa. All rights reserved.`;

const phoneOk = v => /^\+?[0-9 ()-]{8,20}$/.test(v.trim())
  && v.replace(/\D/g, '').length >= 8 && v.replace(/\D/g, '').length <= 15;

// Checked here for a quick answer, and again on the server, which is the one
// that decides.
function problem() {
  if (!el('stall-business').value.trim()) return 'Enter your business name.';
  if (!el('stall-contact').value.trim()) return 'Enter a contact name.';
  if (!phoneOk(el('stall-phone').value)) return 'Enter a valid phone number with country code.';
  const email = el('stall-email').value.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  if (!el('stall-offering').value.trim()) return 'Tell us what your stall would offer.';
  return '';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const invalid = problem();
  message.textContent = invalid;
  if (invalid) return;

  submit.disabled = true;
  message.textContent = 'Sending your enquiry…';
  try {
    const response = await fetch('/api/axp/stalls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: el('stall-business').value,
        contactName: el('stall-contact').value,
        phone: el('stall-phone').value,
        email: el('stall-email').value,
        offering: el('stall-offering').value,
        notes: el('stall-notes').value,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Your stall enquiry could not be sent.');
    form.hidden = true;
    el('stall-done').hidden = false;
    el('stall-done').scrollIntoView({ block: 'center' });
  } catch (error) {
    message.textContent = error.message || 'Your stall enquiry could not be sent.';
  } finally {
    submit.disabled = false;
  }
});
