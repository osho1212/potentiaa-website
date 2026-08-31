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
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const opener = document.activeElement as HTMLElement | null;

    const FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
    document.body.dataset.scrollLocked = "true";

    const lenis = (window as unknown as { __lenisInstance?: { stop(): void; start(): void } })
      .__lenisInstance;
    lenis?.stop();

    const firstField =
      panelRef.current?.querySelector<HTMLElement>("input, textarea") ??
      panelRef.current?.querySelector<HTMLElement>("button");
    firstField?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      delete document.body.dataset.scrollLocked;
      lenis?.start();
      opener?.focus?.();
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const subject = encodeURIComponent(`Project enquiry from ${name || "a business owner"}`);
    const body = encodeURIComponent(
      [
        `Name: ${name}`,
        `Phone / WhatsApp: ${phone}`,
        `Email: ${email}`,
        "",
        `Daily bottleneck:`,
        message,
      ].join("\n"),
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
            Let’s talk about your business
          </h3>
          <p className="card__body">
            Tell us what takes up the most time in your day (billing, stock, managing staff, or finding customers). We’ll give you an honest recommendation and a clear plan.
          </p>
          <p className="modal__note">
            <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
          </p>
        </aside>

        <div className="modal__main">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <label htmlFor="contact-name">Your Name & Business</label>
              <input
                id="contact-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rajesh Sharma (Sharma Hardware)"
                required
              />
            </div>

            <div className="field-row">
              <label htmlFor="contact-phone">Phone / WhatsApp</label>
              <input
                id="contact-phone"
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
              />
            </div>

            <div className="field-row">
              <label htmlFor="contact-email">Email (Optional)</label>
              <input
                id="contact-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
              />
            </div>

            <div className="field-row">
              <label htmlFor="contact-message">What is your biggest daily headache?</label>
              <textarea
                id="contact-message"
                className="input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Billing takes 2 hours every evening, warehouse stock never matches our sales records..."
                required
              />
            </div>

            <button type="submit" className="btn btn--primary">
              Send Enquiry
            </button>

            <p className="modal__note">
              We respond within 24 hours on WhatsApp or email.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
