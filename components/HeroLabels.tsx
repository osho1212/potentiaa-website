"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import type { HeroParticlesHandle } from "./HeroParticles";
import { sampleGradientCss } from "@/lib/heroParticles";
import { CARD, seatAt } from "@/lib/flowLayout";
import { site } from "@/lib/site";
import GlassSurface from "./GlassSurface";

/**
 * The flow cards drifting around the particle swarm.
 *
 * Content is lib/site.ts's `flow` - the hands one job passes through in a
 * business with nothing joining them up. Order is meaning, not decoration;
 * see the note there.
 *
 * COLOUR comes from the particles' own ramp via sampleGradientCss rather than
 * from hand-picked hex, so a card and the particles nearest it are tinted from
 * the identical stops and cannot drift apart when the palette moves. Each card
 * is keyed by its index along the sequence: Customer deep blue through to
 * Owner coral, the same direction the swarm runs.
 *
 * MOTION IS DRIVEN HERE, NOT IN CSS, and that is a deliberate move away from
 * the `offset-path` orbits this used to ride. A CSS motion path can only be
 * scrubbed along ITS OWN curve - there is no way to blend a point on it
 * against an unrelated target coordinate, which is exactly what the scroll
 * transition needs when these cards leave their orbits and settle into the
 * flow layout. Owning the position in JS makes that a lerp. The cost is six
 * transform writes a frame, which is nothing next to the 40,800 particles
 * already running beside them.
 *
 * Because JS now owns `transform`, the hover scale has to live here too -
 * a CSS `:hover { transform: scale() }` would simply be overwritten every
 * frame. It is eased rather than switched, which also reads better than the
 * CSS transition did.
 *
 * INTERACTION: hovering a card brightens the particles nearest it
 * (lib/heroParticles' glow machinery, the brightness-only sibling of the
 * cursor repel). The card is still drifting while hovered, so "nearest it" is
 * re-measured every frame rather than captured once on enter - it rides the
 * same loop as the motion, so hovering costs one extra rect read and nothing
 * else.
 */

/**
 * Each card's ellipse, as fractions of the container box - carried over from
 * the `offset-path: ellipse(rx ry at cx cy)` rules these replaced, so the
 * resting look is unchanged.
 */
const ORBITS = [
  { rx: 0.44, ry: 0.38, cx: 0.5, cy: 0.46 },
  { rx: 0.38, ry: 0.44, cx: 0.54, cy: 0.5 },
  { rx: 0.46, ry: 0.46, cx: 0.48, cy: 0.52 },
  { rx: 0.4, ry: 0.34, cx: 0.52, cy: 0.44 },
  { rx: 0.48, ry: 0.4, cx: 0.5, cy: 0.56 },
  { rx: 0.42, ry: 0.48, cx: 0.46, cy: 0.48 },
];

/**
 * Seconds per lap, and direction.
 *
 * Starting phase is NOT listed: it is `i / count`, set in the loop below, so
 * the cards are guaranteed evenly spaced around their orbits at rest. The
 * hand-tuned negative delays this replaces happened to put three of the six
 * within a tenth of a lap of each other, which is what made them overlap on
 * load. Differing durations still pull them out of step over time, which is
 * the part that was actually wanted.
 */
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
const HOVER_SCALE = 1.06;

/**
 * How much of the scroll each card waits before it leaves its orbit.
 *
 * The point of staggering is that the line assembles rather than snapping into
 * place: Customer sets off first and Owner last, so the reader sees the order
 * the work travels in. Each card still gets the whole remaining span to fly,
 * so none of them arrives late.
 */
const STAGGER = 0.08;

/** Smoothstep - kills the corner at both ends of each card's flight. */
function ease(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

/**
 * Scroll state, written by FlowStage once a frame and read here.
 *
 * A mutable ref rather than props: this is read inside a rAF loop, and pushing
 * a scroll value through React would re-render six cards sixty times a second
 * to set a transform the loop is already setting.
 */
export interface FlowProgress {
  /** 0..1 through the hero -> flow-section transition. */
  t: number;
  /**
   * How far the hero has scrolled under the pinned layer, <= 0.
   *
   * The cards' layer is `position: sticky` and the swarm is not, so once the
   * pin engages the two stop agreeing. Adding this back to the orbit keeps the
   * cards on the swarm while it slides away, instead of detaching from it the
   * instant the reader starts scrolling.
   */
  offsetY: number;
  /**
   * Scroll past the end of the transition, <= 0 and 0 until `t` reaches 1.
   *
   * The pin would otherwise hold the finished flow at the top of the viewport
   * for another screenful, carrying it over the section below - the flow
   * belongs to ITS section and has to leave with it. Adding this to the seats
   * hands them back to the page once they have arrived, so they scroll away
   * with the copy they belong to rather than hanging over what follows.
   */
  releaseY: number;
}

export default function HeroLabels({
  particlesRef,
  flowRef,
}: {
  particlesRef: RefObject<HeroParticlesHandle | null>;
  flowRef?: RefObject<FlowProgress>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const hoveredRef = useRef<HTMLElement | null>(null);
  /** Current eased scale per card - lives across frames, so not React state. */
  const scalesRef = useRef<number[]>([]);

  const cards = useMemo(
    () =>
      site.flow.map((card, i) => ({
        ...card,
        // Spread across the full ramp, endpoints included.
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

    // Cached rather than measured per frame: these only change on resize, and
    // reading them in the loop would be a forced layout sixty times a second
    // for an answer that is the same every time.
    let boxW = container.clientWidth;
    let boxH = container.clientHeight;
    /** The container's origin inside the pinned layer, and that layer's size. */
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

    /**
     * A staircase seat, converted from the pinned layer's coordinates into the
     * offset-from-container-centre that the card transforms are written in.
     *
     * The seat itself comes from lib/flowLayout, which the connecting stream
     * also reads - the line has to run THROUGH the cards, so both cannot be
     * allowed to hold their own copy of where the cards are.
     */
    const seat = (i: number) => {
      const p = seatAt(i, count, pinW, pinH);
      return { x: p.x - originX - boxW / 2, y: p.y - originY - boxH / 2 };
    };

    const place = (time: number) => {
      const flow = flowRef?.current;
      const t = flow ? flow.t : 0;
      const offsetY = flow ? flow.offsetY : 0;
      const releaseY = flow ? flow.releaseY : 0;
      // Each card's own 0..1, opening STAGGER later than the one before it and
      // still finishing by the end of the scroll.
      const window_ = Math.max(0.01, 1 - STAGGER * (count - 1));

      for (let i = 0; i < count; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;

        const orbit = ORBITS[i % ORBITS.length];
        const timing = TIMING[i % TIMING.length];

        // Phase 0 is the top of the ellipse and increasing u runs clockwise,
        // matching the offset-path behaviour this replaced.
        const dir = timing.reverse ? -1 : 1;
        const u = i / count + (dir * time) / timing.duration;
        const phi = u * Math.PI * 2;

        // Relative to the container's CENTRE, because the card is laid out
        // centred (inset 0 + margin auto) rather than at the top-left.
        // offsetY rides along so the orbit stays on the swarm as it scrolls off.
        const orbitX = (orbit.cx - 0.5) * boxW + orbit.rx * boxW * Math.sin(phi);
        const orbitY = (orbit.cy - 0.5) * boxH - orbit.ry * boxH * Math.cos(phi) + offsetY;

        let x = orbitX;
        let y = orbitY;
        if (t > 0 && pin) {
          const k = ease((t - i * STAGGER) / window_);
          if (k > 0) {
            const s = seat(i);
            // releaseY is 0 for the whole flight and only bites once the flow
            // has arrived, at which point it carries the seats up with the
            // section they belong to instead of letting the pin hold them over
            // the next one.
            x += (s.x - orbitX) * k;
            y += (s.y + releaseY - orbitY) * k;
          }
        }

        const target = hoveredRef.current === el ? HOVER_SCALE : 1;
        const scale = (scalesRef.current[i] += (target - scalesRef.current[i]) * SCALE_EASE);

        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      }

      // One rect read, and only while something is actually hovered.
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

    // Lay the cards out once before any of this, so the no-motion case and the
    // first painted frame are both correct rather than stacked at the centre.
    measure();
    place(0);

    // Also watches the pin, because that is what changes on a viewport resize.
    //
    // The container's own entry does double duty: FlowStage sizes this layer
    // from a LATER effect than this one - child effects run before parent
    // effects - so on mount the box measured just above is the unplaced one.
    // Its width and height landing is what fires this observer and corrects it.
    const sizeObserver = new ResizeObserver(() => {
      measure();
      if (!running) place(0);
    });
    sizeObserver.observe(container);
    if (pin) sizeObserver.observe(pin);

    // The page renders every section twice for the scroll loop, so the copy
    // that is off screen must not pay for any of this.
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
  }, [cards, particlesRef, flowRef]);

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
              // Read by the CSS for the note's tint, the resting border and
              // the hover glow, so the ramp position is set once here rather
              // than in three places.
              //
              // The note is lightened and the border is not: one is text and
              // has to be readable against --midnight-950, the other is a hue
              // cue at low alpha and reads better raw. See sampleGradientCss.
              "--flow-tint": sampleGradientCss(card.tint, { lighten: 0.55 }),
              "--flow-tint-soft": sampleGradientCss(card.tint, { alpha: 0.5, lighten: 0.15 }),
              "--flow-tint-faint": sampleGradientCss(card.tint, { alpha: 0.22, lighten: 0.2 }),
            } as React.CSSProperties
          }
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {/*
            GlassSurface (React Bits) is used HERE AND NOWHERE ELSE on the
            site. Its `backdrop-filter` runs an SVG displacement map rather
            than a blur, which is what gives the rim its refraction and its
            chromatic edge - and is also far dearer than a blur. Six small
            cards can carry that; the full-viewport panel behind them, the
            header pills and the modal all keep their plain blur.
          */}
          <GlassSurface
            className="hero__label-glass"
            width={CARD.w}
            height={CARD.h}
            borderRadius={14}
            // Softer than the component's default -180: at this size a full
            // distortion bends the card's own edge into a smear.
            distortionScale={-92}
            redOffset={2}
            greenOffset={9}
            blueOffset={17}
            brightness={58}
            opacity={0.9}
            blur={9}
            backgroundOpacity={0.06}
            saturation={1.25}
          >
            <span className="hero__label-inner">
              {/* The step's number. It is the point of the section - six
                  hands, in order - so it is shown rather than left implied. */}
              <span className="hero__label-index">{String(i + 1).padStart(2, "0")}</span>
              <span className="hero__label-title">{card.title}</span>
              <span className="hero__label-note">{card.note}</span>
            </span>
          </GlassSurface>
        </div>
      ))}
    </div>
  );
}
