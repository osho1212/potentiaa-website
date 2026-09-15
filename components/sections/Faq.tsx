"use client";

import React, { useState, useId } from "react";
import Reveal from "../Reveal";
import { site } from "@/lib/site";

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const uid = useId().replace(/:/g, "");

  const toggleItem = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section className="section faq-section" id="faq" data-theme-key="work">
      <div className="container faq__container">
        {/* Section Header */}
        <div className="faq__head">
          <Reveal>
            <p className="eyebrow faq__eyebrow">{site.faq.eyebrow}</p>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="section-title faq__title">{site.faq.title}</h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="lede faq__lede">{site.faq.lede}</p>
          </Reveal>
        </div>

        {/* Accordion 2-Column Grid Container */}
        <div className="faq__grid">
          {site.faq.items.map((item, idx) => {
            const isOpen = openIndex === idx;
            const btnId = `faq-btn-${uid}-${idx}`;
            const panelId = `faq-panel-${uid}-${idx}`;

            return (
              <Reveal key={idx} delay={50 * idx}>
                <div
                  className={`faq__accordion-item ${isOpen ? "faq__accordion-item--open" : ""}`}
                >
                  <button
                    id={btnId}
                    type="button"
                    className="faq__question-btn"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleItem(idx)}
                  >
                    <span className="faq__question-text">{item.question}</span>
                    <span className="faq__icon-wrapper" aria-hidden="true">
                      <svg
                        className={`faq__icon ${isOpen ? "faq__icon--rotated" : ""}`}
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    className={`faq__answer-wrapper ${isOpen ? "faq__answer-wrapper--open" : ""}`}
                  >
                    <div className="faq__answer-inner">
                      <p className="faq__answer-text">{item.answer}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
