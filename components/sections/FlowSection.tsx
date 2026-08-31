"use client";

import Reveal from "../Reveal";
import { site } from "@/lib/site";

export default function FlowSection() {
  return (
    <section className="section flow-section" id="flow" data-theme-key="flow">
      <div className="container flow-section__container">
        <div className="flow-section__header">
          <Reveal>
            <p className="eyebrow flow-section__eyebrow">{site.flowSection.eyebrow}</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="section-title flow-section__title">{site.flowSection.title}</h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="lede flow-section__body">{site.flowSection.body}</p>
          </Reveal>
        </div>

        {/* Alignment stage where the 6 orbiting 3D icons seat into their pipeline stations */}
        <div className="flow-pipeline">
          <div className="flow-pipeline__track flow-pipeline__berths">
            {site.flow.map((station, index) => (
              <div key={station.title} className="flow-pipeline__berth">
                <div className="flow-pipeline__berth-slot" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
