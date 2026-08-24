"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import type { HeroParticlesHandle } from "./HeroParticles";
import { sampleGradientCss } from "@/lib/heroParticles";
import { CARD, CUBE, seatAt, type LiveCardState } from "@/lib/flowLayout";
import { site } from "@/lib/site";
import GlassSurface from "./GlassSurface";

/**
 * The flow cards drifting around the particle swarm as 3D refractive glass cubes,
 * morphing seamlessly into full glass stations upon scrolling into the flow section.
 */

/**
 * Each card's ellipse, as fractions of the container box.
 */
const ORBITS = [
  { rx: 0.44, ry: 0.38, cx: 0.5, cy: 0.46 },
  { rx: 0.38, ry: 0.44, cx: 0.54, cy: 0.5 },
  { rx: 0.46, ry: 0.46, cx: 0.48, cy: 0.52 },
  { rx: 0.4, ry: 0.34, cx: 0.52, cy: 0.44 },
  { rx: 0.48, ry: 0.4, cx: 0.5, cy: 0.56 },
  { rx: 0.42, ry: 0.48, cx: 0.46, cy: 0.48 },
];

/** Seconds per lap, and direction. */
const TIMING = [
  { duration: 46 },
  { duration: 54, reverse: true },
  { duration: 40 },
  { duration: 50, reverse: true },
  { duration: 44 },
  { duration: 58, reverse: true },
];

/** How fast a card's scale eases toward its hovered/resting value, per frame. */
const SCALE_EASE = 0.18;
const HOVER_SCALE = 1.08;

/** How much of the scroll each card waits before it leaves its orbit. */
const STAGGER = 0.08;

/** Smoothstep ease. */
function ease(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

/**
 * Scroll state, written by FlowStage once a frame and read here.
 */
export interface FlowProgress {
  /** 0..1 through the hero -> flow-section transition. */
  t: number;
  /** How far the hero has scrolled under the pinned layer, <= 0. */
  offsetY: number;
  /** Scroll past the end of the transition, <= 0 and 0 until `t` reaches 1. */
  releaseY: number;
}

/** Vector icons representing each stage of the pipeline. */
function FlowIcon({ index }: { index: number }) {
  switch (index) {
    case 0: // Customer (Enquiry)
      return (
        <svg className="hero__label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 1: // Reception (Writes it down)
      return (
        <svg className="hero__label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      );
    case 2: // Staff (Does the work)
      return (
        <svg className="hero__label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 3: // Records (Register updated)
      return (
        <svg className="hero__label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case 4: // Accounts (Asks again)
      return (
        <svg className="hero__label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
          <line x1="8" y1="8" x2="16" y2="8" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="8" y1="16" x2="12" y2="16" />
        </svg>
      );
    case 5: // Owner (Wants a report)
    default:
      return (
        <svg className="hero__label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
  }
}

export default function HeroLabels({
  particlesRef,
  flowRef,
  liveCardsRef,
}: {
  particlesRef: RefObject<HeroParticlesHandle | null>;
  flowRef?: RefObject<FlowProgress>;
  liveCardsRef?: RefObject<LiveCardState[]>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const hoveredRef = useRef<HTMLElement | null>(null);
  const scalesRef = useRef<number[]>([]);
  const prevCoordsRef = useRef<Array<{ x: number; y: number }>>([]);

  const cards = useMemo(
    () =>
      site.flow.map((card, i) => ({
        ...card,
        tint: i / Math.max(1, site.flow.length - 1),
      })),
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const count = cards.length;
    scalesRef.current = new Array(count).fill(1);
    prevCoordsRef.current = new Array(count).fill(null).map(() => ({ x: 0, y: 0 }));

    let boxW = container.clientWidth;
    let boxH = container.clientHeight;
    let originX = 0;
    let originY = 0;
    let pinW = 0;
    let pinH = 0;

    const pin = container.closest<HTMLElement>(".flow-stage__pin");

    const measure = () => {
      boxW = container.clientWidth;
      boxH = container.clientHeight;
      if (!pin) return;
      const c = container.getBoundingClientRect();
      const p = pin.getBoundingClientRect();
      originX = c.left - p.left;
      originY = c.top - p.top;
      pinW = p.width;
      pinH = p.height;
    };

    const seat = (i: number) => {
      const p = seatAt(i, count, pinW, pinH);
      return { x: p.x - originX - boxW / 2, y: p.y - originY - boxH / 2 };
    };

    const place = (time: number) => {
      const flow = flowRef?.current;
      const t = flow ? flow.t : 0;
      const offsetY = flow ? flow.offsetY : 0;
      const releaseY = flow ? flow.releaseY : 0;
      const window_ = Math.max(0.01, 1 - STAGGER * (count - 1));

      for (let i = 0; i < count; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;

        const orbit = ORBITS[i % ORBITS.length];
        const timing = TIMING[i % TIMING.length];

        const dir = timing.reverse ? -1 : 1;
        const u = i / count + (dir * time) / timing.duration;
        const phi = u * Math.PI * 2;

        const orbitX = (orbit.cx - 0.5) * boxW + orbit.rx * boxW * Math.sin(phi);
        const orbitY = (orbit.cy - 0.5) * boxH - orbit.ry * boxH * Math.cos(phi) + offsetY;

        let x = orbitX;
        let y = orbitY;
        let k = 0;

        if (t > 0 && pin) {
          k = ease((t - i * STAGGER) / window_);
          if (k > 0) {
            const s = seat(i);
            x += (s.x - orbitX) * k;
            y += (s.y + releaseY - orbitY) * k;
          }
        }

        // Morph dimensions from 3D Cube to Card
        const morphK = Math.min(1, Math.max(0, k));
        // Expand width smoothly
        const widthT = ease(morphK * 1.3);
        const heightT = ease(morphK * 1.3);
        const curW = CUBE.w + (CARD.w - CUBE.w) * widthT;
        const curH = CUBE.h + (CARD.h - CUBE.h) * heightT;
        const curRadius = CUBE.radius + (CARD.radius - CUBE.radius) * morphK;

        // 3D pitch/yaw/roll that tilts the cube in orbit and flattens out on card seat
        const cubeTilt = 1 - morphK;
        const pitch = Math.sin(phi + i * 1.2) * 14 * cubeTilt;
        const yaw = Math.cos(phi + i * 1.6) * 18 * cubeTilt;
        const roll = Math.sin(phi * 0.8 + i) * 8 * cubeTilt;

        const target = hoveredRef.current === el ? HOVER_SCALE : 1;
        const scale = (scalesRef.current[i] += (target - scalesRef.current[i]) * SCALE_EASE);

        el.style.width = `${curW.toFixed(1)}px`;
        el.style.height = `${curH.toFixed(1)}px`;
        el.style.borderRadius = `${curRadius.toFixed(1)}px`;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) perspective(900px) rotateX(${pitch.toFixed(2)}deg) rotateY(${yaw.toFixed(2)}deg) rotateZ(${roll.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
        el.style.setProperty("--k", morphK.toFixed(3));

        // Record live position for comet particle trails
        if (liveCardsRef?.current) {
          const prev = prevCoordsRef.current[i] || { x, y };
          const vx = x - prev.x;
          const vy = y - prev.y;
          prevCoordsRef.current[i] = { x, y };
          const pinX = x + originX + boxW / 2;
          const pinY = y + originY + boxH / 2;
          liveCardsRef.current[i] = {
            x: pinX,
            y: pinY,
            vx,
            vy,
            k: morphK,
            tint: cards[i].tint,
            active: true,
          };
        }
      }

      const hovered = hoveredRef.current;
      if (hovered) {
        const r = hovered.getBoundingClientRect();
        particlesRef.current?.glow(true, r.left + r.width / 2, r.top + r.height / 2);
      }
    };

    let raf = 0;
    let running = false;
    const started = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      place((now - started) / 1000);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    measure();
    place(0);

    const sizeObserver = new ResizeObserver(() => {
      measure();
      if (!running) place(0);
    });
    sizeObserver.observe(container);
    if (pin) sizeObserver.observe(pin);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: "100px" },
    );
    intersectionObserver.observe(container);

    return () => {
      sizeObserver.disconnect();
      intersectionObserver.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [cards, particlesRef, flowRef, liveCardsRef]);

  const handleEnter = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    hoveredRef.current = event.currentTarget;
  }, []);

  const handleLeave = useCallback(() => {
    if (hoveredRef.current === null) return;
    hoveredRef.current = null;
    particlesRef.current?.glow(false, 0, 0);
  }, [particlesRef]);

  return (
    <div className="hero__labels" ref={containerRef}>
      {cards.map((card, i) => (
        <div
          key={card.title}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          className="hero__label"
          style={
            {
              "--flow-tint": sampleGradientCss(card.tint, { lighten: 0.55 }),
              "--flow-tint-soft": sampleGradientCss(card.tint, { alpha: 0.5, lighten: 0.15 }),
              "--flow-tint-faint": sampleGradientCss(card.tint, { alpha: 0.22, lighten: 0.2 }),
              "--k": 0,
            } as React.CSSProperties
          }
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          <GlassSurface
            className="hero__label-glass"
            width="100%"
            height="100%"
            borderRadius={CUBE.radius}
            distortionScale={-92}
            redOffset={2}
            greenOffset={9}
            blueOffset={17}
            brightness={58}
            opacity={0.92}
            blur={9}
            backgroundOpacity={0.07}
            saturation={1.28}
          >
            {/* 3D Cube Facet & Bevel Lighting (prominent when in cube mode, fades as k -> 1) */}
            <div className="hero__cube-shimmer" aria-hidden="true" />
            <div className="hero__cube-edge-glint" aria-hidden="true" />

            <div className="hero__label-inner">
              {/* Domain Icon: Centered in cube mode, smoothly docks left in card mode */}
              <div className="hero__label-icon-badge" aria-hidden="true">
                <div className="hero__label-icon-glow" />
                <FlowIcon index={i} />
              </div>

              {/* Text Body: Fades in smoothly as card expands */}
              <div className="hero__label-text">
                <div className="hero__label-header">
                  <span className="hero__label-index">{String(i + 1).padStart(2, "0")}</span>
                  <span className="hero__label-title">{card.title}</span>
                </div>
                <span className="hero__label-note">{card.note}</span>
              </div>
            </div>
          </GlassSurface>
        </div>
      ))}
    </div>
  );
}
