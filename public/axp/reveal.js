// Motion shared by the guest pages: content below the fold rises into place as
// it scrolls into view, and golden glints drift over the hero.
//
// Nothing is hidden unless this script runs and motion is welcome: the hiding
// rule only applies under html.reveal-ready, which is set here, so a script
// that fails to load or a reduced-motion preference leaves every element
// simply visible. The stagger comes from a data attribute rather than an
// inline style, because these pages forbid inline styles.
const SELECTOR = [
  '.event-info-body > section',
  '.pass-options article',
  '.highlight-grid li',
  '.brand-strip',
  '.brand-card',
  '.policy-nav',
  'main > footer',
  '.stall-layout .panel',
  'main > .event-description',
].join(',');

const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduce && 'IntersectionObserver' in window) {
  const items = [...new Set(document.querySelectorAll(SELECTOR))];
  for (const item of items) {
    const peers = [...item.parentElement.children].filter(child => child.matches(SELECTOR));
    item.dataset.revealIndex = String(Math.min(Math.max(peers.indexOf(item), 0), 8));
    item.classList.add('reveal-item');
  }
  document.documentElement.classList.add('reveal-ready');

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });

  for (const item of items) observer.observe(item);
}

// Golden glints over the hero. Their positions and timings live in CSS
// (nth-child), so nothing here needs an inline style.
if (!reduce) {
  for (const hero of document.querySelectorAll('.hero')) {
    if (hero.querySelector('.hero-glints')) continue;
    const field = document.createElement('div');
    field.className = 'hero-glints';
    field.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 14; i++) field.append(document.createElement('span'));
    hero.prepend(field);
  }
}

// ticket-tilt: passes lean toward the pointer and catch the light, like a card
// held in the hand. Only where there is a real hover pointer to follow.
if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  for (const ticket of document.querySelectorAll('.ticket')) {
    ticket.addEventListener('pointermove', event => {
      const box = ticket.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      ticket.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg');
      ticket.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
      ticket.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      ticket.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    });
    ticket.addEventListener('pointerleave', () => {
      ticket.style.setProperty('--rx', '0deg');
      ticket.style.setProperty('--ry', '0deg');
    });
  }
}

// A few small fireworks over "What's on", for the finale it promises.
if (!reduce) {
  const section = document.getElementById('what-is-on');
  if (section && !section.querySelector('.fireworks')) {
    const sky = document.createElement('div');
    sky.className = 'fireworks';
    sky.setAttribute('aria-hidden', 'true');
    for (let b = 0; b < 3; b++) {
      const burst = document.createElement('span');
      burst.className = 'burst';
      for (let i = 0; i < 12; i++) burst.append(document.createElement('i'));
      sky.append(burst);
    }
    section.prepend(sky);
  }
}
