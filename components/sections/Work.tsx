"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Reveal from "../Reveal";
import { site } from "@/lib/site";

const MOBILE_BREAKPOINT = 768;

function BentoCard({
  children,
  className = "",
  interactive = true,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card || !interactive) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const rotateX = ((y - cy) / cy) * -6;
    const rotateY = ((x - cx) / cx) * 6;

    card.style.setProperty("--glow-x", `${(x / rect.width) * 100}%`);
    card.style.setProperty("--glow-y", `${(y / rect.height) * 100}%`);
    card.style.setProperty("--glow-opacity", "1");
    card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(6px)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--glow-opacity", "0");
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
  };

  return (
    <div
      ref={cardRef}
      className={`offering-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="offering-card__glow" aria-hidden="true" />
      <div className="offering-card__content">{children}</div>
    </div>
  );
}

export default function Work() {
  const [active, setActive] = useState(0);
  const [interactive, setInteractive] = useState(false);

  const tabs = site.work.tabs;
  const panel = tabs[active];

  const uid = useId().replace(/:/g, "");
  const tabId = (i: number) => `work-tab-${uid}-${i}`;
  const panelId = (i: number) => `work-panel-${uid}-${i}`;

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const query = window.matchMedia(
      `(hover: hover) and (pointer: fine) and (min-width: ${MOBILE_BREAKPOINT}px)`,
    );
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => setInteractive(query.matches && !reduced.matches);
    sync();

    query.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = tabs.length - 1;
    let next: number | null = null;

    if (event.key === "ArrowRight") next = active === last ? 0 : active + 1;
    else if (event.key === "ArrowLeft") next = active === 0 ? last : active - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;

    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="section work-section" id="offerings" data-theme-key="work">
      <div className="container">
        {/* Section Header */}
        <div className="work__head">
          <Reveal>
            <p className="eyebrow work__eyebrow">{site.work.eyebrow}</p>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="section-title work__title">{site.work.title}</h2>
          </Reveal>
        </div>

        {/* 3D Glass Showcase Stage */}
        <div className="offering-showcase">
          {/* 1. Horizontal 3D Pill Tab Navigation */}
          <div className="offering-tabs-wrapper" role="tablist" aria-label="Our Offerings">
            <div className="offering-tabs">
              {tabs.map((tab, i) => (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={tabId(i)}
                  aria-controls={panelId(i)}
                  aria-selected={active === i}
                  tabIndex={active === i ? 0 : -1}
                  className={`offering-tab ${active === i ? "offering-tab--active" : ""}`}
                  onClick={() => setActive(i)}
                  onKeyDown={onKeyDown}
                >
                  <span className="offering-tab__label">{tab.label}</span>
                  {active === i && <span className="offering-tab__pill" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Active Capability Panel */}
          <div
            className="offering-panel"
            role="tabpanel"
            id={panelId(active)}
            aria-labelledby={tabId(active)}
            key={panel.id}
          >
            {/* Header with Title and "Discuss this module" CTA */}
            <div className="offering-panel__header">
              <div className="offering-panel__title-group">
                <span className="offering-panel__eyebrow">{panel.eyebrow}</span>
                <h3 className="offering-panel__title">{panel.title}</h3>
              </div>

              <a
                href="#audit"
                className="offering-panel__cta-btn"
                aria-label={`Discuss the ${panel.title} module`}
              >
                <span>Discuss this module</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="offering-panel__cta-icon"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </div>

            {/* The Bottleneck Alert Banner */}
            <div className="offering-bottleneck">
              <div className="offering-bottleneck__icon" aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#EA580C"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="offering-bottleneck__text">
                <strong className="offering-bottleneck__label">The Bottleneck:</strong>{" "}
                {panel.bottleneck}
              </p>
            </div>

            {/* 3D Bento Grid Layout */}
            <div className="offering-bento">
              {/* Left Column: Key Capabilities & Workflows */}
              <BentoCard className="offering-bento__capabilities" interactive={interactive}>
                <h4 className="offering-bento__section-title">Key Capabilities & Workflows</h4>
                <ul className="offering-bento__list">
                  {panel.capabilities.map((cap, idx) => (
                    <li key={idx} className="offering-bento__list-item">
                      <span className="offering-bento__check" aria-hidden="true">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#2563EB"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className="offering-bento__list-text">{cap}</span>
                    </li>
                  ))}
                </ul>
              </BentoCard>

              {/* Right Column: Who Uses It & How It Connects */}
              <div className="offering-bento__side-stack">
                {/* Top Card: WHO USES IT */}
                <BentoCard className="offering-bento__who" interactive={interactive}>
                  <div className="offering-bento__tag-header">
                    <span className="offering-bento__tag">WHO USES IT</span>
                  </div>
                  <p className="offering-bento__role-text">{panel.whoUsesIt}</p>
                </BentoCard>

                {/* Bottom Card: HOW IT CONNECTS */}
                <BentoCard className="offering-bento__connects" interactive={interactive}>
                  <div className="offering-bento__tag-header">
                    <span className="offering-bento__tag">HOW IT CONNECTS</span>
                  </div>
                  <p className="offering-bento__connect-text">{panel.howItConnects}</p>
                </BentoCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
