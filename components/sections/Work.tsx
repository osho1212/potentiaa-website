"use client";

import { useRef } from "react";
import Reveal from "../Reveal";
import OfferingsCarousel from "../OfferingsCarousel";
import { site } from "@/lib/site";

export default function Work() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section className="section work-section" id="offerings" data-theme-key="work" ref={sectionRef}>
      <div className="container">
        {/* Section Header */}
        <div className="work__head">
          <Reveal>
            <p className="eyebrow work__eyebrow">
              {site.work.eyebrow}
            </p>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="section-title work__title">
              {site.work.title}
            </h2>
          </Reveal>
        </div>

        {/* Floating cards showcase over continuous starry space background */}
        <div className="offering-showcase">
          <OfferingsCarousel
            modules={site.work.modules}
            intro={site.work.intro}
            hint={site.work.hint}
          />
        </div>
      </div>
    </section>
  );
}
