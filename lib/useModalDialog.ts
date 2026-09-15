"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog behaviour shared by the site's modals: Escape closes, Tab stays inside
 * the panel, the page stops scrolling underneath, and focus goes back to
 * whatever opened the dialog when it closes.
 *
 * Scroll is stopped in Lenis as well as flagged on the body. Lenis scrolls the
 * page itself rather than relying on `overflow`, so `body { overflow: hidden }`
 * alone let the page travel behind an open dialog.
 *
 * `close` MUST BE STABLE (a useCallback, or a context function). The effect
 * depends on it, and a new function every render would re-run it - re-taking
 * focus and recording an element inside the dialog as the one to return to.
 */
export function useModalDialog(
  open: boolean,
  close: () => void,
  panelRef: RefObject<HTMLElement | null>,
  /** Selector for what receives focus on open; falls back to the first button. */
  initialFocus = "button",
) {
  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
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
    /* On <html> as well as <body>. html carries overflow-x: clip, and any
       overflow value other than visible on the root stops body's overflow
       propagating to the viewport - so body alone was never the scroller being
       locked. Lenis being stopped hid that: it swallows wheel events, but not
       ones inside a data-lenis-prevent region, and those scrolled the page. */
    document.documentElement.dataset.scrollLocked = "true";
    document.body.dataset.scrollLocked = "true";

    const lenis = (window as unknown as { __lenisInstance?: { stop(): void; start(): void } })
      .__lenisInstance;
    lenis?.stop();

    const target =
      panelRef.current?.querySelector<HTMLElement>(initialFocus) ??
      panelRef.current?.querySelector<HTMLElement>("button");
    target?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      delete document.documentElement.dataset.scrollLocked;
      delete document.body.dataset.scrollLocked;
      lenis?.start();
      opener?.focus?.();
    };
  }, [open, close, panelRef, initialFocus]);
}
