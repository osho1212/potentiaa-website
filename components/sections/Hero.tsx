"use client";

import Reveal from "../Reveal";
import { useContact } from "../ContactContext";
import { site } from "@/lib/site";

/**
 * The hero: copy on the left, the module render on the right.
 *
 * THE PARTICLE SWARM IS GONE. It was a 24,000-point three.js formation that sat
 * behind the module still, and it took the whole of three with it into the
 * homepage bundle - including for the two components that only wanted its
 * colour ramp. It also constructed a WebGLRenderer inside an effect with no
 * support detection and no try/catch, which on a machine that cannot create a
 * context threw straight past a tree with no error boundary in it and replaced
 * the page.
 *
 * The colour ramp survives in lib/brandGradient, which has no dependencies.
 * The hero's background is rebuilt separately - see the Scanner work.
 */
export default function Hero() {
  const { open } = useContact();

  return (
    <section className="hero" id="top" data-theme-key="hero">
      <div className="hero__grid container">
        <div className="hero__copy">
          <Reveal delay={80}>
            <h1 className="hero__title">
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
            </h1>
          </Reveal>

          <Reveal delay={160}>
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
    </section>
  );
}
