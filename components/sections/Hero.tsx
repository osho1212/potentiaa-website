"use client";

import type { RefObject } from "react";
import Reveal from "../Reveal";
import HeroParticles from "../HeroParticles";
import type { HeroParticlesHandle } from "../HeroParticles";
import HeroFlowConstellation from "../HeroFlowConstellation";
import ParticleText from "../ParticleText";
import { useContact } from "../ContactContext";
import { site } from "@/lib/site";

/**
 * The Hero section:
 * - Centered typographic display & CTAs
 * - Full-screen 3D WebGL Organic Neural Web particle simulation
 * - 6 Fluid orbiting 3D squircle icons moving dynamically around the page
 * - Seamless scroll alignment into the Flow section
 */
function AnimatedWord({ text, isAccent = false }: { text: string; isAccent?: boolean }) {
  return (
    <span
      className={`hero__hover-word ${isAccent ? "hero__hover-word--accent" : ""}`}
      data-text={text}
    >
      {text}
    </span>
  );
}

function AnimatedLine({ line, isAccent = false }: { line: string; isAccent?: boolean }) {
  const words = line.split(" ");
  return (
    <span className={`hero__title-line ${isAccent ? "hero__title-line--accent" : ""}`}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="hero__word-wrap">
          <AnimatedWord text={word} isAccent={isAccent} />
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

export default function Hero({
  particlesRef,
}: {
  particlesRef?: RefObject<HeroParticlesHandle | null>;
}) {
  const { open } = useContact();

  const handleScrollToFlow = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const lenis = (
      window as unknown as {
        __lenisInstance?: {
          scrollTo(target: string | HTMLElement, opts?: Record<string, unknown>): void;
        };
      }
    ).__lenisInstance;

    if (lenis) {
      lenis.scrollTo("#flow", { offset: 0, duration: 1.2 });
    } else {
      const target = document.querySelector("#flow");
      target?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="hero" id="top" data-theme-key="hero">
      {/* Full-screen centered particle simulation layer */}
      <div className="hero__art" aria-hidden="true">
        <HeroParticles ref={particlesRef} />
      </div>

      {/* 6 Orbiting 3D Glass Squircle Icons that align into Flow Section */}
      <HeroFlowConstellation />

      {/* Vertically & horizontally centered hero content */}
      <div className="hero__grid container">
        <div className="hero__copy">
          <Reveal delay={60}>
            <h1 className="hero__title">
              {site.hero.titleLead.map((line) => (
                <AnimatedLine key={line} line={line} isAccent={false} />
              ))}
              <span className="hero__title-line hero__title-line--gradient-row">
                <span className="hero__word-wrap">
                  <AnimatedWord text="one" />{" "}
                </span>
                <ParticleText
                  text={site.hero.titleGradient || "connected system."}
                  color="#2D6BFF"
                  highlightColor="#2D6BFF"
                  particleSize={1.8}
                  gap={3}
                  hoverRadius={65}
                  hoverStrength={4.2}
                  returnSpeed={0.09}
                  friction={0.88}
                  className="hero__particle-text"
                />
              </span>
            </h1>
          </Reveal>

          {site.hero.subtitle && (
            <Reveal delay={120}>
              <p className="hero__subtext">
                {site.hero.subtitle}
              </p>
            </Reveal>
          )}

          <Reveal delay={160}>
            <div className="hero__actions">
              <button
                type="button"
                className="hero__cta"
                onClick={open}
                id="hero-cta-book"
              >
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

              <a
                className="hero__play"
                href="#flow"
                onClick={handleScrollToFlow}
                id="hero-cta-explore"
              >
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
      </div>
    </section>
  );
}

