"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { FlowProgress } from "./HeroLabels";
import { nodeProximity, pathAt, seatAt } from "@/lib/flowLayout";
import { sampleGradientCss } from "@/lib/heroParticles";
import { site } from "@/lib/site";

/**
 * The stream that joins the flow cards up - particles running along the line
 * through every seat, tightening and brightening as they pass each one.
 *
 * This is the "connected" half of the section: the hero says the pieces are
 * all there but nothing joins them, and this is what joining them looks like.
 *
 * A 2D CANVAS, NOT A SECOND WEBGL CONTEXT, and that is the main decision here.
 * The swarm is WebGL and the page renders every section twice for the scroll
 * loop, so there are already two live contexts; matching it would make four,
 * against a browser limit that is commonly sixteen for the whole tab and
 * shared with anything else the page does. What this draws - a few hundred
 * small additive dots - is exactly what a 2D context does natively with
 * `globalCompositeOperation = "lighter"`, and none of the swarm's reasons for
 * needing WebGL (forty thousand instances, per-particle shaders, supersampled
 * point sprites) apply to it.
 *
 * GEOMETRY comes from lib/flowLayout, the same module the cards read their
 * seats from. The line's whole purpose is to run through the cards, so a
 * private copy of that arithmetic would be a bug waiting to happen.
 */

/** Enough to read as a stream, few enough to cost nothing on a 2D context. */
const COUNT = 420;

/** Laps per second along the whole line. Slow: this is a current, not traffic. */
const SPEED = 0.055;

/** Half-thickness of the stream in px, at a node and at mid-span. */
const SPREAD_NODE = 3;
const SPREAD_MID = 22;

/**
 * When the stream appears, in `t`.
 *
 * Deliberately later than the cards start moving: the line cannot exist before
 * there are stations for it to join, so it comes in behind them once the
 * staircase is recognisable, and is fully present as the last card lands.
 */
const FADE_IN = { from: 0.35, to: 0.92 };

/**
 * How far along the line the stream has been DRAWN, against `t`.
 *
 * The path is not revealed all at once - it grows out of the first card and
 * reaches the last one exactly as the section finishes arriving. That order is
 * the content: the enquiry starts at Customer and travels, so the line has to
 * travel too rather than appearing as a finished diagram.
 *
 * It opens a little after the first card has taken its seat, because a line
 * cannot leave a station that is not there yet.
 */
const REVEAL = { from: 0.42, to: 1 };

/** Colour bands - built once, indexed per particle, rather than built per frame. */
const BANDS = 24;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const c = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return c * c * (3 - 2 * c);
}

export default function HeroFlowStream({ flowRef }: { flowRef?: RefObject<FlowProgress> }) {
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

    // Per-particle constants. `u` is its place along the line; `offset` is how
    // far off-centre it rides, signed, so the stream has body rather than being
    // a wire; `size` and `phase` keep it from looking like a printed dotted rule.
    const u0 = new Float32Array(COUNT);
    const offset = new Float32Array(COUNT);
    const size = new Float32Array(COUNT);
    const drift = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      u0[i] = i / COUNT;
      offset[i] = (Math.random() * 2 - 1) * (Math.random() * 0.6 + 0.4);
      size[i] = 0.7 + Math.random() * 1.1;
      drift[i] = 0.6 + Math.random() * 0.8;
    }

    const bands: string[] = [];
    for (let b = 0; b < BANDS; b++) {
      bands.push(sampleGradientCss(b / (BANDS - 1), { lighten: 0.25 }));
    }

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const r = pin.getBoundingClientRect();
      width = r.width;
      height = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const draw = (time: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const flow = flowRef?.current;
      const t = flow ? flow.t : 0;
      const releaseY = flow ? flow.releaseY : 0;
      const presence = smoothstep(FADE_IN.from, FADE_IN.to, t);
      if (presence <= 0.001 || width === 0) return;

      // How much of the line exists yet - see REVEAL. Everything below draws
      // only up to this point, so the path grows out of the first card rather
      // than appearing whole.
      const reveal = smoothstep(REVEAL.from, REVEAL.to, t);
      if (reveal <= 0.001) return;

      // Rides with the section once the flow has arrived, so the line leaves
      // with the copy it belongs to instead of the pin holding it over the
      // section below.
      ctx.translate(0, releaseY);

      // The line itself, under the particles - faint, and only as far along as
      // the stream has reached.
      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath();
      const segments = Math.max(1, count - 1);
      const head = reveal * segments;
      const start = seatAt(0, count, width, height);
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i <= segments; i++) {
        if (head >= i) {
          const p = seatAt(i, count, width, height);
          ctx.lineTo(p.x, p.y);
        } else {
          // Part-way along the segment the head is currently crossing.
          const p = pathAt(reveal, count, width, height);
          ctx.lineTo(p.x, p.y);
          break;
        }
      }
      ctx.strokeStyle = `rgba(126, 155, 255, ${(0.16 * presence).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // The particles, summed rather than painted over one another - the same
      // reason the swarm blends additively.
      ctx.globalCompositeOperation = "lighter";
      // How far the current has carried, in laps. Zero under reduced motion:
      // the line still draws, it just does not run.
      const stream = reduced ? 0 : time * SPEED;

      for (let i = 0; i < COUNT; i++) {
        let u = u0[i] + stream * drift[i];
        u -= Math.floor(u);

        // Nothing exists ahead of the head yet. Skipping rather than clamping:
        // clamped particles would pile up on the head as a bright dot.
        if (u > reveal) continue;

        const p = pathAt(u, count, width, height);
        const near = nodeProximity(u, count);

        // Tight at the stations, open between them.
        const spread = SPREAD_NODE + (SPREAD_MID - SPREAD_NODE) * near;
        // Perpendicular to the line. The staircase is uniform, so one normal
        // serves the whole path.
        const a = seatAt(0, count, width, height);
        const b = seatAt(count - 1, count, width, height);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const px = p.x + nx * offset[i] * spread;
        const py = p.y + ny * offset[i] * spread;

        // Brightest as it passes a station, which is what makes the line read
        // as connected stops rather than an even pipe.
        const brightness = (0.35 + 0.65 * (1 - near)) * presence;
        ctx.fillStyle = bands[Math.min(BANDS - 1, (u * BANDS) | 0)];
        ctx.globalAlpha = Math.min(1, brightness);
        const radius = size[i] * (1 + (1 - near) * 0.8);
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    let raf = 0;
    let running = false;
    const started = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      draw((now - started) / 1000);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    draw(0);

    const sizeObserver = new ResizeObserver(() => {
      resize();
      if (!running) draw(0);
    });
    sizeObserver.observe(pin);

    // Watches the CANVAS, not the pin, and that is doing two jobs: the
    // off-screen lap must not draw, and below 900px the canvas is
    // `display: none` alongside the cards it exists to join up - which never
    // intersects, so the loop stops there without a second media query to
    // keep in step with the stylesheet.
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: "10%" },
    );
    intersectionObserver.observe(canvas);

    return () => {
      sizeObserver.disconnect();
      intersectionObserver.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [flowRef]);

  return <canvas ref={canvasRef} className="flow-stage__stream" aria-hidden="true" />;
}
