"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useContact } from "./ContactContext";
import { site } from "@/lib/site";

/**
 * The navigation for anything too narrow to hold the nav pill.
 *
 * Below the nav breakpoint the header used to set `.header__nav { display:
 * none }` and stop there, which left every phone with no way to reach "What we
 * build", "Services" or "How it works" at all - the links were not collapsed,
 * they were deleted. This restores them behind a toggle.
 *
 * PORTALLED TO BODY, deliberately. The button belongs inside
 * `.header__pill--nav`, but that pill carries `backdrop-filter`, and a filter
 * of any kind makes an element the containing block for `position: fixed`
 * descendants. A drawer rendered in place would be fixed to the pill - a 160px
 * box in the top-right corner - rather than to the viewport. The portal is what
 * keeps the markup where it reads best and the layout where it belongs.
 *
 * Kept MOUNTED while closed so the panel can transition out as well as in, and
 * held out of the tab order with `inert` for exactly as long as it is hidden.
 * The focus trap, the scroll lock and the Lenis stop are the same three the
 * contact dialog does - see components/ContactModal for why each is needed.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Matches the width at which .header__nav gives up in the stylesheet. */
const NARROW = "(max-width: 767px)";

export default function MobileNav() {
  const { open: openContact } = useContact();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Portals need a DOM to land in, and there is none during the server render.
  useEffect(() => setMounted(true), []);

  /**
   * Close on the way back up to the wide layout.
   *
   * A `change` listener rather than a one-shot `.matches` read: rotating a
   * phone or dragging a window wider would otherwise leave the drawer open and
   * scroll-locked over a layout that has its nav pill back.
   */
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const onChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setIsOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.dataset.scrollLocked = "true";

    // `body { overflow: hidden }` is invisible to Lenis, which scrolls a
    // transform rather than the document. See ContactModal.
    const lenis = (window as unknown as { __lenisInstance?: { stop(): void; start(): void } })
      .__lenisInstance;
    lenis?.stop();

    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      delete document.body.dataset.scrollLocked;
      lenis?.start();
      // Back to the control that opened it, not to the top of the document.
      toggleRef.current?.focus();
    };
  }, [isOpen]);

  const drawer = (
    <div className="nav-drawer" data-open={isOpen} inert={!isOpen}>
      <button
        type="button"
        className="nav-drawer__scrim"
        aria-label="Close menu"
        tabIndex={-1}
        onClick={() => setIsOpen(false)}
      />

      <div
        className="nav-drawer__panel"
        id="mobile-nav"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <nav className="nav-drawer__nav" aria-label="Primary">
          {site.nav.map((item) => (
            <a
              key={item.href}
              className="nav-drawer__link"
              href={item.href}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="btn btn--primary nav-drawer__cta"
          onClick={() => {
            setIsOpen(false);
            openContact();
          }}
        >
          Get in touch
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        ref={toggleRef}
        className="nav-toggle"
        aria-expanded={isOpen}
        aria-controls="mobile-nav"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="nav-toggle__bars" aria-hidden="true" />
      </button>

      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
