"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { sampleGradientCss } from "@/lib/brandGradient";
import { CUBE, isNarrow, seatAt, type LiveCardState } from "@/lib/flowLayout";
import { site } from "@/lib/site";
import GlassSurface from "./GlassSurface";

/**
 * The flow cards drifting around the particle swarm as 3D refractive glass cubes,
 * settling gracefully into their flow seats and straightening flat upon completion.
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

/** Seconds per page, and direction. */
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
  flowRef,
  liveCardsRef,
}: {
  flowRef?: RefObject<FlowProgress>;
  liveCardsRef?: RefObject<LiveCardState[]>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);
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
      container.style.setProperty("--card-w", `${CUBE.w}px`);
      container.style.setProperty("--card-h", `${CUBE.h}px`);
      container.style.setProperty("--card-radius", `${CUBE.radius}px`);
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

      // Orbit scales with viewport so the constellation fits on phones without
      // crashing into the hero copy or flying off screen.
      const orbitScale = Math.min(boxW, boxH) < 600 ? 0.72 : 1;

      for (let i = 0; i < count; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;

        const orbit = ORBITS[i % ORBITS.length];
        const timing = TIMING[i % TIMING.length];

        const dir = timing.reverse ? -1 : 1;
        const u = i / count + (dir * time) / timing.duration;
        const phi = u * Math.PI * 2;

        const orbitX =
          (orbit.cx - 0.5) * boxW + orbit.rx * boxW * orbitScale * Math.sin(phi);
        const orbitY =
          (orbit.cy - 0.5) * boxH - orbit.ry * boxH * orbitScale * Math.cos(phi) + offsetY;

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

        // 3D pitch/yaw/roll that tilts the cube in orbit and straightens to 0deg flat when flow completes
        const cubeTilt = Math.max(0, 1 - k * 1.2);
        const pitch = Math.sin(phi + i * 1.2) * 14 * cubeTilt;
        const yaw = Math.cos(phi + i * 1.6) * 18 * cubeTilt;
        const roll = Math.sin(phi * 0.8 + i) * 8 * cubeTilt;

        const target = hoveredRef.current === el ? HOVER_SCALE : 1;
        const hoverScale = (scalesRef.current[i] += (target - scalesRef.current[i]) * SCALE_EASE);

        // 100% GPU-composited transform for 3D cube
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotateX(${pitch.toFixed(1)}deg) rotateY(${yaw.toFixed(1)}deg) rotateZ(${roll.toFixed(1)}deg) scale(${hoverScale.toFixed(4)})`;
        el.style.setProperty("--k", k.toFixed(2));

        // Position straight, flat 2D text label at seat
        const labelEl = labelRefs.current[i];
        if (labelEl) {
          const s = seat(i);
          const narrow = isNarrow(pinW);
          // Revealed ONLY when flow reaches its final stage (k >= 0.80)
          const labelOpacity = Math.max(0, Math.min(1, (k - 0.8) * 5.0));

          if (narrow) {
            // MOBILE VIEW: Top-left to bottom-right staircase
            // Upper half (0, 1, 2) on left flank -> Place on the RIGHT
            // Lower half (3, 4, 5) on right flank -> Place on the LEFT
            const isRightSide = i < 3;
            const slideOffset = (1 - labelOpacity) * (isRightSide ? 8 : -8);

            labelEl.style.opacity = labelOpacity.toFixed(3);
            if (isRightSide) {
              labelEl.style.transform = `translate3d(calc(${s.x + 38 + slideOffset}px), calc(-50% + ${s.y + releaseY}px), 0)`;
            } else {
              labelEl.style.transform = `translate3d(calc(-100% + ${s.x - 38 - slideOffset}px), calc(-50% + ${s.y + releaseY}px), 0)`;
            }
          } else {
            // DESKTOP VIEW: Top for index 0, bottom for 1..5
            const isTop = i === 0;
            const labelOffsetY = isTop ? -54 : 54;
            const slideOffset = (1 - labelOpacity) * (isTop ? -6 : 6);

            labelEl.style.opacity = labelOpacity.toFixed(3);
            labelEl.style.transform = `translate3d(calc(-50% + ${s.x}px), calc(-50% + ${s.y + releaseY + labelOffsetY + slideOffset}px), 0)`;
          }
        }

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
            k,
            tint: cards[i].tint,
            active: true,
          };
        }
      }
    };

    measure();

    let animationFrameId: number;
    let running = false;
    const started = performance.now();

    const tick = (now: number) => {
      animationFrameId = requestAnimationFrame(tick);
      place((now - started) / 1000);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      animationFrameId = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(animationFrameId);
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
      { rootMargin: "0px" },
    );
    intersectionObserver.observe(container);

    return () => {
      sizeObserver.disconnect();
      intersectionObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [cards, flowRef, liveCardsRef]);

  /**
   * Hover still records WHICH station the pointer is on - the eased hover scale
   * in `place()` and the CSS hover state both read it - but it no longer lights
   * a particle swarm, because there is no swarm.
   *
   * The removed call was `particlesRef.current?.glow(...)`, reaching sideways
   * out of this component into a sibling WebGL layer to brighten the region
   * behind the hovered card. That layer is gone with the three.js eviction, and
   * with it the only reason this component ever needed a ref to anything
   * outside itself.
   */
  const handleEnter = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    hoveredRef.current = event.currentTarget;
  }, []);

  const handleLeave = useCallback(() => {
    if (hoveredRef.current === null) return;
    hoveredRef.current = null;
  }, []);

  return (
    <div className="hero__labels" ref={containerRef}>
      {/* 1. The 3D Glass Cubes */}
      {cards.map((card, i) => (
        <div
          key={card.title}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          className="hero__label hero__cube"
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
            className="hero__label-glass hero__cube-glass"
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
            {/* 3D Cube Facet & Bevel Lighting */}
            <div className="hero__cube-shimmer" aria-hidden="true" />
            <div className="hero__cube-edge-glint" aria-hidden="true" />

            <div className="hero__label-inner">
              {/* Centered Domain Icon */}
              <div className="hero__label-icon-badge" aria-hidden="true">
                <div className="hero__label-icon-glow" />
                <FlowIcon index={i} />
              </div>
            </div>
          </GlassSurface>
        </div>
      ))}

      {/* 2. Flat Straight Text Labels (Revealed strictly at the final flow formation) */}
      {cards.map((card, i) => (
        <div
          key={`label-${card.title}`}
          ref={(el) => {
            labelRefs.current[i] = el;
          }}
          className={`hero__flow-label ${
            i === 0 ? "hero__flow-label--top" : "hero__flow-label--bottom"
          } ${i < 3 ? "hero__flow-label--mobile-right" : "hero__flow-label--mobile-left"}`}
          style={
            {
              "--flow-tint": sampleGradientCss(card.tint, { lighten: 0.55 }),
            } as React.CSSProperties
          }
        >
          <div className="hero__label-header">
            <span className="hero__label-index">{String(i + 1).padStart(2, "0")}</span>
            <span className="hero__label-title">{card.title}</span>
          </div>
          <span className="hero__label-note">{card.note}</span>
        </div>
      ))}
    </div>
  );
}
