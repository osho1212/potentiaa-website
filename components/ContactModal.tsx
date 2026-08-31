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

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
              <button type="submit" className="btn btn--primary" style={{ width: "100%", justifyContent: "center" }}>
                Send Enquiry via Email
              </button>

              <a
                href={`https://wa.me/918267839736?text=${encodeURIComponent(
                  "Hi Potentiaa team, I would like to book a free call to discuss our business workflow."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                  color: "#ffffff",
                  fontWeight: 600,
                  borderRadius: "var(--radius-full)",
                  padding: "10px 20px",
                  textDecoration: "none",
                  width: "100%",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                Chat on WhatsApp (+91 82678 39736)
              </a>
            </div>

            <p className="modal__note">
              We respond within 24 hours on WhatsApp or email.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
