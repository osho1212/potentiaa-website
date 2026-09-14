"use client";

import { useEffect, useRef } from "react";
import LogoMark from "./LogoMark";
import MobileNav from "./MobileNav";
import { useContact } from "./ContactContext";
import { site } from "@/lib/site";
import { onScrollFrame } from "@/lib/scrollState";

/** Minimum gap between surface checks while the page is scrolling. */
const CHECK_INTERVAL = 60;

/** Background alpha at or above which a layer counts as the surface itself. */
const OPAQUE_ENOUGH = 0.6;

/**
 * Whether the page behind a point is light.
 *
 * Walks the stack of elements at that point from the top down, skipping the
 * header itself, and answers from the first one that decides it:
 *
 *   1. an element (or ancestor) marked data-nav-surface - for surfaces with no
 *      CSS background to read, like the offerings card, which is painted white
 *      by a WebGL particle field (see components/CardFormationParticles);
 *   2. otherwise the first element with a mostly opaque background colour,
 *      judged by its relative luminance.
 *
 * Anything with pointer-events: none is not in the stack at all, which is what
 * keeps the particle canvases and the floating module out of the reading.
 * Nothing found means the page's own dark ground.
 */
function isLightAt(x: number, y: number, header: HTMLElement): boolean {
  for (const el of document.elementsFromPoint(x, y)) {
    if (header.contains(el)) continue;

    const marked = el.closest<HTMLElement>("[data-nav-surface]");
    if (marked) return marked.dataset.navSurface === "light";

    const match = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
    if (!match) continue;
    const [r, g, b, a = 1] = match.map(Number);
    if (a < OPAQUE_ENOUGH) continue;

    const channel = (value: number) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    // 0.4 is where dark text overtakes white text on contrast.
    return luminance > 0.4;
  }
  return false;
}

export default function Header() {
  const { open } = useContact();
  const headerRef = useRef<HTMLElement>(null);

  /**
   * READABLE ON WHATEVER IS BEHIND IT.
   *
   * The pills are dark glass with light text, built for a dark page - and over
   * the white offerings card that text disappeared. Each pill now checks what
   * is behind its own centre and flips to a light style over light surfaces.
   * Per pill, because the two sit at opposite ends of the screen and need not
   * be over the same thing.
   *
   * Checked on the shared scroll frame, throttled, with a trailing check so the
   * resting position is always the one that decides. Resize can move content
   * under the header without any scrolling, so it checks too.
   */
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const pills = Array.from(header.querySelectorAll<HTMLElement>(".header__pill"));

    let lastCheck = 0;
    let trailing = 0;

    const check = () => {
      lastCheck = performance.now();
      for (const pill of pills) {
        const box = pill.getBoundingClientRect();
        const surface = isLightAt(box.left + box.width / 2, box.top + box.height / 2, header)
          ? "light"
          : "dark";
        if (pill.dataset.surface !== surface) pill.dataset.surface = surface;
      }
    };

    const schedule = () => {
      window.clearTimeout(trailing);
      if (performance.now() - lastCheck >= CHECK_INTERVAL) check();
      trailing = window.setTimeout(check, CHECK_INTERVAL + 30);
    };

    check();
    const unsubscribe = onScrollFrame(schedule);
    window.addEventListener("resize", schedule);
    return () => {
      unsubscribe();
      window.removeEventListener("resize", schedule);
      window.clearTimeout(trailing);
    };
  }, []);

  return (
    <header className="header" ref={headerRef}>
      <div className="header__inner">
        <div className="header__pill header__brand">
          <MobileNav />
          <a
            className="header__brand-link"
            href="#top"
            aria-label={`${site.name} home`}
          >
            <LogoMark className="header__logo" title={site.name} />
            <span className="header__wordmark">{site.name}</span>
          </a>
        </div>

        <div className="header__pill header__pill--nav">
          <nav className="header__nav" aria-label="Primary">
            {site.nav.map((item) => (
              <a key={item.href} className="header__link" href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="header__actions">
            <button type="button" className="btn btn--primary" onClick={open}>
              Get in touch
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
