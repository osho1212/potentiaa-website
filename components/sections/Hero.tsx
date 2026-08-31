"use client";

import Reveal from "../Reveal";
import ScannerMount from "../ScannerMount";
import { useContact } from "../ContactContext";
import { site } from "@/lib/site";

/**
 * The hero: centred copy over a scan field, with the six flow cubes orbiting it.
 *
 * WHAT THIS REPLACED, and why both went.
 *
 * A 24,000-point three.js particle swarm and, on top of it, a 762x800 render of
 * the module stack. The swarm was the largest surface on the site wearing the
 * logo's own four-stop gradient, which is most of why the page read as being
 * about the mark; it also pulled the whole of three into the homepage bundle and
 * built a WebGLRenderer with no detection and no boundary. The still was showing
 * the module at full size while the same object was docked in the navbar two
 * inches above it - two copies of one thing in one view.
 *
 * What replaced them is a BACKGROUND, not an object. The scan field has no
 * subject to compete with the headline, so the fold has exactly one thing to
 * look at, and it is the sentence. Its three colours are brand colours, so
 * identity still reads without anything having to depict the logo.
 *
 * THE COPY LEADS WITH THE CATEGORY. The old H1 - "Your business already has a
 * system. It just isn't connected." - is the strongest line on the site and is
 * still here, as `support` under the body. What it could not do is tell a cold
 * visitor what this company sells, which is now the first two lines they read.
 *
 * NO `.hero__art`. Its removal is not cosmetic: FlowStage used to position the
 * flow cards' orbit box by MEASURING that element, so deleting it here without
 * also rewriting that measurement collapses the orbit to a point. The two
 * changes ship together - see .flow-stage__art in globals.css.
 */
export default function Hero() {
  const { open } = useContact();

  return (
    <section className="hero" id="top" data-theme-key="hero">
      {/* Full bleed, outside .container, so the field spans the viewport while
          the copy inside keeps the page's reading gutters. Everything about
          whether it actually renders is ScannerMount's decision. */}
      <div className="hero__scanner" aria-hidden="true">
        <ScannerMount
          color1="#2D6BFF"
          color2="#FF6B5C"
          color3="#2D6BFF"
          speed={0.55}
          sweepSpeed={0.25}
          sweepWidth={1.15}
          sweepFalloff={6}
          scale={1.95}
          frequency={1.25}
          ripple={0.85}
          bandDensity={11}
          lineSharpness={5.5}
          glow={0.22}
          scanDirection="vertical"
          colorSpread={0.67}
          brightness={1.0}
          contrast={1.15}
          softness={2.15}
          vignette={0.45}
          scanline
          grain
          grainIntensity={0.05}
          opacity={1.0}
          mouseInteraction
          mouseRadius={0.5}
          mouseStrength={0.5}
        />
      </div>

      <div className="hero__grid container">
        <div className="hero__copy">
          <Reveal delay={60}>
            <p className="hero__eyebrow">{site.hero.eyebrow}</p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="hero__title">{site.hero.title}</h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="hero__body">{site.hero.body}</p>
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

              {/* #flow, not #process. The Process section is not rendered on
                  this page at all, so the old target scrolled nowhere. */}
              <a className="hero__play" href="#flow">
                <span className="hero__play-disc" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                    <path d="M5.5 3.6v8.8L13 8z" />
                  </svg>
                </span>
                {site.hero.secondary}
              </a>
            </div>
          </Reveal>

          <Reveal delay={200}>
            {/* Capability statements, not outcomes - see the note on
                site.hero.assurances. Each has to stay true of the real offer. */}
            <ul className="hero__assurances">
              {site.hero.assurances.map((item) => (
                <li key={item} className="hero__assurance">
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
