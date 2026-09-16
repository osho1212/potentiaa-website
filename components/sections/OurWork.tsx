"use client";

import React, { useCallback, useState } from "react";
import { MousePointerClick, Pointer } from "lucide-react";
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
      </div>

      <Reveal delay={140} className="w-full">
        {/* data-module-avoid: the floating module goes behind the page while it
            overlaps this - see components/ModuleStack. */}
        <div className="our-work__carousel w-full" data-module-avoid>
          <CoverflowCarousel
            slides={SLIDES}
            label="Our work. Select the centre project to open its case study."
            /* Sized in globals.css (.our-work__carousel), where it can
               follow the viewport. */
            cardWidth="var(--our-work-card)"
            showCaption
            showPagination
            showNavigation
            onSlideClick={setOpenIndex}
            /* Both wordings render; CSS shows the one for the input the
               reader has (see .only-touch in globals.css), so nothing flips
               after hydration. */
            selectedLabel={
              <>
                <span className="only-pointer">
                  <MousePointerClick size={14} aria-hidden="true" />
                  Click to View
                </span>
                <span className="only-touch">
                  <Pointer size={14} aria-hidden="true" />
                  Tap to View
                </span>
              </>
            }
          />
        </div>
      </Reveal>

      {openProject && <ProjectModal key={openProject.id} project={openProject} onClose={close} />}
    </section>
  );
}
