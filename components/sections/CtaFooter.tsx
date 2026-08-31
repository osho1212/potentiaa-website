"use client";

import Link from "next/link";
import Reveal from "../Reveal";
import ShinyText from "../ShinyText";
import { useContact } from "../ContactContext";
import { site } from "@/lib/site";

/**
 * The closing CTA strip and the site footer.
 *
 * THE CTA STRIP HAD NO CTA. It carried `id="contact"`, a headline, and a shiny
 * text animation - and nothing clickable at all. The section a reader reaches
 * at the end of the page, named contact, offered no way to make contact, while
 * `site.cta.body` sat defined in the content file and rendered nowhere. Both
 * are fixed here.
 *
 * THE FOOTER'S LINKS NOW GO SOMEWHERE. Nine of them pointed at #work, an anchor
 * with no matching id, under two headings that named services with no pages
 * behind them. They are replaced by the real destinations in site.footerNav -
 * fewer links, all of which resolve.
 */
export default function CtaFooter() {
  const year = new Date().getFullYear();
  const { open } = useContact();

  return (
    <>
      <section className="cta-strip" id="contact" data-theme-key="cta">
        <div className="container cta-strip__inner">
          <Reveal>
            <h2 className="cta-strip__title">
              <ShinyText
                text={site.cta.title}
                speed={2.6}
                customGradient="linear-gradient(120deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.72) 24%, #265DFF 36%, #7E9BFF 44%, #FFFFFF 50%, #FF6A5B 58%, #FA4592 68%, rgba(255, 255, 255, 0.72) 80%, rgba(255, 255, 255, 0.72) 100%)"
                spread={120}
                direction="left"
              />
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <p className="cta-strip__body">{site.cta.body}</p>
          </Reveal>

          <Reveal delay={140}>
            <div className="cta-strip__actions">
              <button type="button" className="btn btn--primary" onClick={open}>
                {site.hero.primary}
              </button>
              <Link className="btn btn--ghost" href="/contact">
                Or send us the details
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="site-footer" role="contentinfo">
        <div className="container site-footer__inner">
          <div className="site-footer__main">
            <div className="site-footer__brand">
              <img
                src="/assets/img/footer-logo.png"
                alt="Potentiaa"
                className="site-footer__logo"
                width={215}
                height={42}
              />
              <p className="site-footer__tagline">
                Tailored billing, inventory, workflow and management software for
                growing businesses. We map the workflow first, then build the
                smallest connected system that removes the bottleneck.
              </p>
            </div>

            {site.footerNav.map((col) => (
              <div className="site-footer__col" key={col.heading}>
                {/* h3, not h4. The page's last heading before this was an h2, so
                    an h4 skipped a level - the one heading-order break on the
                    homepage. */}
                <h3 className="site-footer__heading">{col.heading}</h3>
                <ul className="site-footer__list">
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      {link.href.startsWith("/") ? (
                        <Link href={link.href}>{link.label}</Link>
                      ) : (
                        <a href={link.href}>{link.label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="site-footer__col">
              <h3 className="site-footer__heading">Contact</h3>
              <ul className="site-footer__list">
                {site.contact.whatsapp ? (
                  <li>
                    <a
                      href={`https://wa.me/${site.contact.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp &middot; {site.contact.whatsappDisplay}
                    </a>
                  </li>
                ) : null}
                <li>
                  <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
                </li>
                {/* Rendered only when a real profile URL exists. The previous
                    version linked to instagram.com itself, which reads as a
                    social presence and delivers the service's homepage. */}
                {site.contact.instagram ? (
                  <li>
                    <a
                      href={site.contact.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Instagram
                    </a>
                  </li>
                ) : null}
                {site.contact.linkedin ? (
                  <li>
                    <a
                      href={site.contact.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      LinkedIn
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>

          <div className="site-footer__bottom">
            <div className="site-footer__legal">
              <span>&copy; {year} Potentiaa. All rights reserved.</span>
            </div>
            <div className="site-footer__right-group">
              <button
                type="button"
                className="site-footer__top-btn"
                onClick={() => {
                  /**
                   * Through Lenis, not window.scrollTo.
                   *
                   * Lenis scrolls by writing a transform rather than moving the
                   * document, so a native scroll call fights it: the two
                   * disagree about where the page is and the smoothing snaps.
                   * Falls back to the native call only if Lenis is absent, which
                   * is the reduced-motion path.
                   */
                  const lenis = (
                    window as unknown as {
                      __lenisInstance?: { scrollTo: (t: number) => void };
                    }
                  ).__lenisInstance;
                  if (lenis) lenis.scrollTo(0);
                  else window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                aria-label="Back to top"
              >
                Back to top &uarr;
              </button>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
