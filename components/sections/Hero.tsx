"use client";

import Reveal from "../Reveal";
import HeroEnergy from "../HeroEnergy";
import { useContact } from "../ContactContext";
import { site } from "@/lib/site";

/**
 * The hero: copy on the left, a trust strip along the foot.
 *
 * `clone` matters because app/page.tsx renders this section twice for the
 * scroll loop: only the primary copy may carry the #top anchor, and only the
 * primary may hold the document's h1.
 */
export default function Hero({ clone }: { clone?: boolean }) {
  const { open } = useContact();
  const Title = clone ? "p" : "h1";

  return (
    <section className="hero" id={clone ? undefined : "top"} data-theme-key="hero">
      <div className="hero__grid container">
        <div className="hero__copy">
          <Reveal>
            <p className="hero__eyebrow">
              <span className="hero__eyebrow-dot" />
              {site.hero.eyebrow}
            </p>
          </Reveal>

          <Reveal delay={80}>
            <Title className="hero__title">
              {/* The trailing space is not a typo. These are block spans, so
                  it changes nothing on screen - but without it the accessible
                  name and the document's text content read
                  "Your businessalready has asystem.", which is what a screen
                  reader would announce and what a crawler would index. */}
              {site.hero.titleLead.map((line) => (
                <span key={line} className="hero__title-line">
                  {line}{" "}
                </span>
              ))}
              {site.hero.titleAccent.map((line) => (
                <span key={line} className="hero__title-line hero__title-line--accent">
                  {line}{" "}
                </span>
              ))}
            </Title>
          </Reveal>

          <Reveal delay={160}>
            <p className="hero__lede">{site.hero.lede}</p>
          </Reveal>

          <Reveal delay={240}>
            <div className="hero__actions">
              <button type="button" className="hero__cta" onClick={open}>
                {site.hero.primary}
                <span className="hero__cta-arrow" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
                    <path
                      d="M2 8h11M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              <a className="hero__play" href="#process">
                <span className="hero__play-disc" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                    <path d="M5.5 3.6v8.8L13 8z" />
                  </svg>
                </span>
                {site.hero.secondary}
              </a>
            </div>
          </Reveal>
        </div>

        <div className="hero__art">
          <HeroEnergy />
          <img
            className="hero__art-image"
            src="/assets/hero/module.webp"
            alt="Potentiaa core module"
            width={762}
            height={800}
            loading="eager"
          />
        </div>
      </div>

      <div className="hero__trust container">
        <p className="hero__trust-lead">{site.hero.trustLead}</p>
        <ul className="hero__trust-list">
          {site.trustSlots.slice(0, 5).map((slot, i) => (
            <li key={i} className="hero__trust-item">
              <span className="hero__trust-mark" aria-hidden="true" />
              {slot}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
