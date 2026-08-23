"use client";

import Reveal from "../Reveal";
import ZealIdle from "../ZealIdle";
import { useContact } from "../ContactContext";
import { site } from "@/lib/site";

export default function CtaFooter({ clone }: { clone?: boolean }) {
  const { open } = useContact();
  const year = new Date().getFullYear();

  return (
    <>
      <section className="cta container" id={clone ? undefined : "contact"} data-theme-key="cta">
        <Reveal>
          <h2 className="cta__title">{site.cta.title}</h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="lede" style={{ marginInline: "auto", marginBottom: "var(--space-10)" }}>
            {site.cta.body}
          </p>
        </Reveal>
        <Reveal delay={180}>
          <a className="cta__email" href={`mailto:${site.contact.email}`}>
            {site.contact.email}
          </a>
        </Reveal>
        <Reveal delay={260}>
          {/* He explained the catalogue and then left before the offer. This is
              the one moment on the page where a real person is being offered
              real help, so he stands with it. */}
          <div className="cta__close">
            <ZealIdle />
            <button type="button" className="btn btn--coral" onClick={open}>
              Start a project
            </button>
          </div>
        </Reveal>
      </section>

      {/* role="contentinfo" is set explicitly, and it is not redundant here.
          <footer> only maps to the contentinfo landmark when it is scoped to
          the body - nested inside <main>, as this is, it maps to nothing, so
          the document exposed no contentinfo at all and a screen-reader user
          could not jump to the contact details or the footer nav by landmark.

          Only the primary lap claims it. The clone carries aria-hidden, so a
          second contentinfo would never be announced, but declaring one role
          once is the honest version. */}
      <footer className="container" role={clone ? undefined : "contentinfo"}>
        <div className="footer">
          <p>
            &copy; {year} {site.name}. {site.tagline}
          </p>
          <nav className="footer__links" aria-label="Footer">
            {site.nav.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
            <a href={`mailto:${site.contact.email}`}>Contact</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
