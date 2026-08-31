import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

/**
 * Privacy policy.
 *
 * WRITTEN FROM WHAT THE CODE ACTUALLY DOES, and nothing else. Before drafting
 * this, the repository was searched for analytics, tag managers, cookies,
 * localStorage, sessionStorage and third-party network calls: there are none.
 * The site sets no cookies, loads no trackers and makes no requests to anyone
 * else's servers. Fonts are self-hosted at build time by next/font, so not even
 * Google sees a request.
 *
 * That is why this page is short. A longer policy would mean describing
 * collection that does not happen, which is the opposite of the point.
 *
 * IT HAS NOT BEEN REVIEWED BY A LAWYER, and the page says so on its face. The
 * facts still missing - registered entity name, address, jurisdiction,
 * retention period, any processor used for form delivery - are listed in
 * CONTENT_INPUTS_REQUIRED.md. Do not remove the review notice until someone
 * qualified has actually read it.
 */
export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Potentiaa collects when you use this website, and what happens to it.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="prose-page">
      <div className="container prose-page__inner">
        <p className="prose-page__eyebrow">Legal</p>
        <h1 className="prose-page__title">Privacy Policy</h1>

        <p className="prose-page__notice" role="note">
          <strong>Draft pending review.</strong> This describes how the website
          behaves today and has not yet been checked by a legal adviser. If you
          need a formal position before sharing information with us, email{" "}
          <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a> and
          ask.
        </p>

        <div className="prose-page__body">
          <h2>The short version</h2>
          <p>
            This website does not track you. It sets no cookies, runs no
            analytics, and loads nothing from third-party servers. The only
            information we receive is what you choose to send us.
          </p>

          <h2>What we collect</h2>
          <p>
            <strong>Nothing at all, unless you contact us.</strong> Browsing the
            site creates no record on our side beyond the ordinary server logs
            our hosting provider keeps.
          </p>
          <p>
            If you use the contact form, we receive the name, email address and
            message you type into it. We ask for those three things because we
            cannot reply without them.
          </p>

          <h2>Cookies and analytics</h2>
          <p>
            There are none. No advertising pixels, no session cookies, no
            fingerprinting, and no consent banner — because there is nothing to
            consent to. Typefaces are served from this site rather than fetched
            from a font provider, so no third party sees your visit.
          </p>

          <h2>What we do with your enquiry</h2>
          <p>
            We read it and reply. We do not sell it, rent it, or add you to a
            mailing list you did not ask for.
          </p>

          <h2>Your choices</h2>
          <p>
            You can ask us what we hold about you, ask us to correct it, or ask
            us to delete it. Email{" "}
            <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a> and
            we will action it.
          </p>

          <h2>Changes</h2>
          <p>
            If the site starts collecting something it does not collect today —
            analytics, for instance — this page changes before that happens, not
            after.
          </p>
        </div>

        <p className="prose-page__back">
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </main>
  );
}
