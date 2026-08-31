"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { gsap } from "gsap";
import type { FlowProgress } from "./HeroLabels";
import { nodeProximity, pathAt, seatAt, type LiveCardState } from "@/lib/flowLayout";
import { sampleGradientCss } from "@/lib/heroParticles";
import { site } from "@/lib/site";

/**
 * The unified pipeline stream and shadowing comet trail engine.
 *
 * 1. Emits luminous particle comet trails behind each moving glass cube/card as it flies from orbit to seat.
 * 2. Draws the radiant connecting pipeline and energy pulses through all seats once formed.
 * 3. Renders bright pulsing station nodes at each card seat in the staircase.
 */

/** Pipeline stream particle count along the connected line (rich dense cloud). */
const STREAM_COUNT = 960;

/** Max trail motes in the dynamic particle comet pool. */
const TRAIL_POOL_SIZE = 60;

/** Laps per second along the whole line. */
const SPEED = 0.055;

/** Half-thickness of the stream in px, at a node and at mid-span. */
const SPREAD_NODE = 3;
const SPREAD_MID = 20;

/** When the stream appears, in `t`. */
const FADE_IN = { from: 0.28, to: 0.92 };

/** How far along the line the stream has been drawn, against `t`. */
const REVEAL = { from: 0.35, to: 1 };

/**
 * How much of the line the reveal's leading edge fades across, in `u`.
 *
 * The reveal used to be a hard cut - a particle one step behind the edge drew
 * at full brightness and one step ahead of it did not draw at all. `reveal` is
 * driven by scroll, so that boundary sweeps along the line as the reader moves
 * and every particle it crosses appears instantly at full alpha. Hundreds of
 * them doing that during a scroll is the stream's leading edge sparkling into
 * existence rather than growing.
 *
 * 0.04 is about a quarter of one segment between stations: long enough to read
 * as the line extending, short enough that the head still looks like a head.
 */
const REVEAL_FEATHER = 0.04;

/** Colour bands for stream particles. */
const BANDS = 24;

/**
 * NO FPS CAP HERE, and that is the opposite of HeroEnergy - deliberately.
 *
 * A 30fps duty-cycle cap was tried on this canvas, on the same reasoning that
 * justifies HeroEnergy's: the stream crawls the line at SPEED laps per second,
 * so nothing in it needs sixty redraws a second to read correctly. That
 * reasoning is sound for HeroEnergy and wrong for this one, because of what
 * this canvas is drawing.
 *
 * HeroEnergy is a free-floating field; it answers to nothing else on screen. This
 * canvas draws the line THROUGH the six station cards, and those cards are DOM
 * elements moved by CSS at the display's own rate. The stream is aligned to
 * them through `ctx.translate(0, releaseY)` and a shared seat table
 * (lib/flowLayout), both of which change with every scroll frame.
 *
 * Halve this canvas's rate and you do not get a slightly coarser stream - you
 * get a stream that is a frame behind the cards it is joining, drifting away
 * from the icons and snapping back, twice a second, for the whole scroll. That
 * reads as the stream glitching, which is exactly what it was reported as.
 *
 * The cap also no longer buys anything. It was added while six SVG-filter
 * lenses were re-rasterising in software on the same thread and everything in
 * this section was contending for it. With those off the scroll (see
 * flow-stage--drifting in styles/glass-surface.css) this canvas measured free:
 * dropped frames 2.4%/1.0% with it drawing against 1.2%/3.7% with it display:none
 * - indistinguishable. It costs nothing, so it may as well stay in step.
 */

function smoothstep(edge0: number, edge1: number, x: number): number {
  const c = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return c * c * (3 - 2 * c);
}

interface TrailMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  cardIndex: number;
}

export default function HeroFlowStream({
  flowRef,
  liveCardsRef,
}: {
  flowRef?: RefObject<FlowProgress>;
  liveCardsRef?: RefObject<LiveCardState[]>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pin = canvas.closest<HTMLElement>(".flow-stage__pin");
    if (!pin) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const count = site.flow.length;

    // Stream particle constants
    const u0 = new Float32Array(STREAM_COUNT);
    const offset = new Float32Array(STREAM_COUNT);
    const size = new Float32Array(STREAM_COUNT);
    const drift = new Float32Array(STREAM_COUNT);
    for (let i = 0; i < STREAM_COUNT; i++) {
      u0[i] = i / STREAM_COUNT;
      offset[i] = (Math.random() * 2 - 1) * (Math.random() * 0.7 + 0.3);
      /**
       * A FLOOR ON THE RADIUS, because below about a pixel these twinkle.
       *
       * This was `0.8 + random * 1.6`, and the bottom of that range is the
       * problem: an arc of radius 0.8 filled on a dpr-1.5 backing store is
       * mostly antialiasing, and the exact pixel coverage it resolves to
       * changes as it drifts a fraction of a pixel between frames. The particle
       * therefore flickers in brightness while travelling in a straight line at
       * a constant alpha - and it is drawn with `lighter`, which makes every
       * one of those flickers add into whatever is under it.
       *
       * A few hundred of those at once is read as the stream fizzing rather
       * than flowing. The floor is lifted to 1.2 so the smallest particle still
       * covers a whole device pixel at dpr 1.5 with something left over; the
       * top of the range is unchanged, so the size variation that gives the
       * stream its depth is still there, just without the sub-pixel tier.
       */
      size[i] = 1.2 + Math.random() * 1.2;
      drift[i] = 0.5 + Math.random() * 0.9;
    }

    const bands: string[] = [];
    const nodeGlowColors: string[] = [];
    for (let b = 0; b < BANDS; b++) {
      bands.push(sampleGradientCss(b / (BANDS - 1), { lighten: 0.25 }));
    }
    for (let i = 0; i < count; i++) {
      nodeGlowColors.push(sampleGradientCss(i / Math.max(1, count - 1), { lighten: 0.35 }));
    }

    // Particle Comet Trail Pool
    const trailPool: TrailMote[] = [];
    for (let i = 0; i < TRAIL_POOL_SIZE; i++) {
      trailPool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        cardIndex: 0,
      });
    }
    let nextTrailIdx = 0;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const r = pin.getBoundingClientRect();
      width = r.width;
      height = r.height;
      /**
       * Capped at 1.5, not 2 - a deliberate softening, not a bug fix.
       *
       * At `min(dpr, 2)` this buffer was exactly dpr x the viewport, which is
       * the CORRECT amount of resolution for a sharp canvas - unlike the hero
       * swarm's old buffer, that was never oversampled the way the swarm's was
       * once. There was no free win sitting here.
       *
       * Cut anyway, on the owner's call: a dpr-2 display was measured spending
       * a modest but real tail on this canvas - p90 20.8ms against 17.5ms with
       * it hidden, worst frame 75ms against 50ms - all of it while several
       * comets are mid-flight and additively blending at once. 1.5 trades some
       * of that sharpness back for headroom: the buffer's AREA drops from 4x
       * the viewport to 2.25x, a 44% cut, while dpr-1 displays are untouched
       * (`min(1, 1.5)` is still 1).
       *
       * Soft is the right word for what this costs, not broken - comets and
       * the connecting line are glow and blur to begin with, which is a much
       * more forgiving place to lose a fraction of a pixel than the crisp
       * edges of type or a hard-edged UI panel would be.
       */
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    let lastTime = performance.now();

    const draw = (time: number) => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const flow = flowRef?.current;
      const t = flow ? flow.t : 0;
      const releaseY = flow ? flow.releaseY : 0;
      const liveCards = liveCardsRef?.current;

      // 1. EMIT & DRAW COMET SHADOW TRAILS BEHIND MOVING CARDS
      if (liveCards && liveCards.length > 0 && !reduced) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        for (let c = 0; c < liveCards.length; c++) {
          const card = liveCards[c];
          if (!card || !card.active) continue;

          const isFlying = card.k > 0.05 && card.k < 0.95;
          if (isFlying) {
            const mote = trailPool[nextTrailIdx];
            nextTrailIdx = (nextTrailIdx + 1) % TRAIL_POOL_SIZE;

            mote.x = card.x + (Math.random() - 0.5) * 12;
            mote.y = card.y + (Math.random() - 0.5) * 12;
            mote.vx = -card.vx * 0.2 + (Math.random() - 0.5) * 0.5;
            mote.vy = -card.vy * 0.2 + (Math.random() - 0.5) * 0.5;
            mote.maxLife = 0.4 + Math.random() * 0.3;
            mote.life = mote.maxLife;
            mote.size = 1.2 + Math.random() * 1.4;
            mote.cardIndex = c;
          }
        }

        // Update and render active trail motes
        for (let i = 0; i < TRAIL_POOL_SIZE; i++) {
          const mote = trailPool[i];
          if (mote.life <= 0) continue;

          /**
           * Integrated against TIME, not against frames.
           *
           * `mote.x += mote.vx` advanced a mote by one velocity unit per
           * callback, so how far a comet trail actually threw its motes came
           * out of the display's refresh rate: a 144Hz panel scattered them
           * nearly two and a half times as far as a 60Hz one, and any frame the
           * page dropped shortened the trail visibly. The damping had the same
           * problem - a fixed 0.94 per frame settles in half the wall-clock
           * time at twice the rate.
           *
           * Both are now expressed per second and scaled by the frame's own dt,
           * with 60fps as the reference so the tuned constants above keep the
           * behaviour they were chosen for. `dt` is already clamped to 50ms at
           * the top of draw, so a tab returning from the background cannot
           * throw a mote across the canvas in one step.
           */
          const step = dt * 60;
          mote.life -= dt;
          mote.x += mote.vx * step;
          mote.y += mote.vy * step;
          const damp = Math.pow(0.94, step);
          mote.vx *= damp;
          mote.vy *= damp;

          const progress = mote.life / mote.maxLife;
          const alpha = Math.sin(progress * Math.PI) * 0.5;
          if (alpha <= 0.02) continue;

          ctx.fillStyle = nodeGlowColors[mote.cardIndex] || bands[0];
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(mote.x, mote.y + (t >= 1 ? releaseY : 0), mote.size * progress, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // 2. CONNECTING PIPELINE & PULSING STATION NODES
      const presence = smoothstep(FADE_IN.from, FADE_IN.to, t);
      if (presence <= 0.001 || width === 0) return;

      const reveal = smoothstep(REVEAL.from, REVEAL.to, t);
      if (reveal <= 0.001) return;

      ctx.save();
      ctx.translate(0, releaseY);

      // Pipeline Stream Particles (Pure Dense Particle Cloud)
      ctx.globalCompositeOperation = "lighter";
      const stream = reduced ? 0 : time * SPEED;

      const a = seatAt(0, count, width, height);
      const b = seatAt(count - 1, count, width, height);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      for (let bIdx = 0; bIdx < BANDS; bIdx++) {
        ctx.fillStyle = bands[bIdx];
        const bandMinU = bIdx / BANDS;
        const bandMaxU = (bIdx + 1) / BANDS;

        for (let i = 0; i < STREAM_COUNT; i++) {
          let u = u0[i] + stream * drift[i];
          u -= Math.floor(u);
          if (u > reveal || u < bandMinU || u >= bandMaxU) continue;

          // Fade in across the leading edge rather than switching on at it -
          // see REVEAL_FEATHER. Full brightness everywhere behind the feather,
          // so this costs nothing for the body of the stream.
          const behindEdge = reveal - u;
          const edgeFade =
            behindEdge < REVEAL_FEATHER ? behindEdge / REVEAL_FEATHER : 1;

          const p = pathAt(u, count, width, height);
          const near = nodeProximity(u, count);
          const spread = SPREAD_NODE + (SPREAD_MID - SPREAD_NODE) * near;
          const px = p.x + nx * offset[i] * spread;
          const py = p.y + ny * offset[i] * spread;
          const brightness = (0.35 + 0.65 * (1 - near)) * presence * edgeFade;
          const radius = size[i] * (1 + (1 - near) * 0.9);

          ctx.globalAlpha = Math.min(1, brightness);
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // C. Station Glowing Node Rings at Each Seated Card
      const segments = Math.max(1, count - 1);
      for (let i = 0; i < count; i++) {
        const stationProgress = i / segments;
        if (reveal < stationProgress) continue;

        const nodeSeat = seatAt(i, count, width, height);
        const pulse = (time * 1.5 + i * 0.4) % 1;
        const pulseRadius = 6 + pulse * 18;
        const pulseAlpha = (1 - pulse) * 0.45 * presence;

        // Outer expanding energy pulse
        ctx.beginPath();
        ctx.arc(nodeSeat.x, nodeSeat.y, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = nodeGlowColors[i];
        ctx.globalAlpha = pulseAlpha;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Inner glowing core dot
        ctx.beginPath();
        ctx.arc(nodeSeat.x, nodeSeat.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = nodeGlowColors[i];
        ctx.globalAlpha = 0.85 * presence;
        ctx.fill();
      }

      ctx.restore();
    };

    let running = false;
    const started = performance.now();

    /**
     * BEHIND LENIS ON THE SHARED TICKER, which is what keeps the stream welded
     * to the cards.
     *
     * Everything positioning this canvas - `flowRef.current.releaseY`, and the
     * `t` that drives reveal and presence - is written by FlowStage from inside
     * `onScrollFrame`, which SmoothScroll fires from inside `lenis.raf`, which
     * runs on gsap.ticker. On its own requestAnimationFrame this canvas was a
     * second scheduler reading those values with no defined relationship to the
     * frame that produced them.
     *
     * SiteShell renders SmoothScroll before <main>, so its ticker callback is
     * registered first and gsap runs callbacks in registration order. Adding
     * this one here therefore lands it after the scroll has been advanced and
     * after FlowStage has written the new seat offsets - every frame, in that
     * order. The stream draws the line where the cards are this frame rather
     * than where they were last frame.
     */
    const drive = () => draw((performance.now() - started) / 1000);

    const start = () => {
      if (running) return;
      running = true;
      lastTime = performance.now();
      gsap.ticker.add(drive);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      gsap.ticker.remove(drive);
    };

    resize();
    draw(0);

    const sizeObserver = new ResizeObserver(() => {
      resize();
      if (!running) draw(0);
    });
    sizeObserver.observe(pin);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: "0px" },
    );
    intersectionObserver.observe(canvas);

    return () => {
      sizeObserver.disconnect();
      intersectionObserver.disconnect();
      // `stop` is a no-op if the observer already paused it; calling remove
      // directly covers the case where it did not.
      gsap.ticker.remove(drive);
    };
  }, [flowRef, liveCardsRef]);

  return <canvas ref={canvasRef} className="flow-stage__stream" aria-hidden="true" />;
}
