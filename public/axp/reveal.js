// Content below the fold rises into place as it scrolls into view.
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
