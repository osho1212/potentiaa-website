"use client";

import React, { useCallback, useState } from "react";
import Reveal from "../Reveal";
import ProjectModal from "../ProjectModal";
import { CoverflowCarousel, type CoverflowSlide } from "@/components/ui/coverflow-carousel";
import { PROJECTS } from "@/lib/projects";

/* The carousel shows the project's image, and its title and description as the
   caption under the centred card. The case study lives in lib/projects. */
const SLIDES: CoverflowSlide[] = PROJECTS.map((project) => ({
  src: project.image,
  alt: project.imageAlt,
  title: project.title,
  subtitle: project.description,
}));

export default function OurWork() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  /* Stable, because the dialog's effect depends on it - see useModalDialog. */
  const close = useCallback(() => setOpenIndex(null), []);
  const openProject = openIndex === null ? null : PROJECTS[openIndex];

  return (
    <section className="section our-work-section" id="projects" data-theme-key="projects">
      <div className="container our-work__container">
        {/* Section Header */}
        <div className="our-work__head">
          <Reveal>
            <p className="eyebrow">Selected Builds</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="section-title">Our Work</h2>
          </Reveal>
        </div>

        <Reveal delay={140}>
          {/* data-module-avoid: the floating module goes behind the page while it
              overlaps this - see components/ModuleStack. */}
          <div data-module-avoid>
            <CoverflowCarousel
              slides={SLIDES}
              label="Our work. Select the centre project to open its case study."
              cardWidth="clamp(180px, 24vw, 300px)"
              showCaption
              showPagination
              showNavigation
              onSlideClick={setOpenIndex}
            />
          </div>
          <p className="our-work__hint">Click a project to see what we built.</p>
        </Reveal>
      </div>

      {openProject && <ProjectModal key={openProject.id} project={openProject} onClose={close} />}
    </section>
  );
}
