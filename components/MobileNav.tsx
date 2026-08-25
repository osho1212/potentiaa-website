"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useContact } from "./ContactContext";
import { site } from "@/lib/site";
import OptionWheel from "./OptionWheel";

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

  const navItems = useMemo(
    () => [
      { label: "Home", href: "#top" },
      ...site.nav,
    ],
    []
  );

  const labels = useMemo(() => navItems.map((n) => n.label), [navItems]);

  // Portals need a DOM to land in, and there is none during the server render.
  useEffect(() => setMounted(true), []);

  /**
   * Close on the way back up to the wide layout.
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

    const lenis = (window as unknown as { __lenisInstance?: { stop(): void; start(): void } })
      .__lenisInstance;
    lenis?.stop();

    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      delete document.body.dataset.scrollLocked;
      lenis?.start();
      toggleRef.current?.focus();
    };
  }, [isOpen]);

  const handleSelect = useCallback(
    (index: number) => {
      const item = navItems[index];
      if (!item) return;

      setIsOpen(false);

      if (item.href.startsWith("#")) {
        const targetId = item.href.slice(1);
        if (targetId === "top") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        const el = document.getElementById(targetId) || document.querySelector(item.href);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }
    },
    [navItems]
  );

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
        className="nav-drawer__panel nav-drawer__panel--wheel"
        id="mobile-nav"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        {/* Top-left close button */}
        <button
          type="button"
          className="nav-drawer__close-topleft"
          aria-label="Close menu"
          onClick={() => setIsOpen(false)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="nav-drawer__wheel-container">
          <OptionWheel
            items={labels}
            defaultSelected={0}
            side="left"
            fontSize={2.2}
            spacing={1.45}
            curve={1.15}
            tilt={8}
            blur={1.8}
            fade={0.3}
            smoothing={220}
            inset={24}
            onSelect={handleSelect}
          />
        </div>

        {/* Floating Get in Touch button on the right side */}
        <div className="nav-drawer__floating-cta-wrap">
          <button
            type="button"
            className="btn btn--primary nav-drawer__floating-cta"
            onClick={() => {
              setIsOpen(false);
              setTimeout(() => openContact(), 250);
            }}
          >
            Get in touch
          </button>
        </div>
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
