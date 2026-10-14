"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import poses from "@/public/assets/mascot/poses.json";
import { useContact } from "./ContactContext";
import { site } from "@/lib/site";
import { useModalDialog } from "@/lib/useModalDialog";

/**
 * Field length caps. EmailJS rejects a request over 50 KB; these keep any one
 * enquiry far inside that, and stop the form being used to mail out an essay.
 */
const LIMITS = { name: 120, phone: 20, email: 254, message: 2000 } as const;

/** How long after a successful send the form refuses another one. */
const RESEND_COOLDOWN_MS = 60_000;
const LAST_SENT_KEY = "potentiaa:enquiry-sent-at";

/** What a visitor sees when sending fails, whatever the cause. Technical
    detail goes to the console in development, never onto the page. */
const SEND_FAILED = `We couldn't send your message just now. Please WhatsApp us on ${site.contact.whatsappDisplay} or email ${site.contact.email}.`;

const PHONE_HINT = "Enter a valid phone or WhatsApp number, e.g. +91 98765 43210";

/** 7 digits covers short local numbers; 15 is the E.164 maximum. */
function isPlausiblePhone(value: string): boolean {
  if (!/^[0-9+()\-.\s]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

/**
 * A cooldown after a successful send, so a double click or an impatient
 * second press does not land the same enquiry twice.
 *
 * Not EmailJS's own `limitRate` option: that records the attempt BEFORE
 * sending, so a send that failed on a bad connection would lock the visitor
 * out of retrying for the whole window. This records only real sends.
 * Storage can be unavailable (private browsing, blocked site data); then
 * there is simply no cooldown.
 */
function sentRecently(): boolean {
  try {
    const at = Number(window.localStorage.getItem(LAST_SENT_KEY));
    return Date.now() - at < RESEND_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function rememberSent() {
  try {
    window.localStorage.setItem(LAST_SENT_KEY, String(Date.now()));
  } catch {
    // No storage, no cooldown - see sentRecently.
  }
}

/**
 * Contact dialog, opened from the header, hero, and work sections.
 * Sends directly to contact@potentiaa.com via EmailJS with graceful fallback.
 *
 * EmailJS runs in the browser, so everything here is a convenience a
 * determined sender can skip by calling the EmailJS API directly. The real
 * protection lives in the EmailJS dashboard: a template whose recipient is
 * fixed to contact@potentiaa.com rather than read from `to_email`.
 */
export default function ContactModal() {
  const { isOpen, close } = useContact();
  const panelRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  /* Honeypot. People never see this field, so anything in it was typed by a
     bot that fills in every input it finds. */
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useModalDialog(isOpen, close, panelRef, "input, textarea");

  if (!isOpen) return null;

  const handleReset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
    setWebsite("");
    setStatus("idle");
    setErrorMessage("");
  };

  const handleClose = () => {
    handleReset();
    close();
  };

  const fail = (text: string) => {
    setStatus("error");
    setErrorMessage(text);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");

    // A bot gets the success screen and nothing is sent, so it learns nothing.
    if (website) {
      setStatus("success");
      return;
    }

    const enquiry = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      message: message.trim(),
    };

    // `required` lets whitespace through, and the phone check normally runs as
    // the visitor types - these are the backstop.
    if (!enquiry.name || !enquiry.message) {
      fail("Please add your name and a short message.");
      return;
    }
    if (!isPlausiblePhone(enquiry.phone)) {
      fail(PHONE_HINT);
      return;
    }
    if (sentRecently()) {
      fail("You've just sent us a message. Please wait a minute before sending another, or WhatsApp us.");
      return;
    }

    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      // The variable names are for whoever is running the site locally. A
      // production build drops this branch, and visitors get the plain message.
      fail(
        process.env.NODE_ENV === "development"
          ? "EmailJS is not configured. Set NEXT_PUBLIC_EMAILJS_SERVICE_ID, NEXT_PUBLIC_EMAILJS_TEMPLATE_ID and NEXT_PUBLIC_EMAILJS_PUBLIC_KEY in .env.local (see .env.example)."
          : SEND_FAILED,
      );
      return;
    }

    setStatus("sending");
    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: site.contact.email,
          name: enquiry.name,
          phone: enquiry.phone,
          email: enquiry.email || "Not provided",
          title: `Project enquiry from ${enquiry.name}`,
          message: enquiry.message,
          time: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        },
        // blockHeadless refuses to send from automated browsers.
        { publicKey, blockHeadless: true }
      );
      rememberSent();
      setStatus("success");
    } catch (err: unknown) {
      if (process.env.NODE_ENV === "development") {
        console.error("EmailJS delivery failed:", err);
      }
      fail(SEND_FAILED);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="contact-title">
      <button type="button" className="modal__scrim" aria-label="Close dialog" onClick={handleClose} />

      <div className="modal__panel modal__panel--contact" ref={panelRef}>
        <button
          type="button"
          className="modal__close"
          onClick={handleClose}
          aria-label="Close dialog"
        >
          &times;
        </button>

        <aside className="modal__aside">
          <div className="modal__aside-header">
            <div className="modal__zeal" aria-hidden="true">
              <Image
                src={poses["zeal-celebrating"].src}
                alt=""
                width={poses["zeal-celebrating"].width}
                height={poses["zeal-celebrating"].height}
                sizes="(max-width: 767px) 52px, 140px"
              />
            </div>
            <div className="modal__aside-text">
              <h3 className="modal__title" id="contact-title">
                Let’s talk about your business
              </h3>
              <p className="card__body modal__aside-desc">
                Tell us what slows your business down (billing, inventory, staff, or workflows). We’ll prepare an honest roadmap and clear plan.
              </p>
            </div>
          </div>

          <div className="modal__direct-connect">
            <span className="modal__direct-label">Direct email:</span>
            <a href={`mailto:${site.contact.email}`} className="modal__email-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>{site.contact.email}</span>
            </a>
          </div>
        </aside>

        <div className="modal__main">
          {status === "success" ? (
            <div className="modal__success">
              <div className="modal__success-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h4 className="modal__success-title">Enquiry Sent Successfully!</h4>
              <p className="modal__success-desc">
                Thank you, <strong>{name || "friend"}</strong>. Your message has been routed to{" "}
                <strong>{site.contact.email}</strong>. Our team responds within 24 hours.
              </p>

              <div className="modal__success-actions">
                <a
                  href={`https://wa.me/${site.contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    `Hi Potentiaa, I just submitted an enquiry for ${name || "our business"}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn modal__btn-whatsapp"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  Connect on WhatsApp now
                </a>
                <button type="button" className="btn btn--secondary" onClick={handleClose} style={{ width: "100%", justifyContent: "center" }}>
                  Done / Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {status === "error" && (
                <div className="modal__error-banner" role="alert">
                  <p>{errorMessage}</p>
                </div>
              )}

              <div className="field-row">
                <label htmlFor="contact-name">Your Name & Business</label>
                <input
                  id="contact-name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma (Sharma Hardware)"
                  required
                  maxLength={LIMITS.name}
                  autoComplete="name"
                  autoCapitalize="words"
                />
              </div>

              <div className="field-row">
                <label htmlFor="contact-phone">Phone / WhatsApp</label>
                <input
                  id="contact-phone"
                  className="input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPhone(value);
                    // Native validation, so the browser holds the form and
                    // points at this field the same way it does for `required`.
                    e.target.setCustomValidity(
                      value.trim() && !isPlausiblePhone(value.trim()) ? PHONE_HINT : ""
                    );
                  }}
                  placeholder="+91 98765 43210"
                  required
                  maxLength={LIMITS.phone}
                />
              </div>

              <div className="field-row">
                <label htmlFor="contact-email">Email (Optional)</label>
                <input
                  id="contact-email"
                  className="input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  maxLength={LIMITS.email}
                />
              </div>

              <div className="field-row">
                <label htmlFor="contact-message">What is your biggest daily headache?</label>
                <textarea
                  id="contact-message"
                  className="input modal__textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Billing takes 2 hours every evening, warehouse stock never matches our sales records..."
                  required
                  maxLength={LIMITS.message}
                  rows={3}
                />
              </div>

              {/* The honeypot (see `website` above). Off-screen rather than
                  display:none, which some bots check for; aria-hidden and
                  tabIndex -1 keep it away from screen readers and the keyboard. */}
              <div className="modal__hp" aria-hidden="true">
                <label htmlFor="contact-website">Leave this field empty</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="modal__action-group">
                <button
                  type="submit"
                  className="btn btn--primary modal__submit-btn"
                  disabled={status === "sending"}
                >
                  {status === "sending" ? (
                    <span className="modal__spinner-wrap">
                      <span className="modal__spinner" aria-hidden="true" />
                      Sending to {site.contact.email}...
                    </span>
                  ) : (
                    <span>Send Enquiry to {site.contact.email}</span>
                  )}
                </button>

                <a
                  href={`https://wa.me/${site.contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    "Hi Potentiaa team, I would like to book a free call to discuss our business workflow."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn modal__btn-whatsapp"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  Chat on WhatsApp ({site.contact.whatsappDisplay || site.contact.whatsapp})
                </a>
              </div>

              {/* The collection notice the DPDP Act expects: what the details are
                  for, and where the full policy is. One line with the reply
                  promise rather than a paragraph of its own - the panel is
                  already at its max height on a laptop. */}
              <p className="modal__note">
                We respond within 24 hours on WhatsApp or email, and use these details only to
                reply to you. <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
