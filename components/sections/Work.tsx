"use client";

import { useRef } from "react";
import Reveal from "../Reveal";
import CardFormationParticles from "../CardFormationParticles";
import OfferingsCarousel from "../OfferingsCarousel";
import { site } from "@/lib/site";

export default function Work() {
  const sectionRef = useRef<HTMLElement>(null);
  /* An array because CardFormationParticles forms any number of cards;
     offerings has one. */
  const showcaseRefs = useRef<(HTMLElement | null)[]>([]);

  return (
    <section className="section work-section" id="offerings" data-theme-key="work" ref={sectionRef}>
      {/* Fills the section, not the card - the particles start scattered
          across the section and the canvas clips them. */}
      <CardFormationParticles sectionRef={sectionRef} targetRefs={showcaseRefs} />
      <div className="container">
        {/* Section Header */}
        <div className="work__head">
          <Reveal>
            {/* data-form-heading: rasterised into particle destinations and
                faded in as the lettering hands back to real text. */}
            <p className="eyebrow work__eyebrow" data-form-heading>
              {site.work.eyebrow}
            </p>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="section-title work__title" data-form-heading>
              {site.work.title}
            </h2>
          </Reveal>
        </div>

        {/* The particle-formed showcase card */}
        <div
          className="offering-showcase"
          ref={(el) => {
            showcaseRefs.current[0] = el;
          }}
        >
          <OfferingsCarousel modules={site.work.modules} />
        </div>
      </div>
    </section>
  );
}
