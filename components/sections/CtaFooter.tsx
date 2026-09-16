"use client";

import Reveal from "../Reveal";
import ShinyText from "../ShinyText";
import { site } from "@/lib/site";

export default function CtaFooter() {
  const year = new Date().getFullYear();

  return (
    <>
      {/* ShinyText strip directly above footer - one line where it fits, two balanced lines where it doesn't */}
      <section className="cta-strip" id="contact" data-theme-key="cta">
        <div className="container cta-strip__inner">
          <Reveal>
            <h2 className="cta-strip__title">
              <ShinyText
                text={site.cta.title}
                speed={3.0}
                color="#ffffff"
                shineColor="#ffffff"
                customGradient="linear-gradient(120deg, #FFFFFF 0%, #FFFFFF 35%, #93c5fd 46%, #FFFFFF 50%, #f472b6 54%, #FFFFFF 65%, #FFFFFF 100%)"
                spread={90}
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
                Custom management software, live dashboards,<br />
                and growth websites for ambitious business owners.<br />
                Automate &bull; Track &bull; Scale.
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
                <li><a href="#offerings">Owner Dashboards</a></li>
                <li><a href="#offerings">Billing & Inventory</a></li>
                <li><a href="#offerings">Growth Websites</a></li>
                <li><a href="#projects">Custom Case Studies</a></li>
              </ul>
            </div>

            {/* Col 3: SERVICES */}
            <div className="site-footer__col">
              <h4 className="site-footer__heading">SERVICES</h4>
              <ul className="site-footer__list">
                <li><a href="#method">Workflow Audit</a></li>
                <li><a href="#offerings">Custom Business Tools</a></li>
                <li><a href="#offerings">Websites & SEO</a></li>
                <li><a href="#method">Hands-on Staff Training</a></li>
                <li><a href="#method">Ongoing Support</a></li>
              </ul>
            </div>

            {/* Col 4: CONNECT */}
            <div className="site-footer__col">
              <h4 className="site-footer__heading">CONNECT</h4>
              <ul className="site-footer__list site-footer__list--connect">
                <li>
                  <a
                    href="https://www.instagram.com/potentiaa.global"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-footer__connect-link"
                    aria-label="Instagram (@potentiaa.global)"
                  >
                    <span className="site-footer__icon-box" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                      </svg>
                    </span>
                    <span>Instagram</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`https://wa.me/${site.contact.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-footer__connect-link"
                    aria-label={`WhatsApp (${site.contact.whatsappDisplay || site.contact.whatsapp})`}
                  >
                    <span className="site-footer__icon-box" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                    </span>
                    <span>WhatsApp &middot; {site.contact.whatsappDisplay || site.contact.whatsapp}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${site.contact.phone.replace(/[^0-9+]/g, "")}`}
                    className="site-footer__connect-link"
                    aria-label={`Call Phone (${site.contact.phoneDisplay || site.contact.phone})`}
                  >
                    <span className="site-footer__icon-box" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </span>
                    <span>Phone &middot; {site.contact.phoneDisplay || site.contact.phone}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="site-footer__connect-link"
                    aria-label={`Email (${site.contact.email})`}
                  >
                    <span className="site-footer__icon-box" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2"/>
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                    </span>
                    <span>{site.contact.email}</span>
                  </a>
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
              <div className="site-footer__socials" aria-label="Social and direct channels">
                <a
                  href="https://www.instagram.com/potentiaa.global"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="site-footer__social-icon"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                  </svg>
                </a>
                <a
                  href={`https://wa.me/${site.contact.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="site-footer__social-icon"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                </a>
                <a
                  href={`tel:${site.contact.phone.replace(/[^0-9+]/g, "")}`}
                  aria-label="Call Phone"
                  className="site-footer__social-icon"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </a>
              </div>

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
