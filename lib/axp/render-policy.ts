import { EventSettings } from './event-settings';
import { getPolicyContent, POLICY_PAGES, POLICY_VERSION } from './policy-content';

export { POLICY_PAGES, POLICY_VERSION };

const escape = (value: any) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/**
 * A policy page, whole. The wording lives in policy-content.ts, the one copy
 * of it: this file used to carry its own, which had drifted from the version
 * bookings record as accepted.
 */
export function renderPolicyHtml(settings: EventSettings, slug: string): string | null {
  const content = getPolicyContent(settings, slug);
  if (!content) return null;

  const s = settings;
  const e = escape;

  const navigation = Object.entries(POLICY_PAGES)
    .map(
      ([key, title]) =>
        `<a href="/axp-social/policies/${key}"${key === slug ? ' aria-current="page"' : ''}>${title}</a>`
    )
    .join(' · ');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(
    content.title
  )} · ${e(
    s.eventName
  )} · AxP Social</title><link rel="stylesheet" href="/axp/style.css?v=2"><link rel="stylesheet" href="/axp/fonts/fonts.css"><link rel="stylesheet" href="/axp/axp-preview.css?v=2"><script type="module" src="/axp/reveal.js"></script></head><body class="axp-edition policy-page"><header class="policy-header"><a class="hero-brand policy-brand" href="/axp-social" aria-label="AxP Social — ${e(
    s.eventName
  )}"><img src="/axp/emblem.png" alt="" width="44" height="44"><span class="axp-wordmark">AxP <span>SOCIAL</span></span></a><a href="/axp-social" class="tracker-link">Back to the invitation ↗</a></header><main class="policy-main"><article class="panel"><h1>${e(
    content.title
  )}</h1><p class="helper">${e(
    s.eventName
  )} · Policy version ${POLICY_VERSION} · 21 October 2026</p>${
    content.html
  }</article><nav class="policy-nav" aria-label="Event information and policies">${navigation}</nav></main></body></html>`;
}
