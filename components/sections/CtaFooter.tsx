"use client";

import Reveal from "../Reveal";
import ShinyText from "../ShinyText";
import { site } from "@/lib/site";

export default function CtaFooter() {
  const year = new Date().getFullYear();

  return (
    <>
      {/* Single-line ShinyText strip directly above footer */}
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
        </div>
      </section>

      <footer className="site-footer" role="contentinfo">
        <div className="container site-footer__inner">
          <div className="site-footer__main">
            {/* Col 1: Logo & Tagline */}
            <div className="site-footer__brand">
              <img src="/assets/img/footer-logo.png" alt="Potentiaa" className="site-footer__logo" />
              <p className="site-footer__tagline">
                Personalised billing, inventory and<br />
                management software for small businesses.<br />
                Consult, build, maintain.
              </p>
              <div className="site-footer__status">
                <span className="site-footer__status-dot" aria-hidden="true" />
                <span>Available for new projects</span>
              </div>
            </div>

            {/* Col 2: WHAT WE BUILD */}
            <div className="site-footer__col">
              <h4 className="site-footer__heading">WHAT WE BUILD</h4>
              <ul className="site-footer__list">
                <li><a href="#work">Billing and inventory software</a></li>
                <li><a href="#work">Marketing websites</a></li>
                <li><a href="#work">Management apps</a></li>
                <li><a href="#work">Consulting and system audits</a></li>
              </ul>
            </div>

            {/* Col 3: SERVICES */}
            <div className="site-footer__col">
              <h4 className="site-footer__heading">SERVICES</h4>
              <ul className="site-footer__list">
                <li><a href="#work">Consulting</a></li>
                <li><a href="#work">Business software</a></li>
                <li><a href="#work">Websites</a></li>
                <li><a href="#work">Mobile apps</a></li>
                <li><a href="#work">Maintenance</a></li>
              </ul>
            </div>

            {/* Col 4: CONNECT */}
            <div className="site-footer__col">
              <h4 className="site-footer__heading">CONNECT</h4>
              <ul className="site-footer__list">
                <li>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="https://wa.me/918267839736" target="_blank" rel="noopener noreferrer">
                    WhatsApp &middot; +91 82678 39736
                  </a>
                </li>
                <li>
                  <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
                </li>
              </ul>
            </div>
          </div>

          {/* Sub-footer Bottom Bar */}
          <div className="site-footer__bottom">
            <div className="site-footer__legal">
              <span>&copy; {year} Potentiaa. All Rights Reserved.</span>
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
            </div>
            <div className="site-footer__right-group">
              <button
                type="button"
                className="site-footer__top-btn"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
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
