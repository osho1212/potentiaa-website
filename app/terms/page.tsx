import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

/**
 * Terms of service.
 *
 * SCOPED TO THE WEBSITE, not to client engagements. Potentiaa's actual work is
 * governed by whatever is signed per project, and this page must not pretend to
 * replace or summarise that - inventing contract terms for work someone has
 * already agreed separately would be worse than having no page.
 *
 * So this covers exactly what a marketing site can honestly cover: what the
 * content is, what it is not, and who owns it.
 *
 * NOT LEGALLY REVIEWED, and it says so. Missing facts - registered entity,
 * jurisdiction, governing law - are in CONTENT_INPUTS_REQUIRED.md.
 */
export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply to the Potentiaa website.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="prose-page">
      <div className="container prose-page__inner">
        <p className="prose-page__eyebrow">Legal</p>
        <h1 className="prose-page__title">Terms of Service</h1>

        <p className="prose-page__notice" role="note">
          <strong>Draft pending review.</strong> These terms cover this website
          only and have not yet been checked by a legal adviser. They do not
          govern any project engagement — that is covered by whatever is agreed
          and signed for the work itself.
        </p>

        <div className="prose-page__body">
          <h2>What this page covers</h2>
          <p>
            These terms apply to your use of this website. If you engage
            Potentiaa to build something, the agreement for that work is a
            separate document and takes precedence over anything here.
          </p>

          <h2>The content on this site</h2>
          <p>
            The descriptions of what we build are exactly that — descriptions of
            capability. They are not a quotation, a specification, or a promise
            of a particular outcome for your business. What we can actually do
            for you depends on your workflow, and we will tell you that after we
            have looked at it.
          </p>

          <h2>Ownership</h2>
          <p>
            The text, design, code and brand marks on this site belong to
            Potentiaa. You are welcome to read, link to and quote from the site;
            please do not republish it as your own.
          </p>

          <h2>Availability</h2>
          <p>
            We keep the site up and correct as best we can, but we do not
            guarantee it will always be available or free of errors. If you spot
            something wrong, telling us is genuinely useful.
          </p>

          <h2>Getting in touch</h2>
          <p>
            Questions about these terms go to{" "}
            <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
          </p>
        </div>

        <p className="prose-page__back">
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </main>
  );
}
