"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import poses from "@/public/assets/mascot/poses.json";
import { useContact } from "./ContactContext";
import { site } from "@/lib/site";

/**
 * Contact dialog, opened from the header and the hero.
 *
 * NOTE: there is no form backend wired up. Submitting composes a prefilled
 * mail draft to site.contact.email so the site is useful from day one.
 * Swap `handleSubmit` for a POST to Resend / Formspree / an API route when
 * you want submissions landing somewhere automatically.
 */
export default function ContactModal() {
  const { isOpen, close } = useContact();
  const panelRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    /**
     * Everything a dialog owes a keyboard user, which this one was not paying.
     *
     * The system critic measured all three: 13 background controls were still
     * focusable behind an `aria-modal="true"` that promised otherwise (WCAG
     * 2.1.2), focus landed on BODY after Escape instead of returning to
     * whatever opened the dialog (WCAG 2.4.3), and the page kept scrolling
     * underneath - `body { overflow: hidden }` is invisible to Lenis, which
     * scrolls a transform, so the background travelled 1082px with the dialog
     * open.
     */
    const opener = document.activeElement as HTMLElement | null;

    const FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }

      if (event.key !== "Tab") return;

      // Trap. Wrapping by hand rather than with `inert` on the rest of the page:
      // the clone lap already relies on staying non-inert to remain clickable,
      // so reaching for inert here would be one global switch away from
      // resurrecting that bug.
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

    // Stop the smooth-scroll engine, not just the document. See above.
    const lenis = (window as unknown as { __lenisInstance?: { stop(): void; start(): void } })
      .__lenisInstance;
    lenis?.stop();

    // Move focus into the dialog for keyboard and screen-reader users.
    // Prefer the first real field over the close button, which comes first
    // in DOM order but is a dead end to land on.
    const firstField =
      panelRef.current?.querySelector<HTMLElement>("input, textarea") ??
      panelRef.current?.querySelector<HTMLElement>("button");
    firstField?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      delete document.body.dataset.scrollLocked;
      lenis?.start();
      // Back where they came from, not to the top of the document.
      opener?.focus?.();
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const subject = encodeURIComponent(`Project enquiry from ${name || "the website"}`);
    const body = encodeURIComponent(
      [`Name: ${name}`, `Email: ${email}`, "", message].join("\n"),
    );
    window.location.href = `mailto:${site.contact.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="contact-title">
      <button type="button" className="modal__scrim" aria-label="Close dialog" onClick={close} />

      <div className="modal__panel" ref={panelRef}>
        <button type="button" className="modal__close" onClick={close} aria-label="Close dialog">
          &times;
        </button>

        <aside className="modal__aside">
          {/* Zeal, rather than the old gradient placeholder standing in for a
              portrait nobody has. He is the one who walked the reader down the
              page; he should be the one who greets them when they ask for help,
              instead of handing them off to an empty avatar. */}
          <div className="modal__zeal" aria-hidden="true">
            <Image
              src={poses["zeal-celebrating"].src}
              alt=""
              width={poses["zeal-celebrating"].width}
              height={poses["zeal-celebrating"].height}
              sizes="140px"
            />
          </div>
          <h3 className="modal__title" id="contact-title">
            Talk to us directly
          </h3>
          <p className="card__body">
            Tell us what is eating your time. We will come back with whether software
            is worth it for you, and what it would cost.
          </p>
          <p className="modal__note">
            <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
          </p>
        </aside>

        <div className="modal__main">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <label htmlFor="contact-name">Your name</label>
              <input
                id="contact-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Who are we speaking to?"
                required
              />
            </div>

            <div className="field-row">
              <label htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                required
              />
            </div>

            <div className="field-row">
              <label htmlFor="contact-message">What is slowing you down?</label>
              <textarea
                id="contact-message"
                className="input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Billing takes two hours every evening, stock counts never match..."
                required
              />
            </div>

            <button type="submit" className="btn btn--primary">
              Send enquiry
            </button>

            <p className="modal__note">
              This opens a prefilled mail draft. No form backend is connected yet.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
