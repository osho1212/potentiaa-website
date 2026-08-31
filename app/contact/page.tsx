import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

/**
 * The contact route.
 *
 * WHY A ROUTE AND NOT ONLY A MODAL. Every path to contacting Potentiaa went
 * through a dialog opened by a button. A dialog cannot be linked to, bookmarked,
 * shared, opened in a new tab, or reached at all if the JavaScript that opens it
 * fails - and it is the single conversion surface on the site.
 *
 * This page is the durable version of the same thing. The real form lands here
 * next; for now it publishes the channels that genuinely work today rather than
 * a form that has nowhere to post to.
 */
export const metadata: Metadata = {
  title: "Contact",
  description:
    "Tell Potentiaa where work slows down, gets repeated, or becomes hard to see.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="prose-page">
      <div className="container prose-page__inner">
        <p className="prose-page__eyebrow">Contact</p>
        <h1 className="prose-page__title">
          Tell us where the work slows down.
        </h1>

        <div className="prose-page__body">
          <p className="prose-page__lede">
            Show us the step that gets repeated, the handover that gets lost, or
            the report that takes half a day. We will tell you honestly whether
            software is worth it — and if it is, what the smallest useful version
            looks like.
          </p>

          <h2>Reach us directly</h2>
          <ul className="prose-page__channels">
            <li>
              <span className="prose-page__channel-label">Email</span>
              <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
            </li>
            {site.contact.whatsapp ? (
              <li>
                <span className="prose-page__channel-label">WhatsApp</span>
                <a
                  href={`https://wa.me/${site.contact.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {site.contact.whatsappDisplay}
                </a>
              </li>
            ) : null}
          </ul>

          <h2>What helps us most</h2>
          <p>
            You do not need a specification. The useful thing to send is a
            description of one job as it actually travels through your business
            today — who touches it, what each person writes down, and where it
            stalls.
          </p>
        </div>

        <p className="prose-page__back">
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </main>
  );
}
