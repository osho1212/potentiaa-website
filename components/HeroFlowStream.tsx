"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
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

/** Pipeline stream particle count along the connected line. */
const STREAM_COUNT = 420;

/** Max trail motes in the dynamic particle comet pool. */
const TRAIL_POOL_SIZE = 240;

/** Laps per second along the whole line. */
const SPEED = 0.055;

/** Half-thickness of the stream in px, at a node and at mid-span. */
const SPREAD_NODE = 3;
const SPREAD_MID = 20;

/** When the stream appears, in `t`. */
const FADE_IN = { from: 0.28, to: 0.92 };

/** How far along the line the stream has been drawn, against `t`. */
const REVEAL = { from: 0.35, to: 1 };

/** Colour bands for stream particles. */
const BANDS = 24;

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
      offset[i] = (Math.random() * 2 - 1) * (Math.random() * 0.6 + 0.4);
      size[i] = 0.7 + Math.random() * 1.1;
      drift[i] = 0.6 + Math.random() * 0.8;
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

          // Spawn new motes behind moving card while in motion
          const speed = Math.hypot(card.vx, card.vy);
          const isFlying = card.k > 0.02 && card.k < 0.98;
          const spawnCount = isFlying ? (speed > 1 ? 3 : 2) : 1;

          for (let s = 0; s < spawnCount; s++) {
            const mote = trailPool[nextTrailIdx];
            nextTrailIdx = (nextTrailIdx + 1) % TRAIL_POOL_SIZE;

            mote.x = card.x + (Math.random() - 0.5) * (isFlying ? 18 : 10);
            mote.y = card.y + (Math.random() - 0.5) * (isFlying ? 18 : 10);
            mote.vx = -card.vx * (0.25 + Math.random() * 0.3) + (Math.random() - 0.5) * 0.8;
            mote.vy = -card.vy * (0.25 + Math.random() * 0.3) + (Math.random() - 0.5) * 0.8;
            mote.maxLife = isFlying ? 0.75 + Math.random() * 0.6 : 0.4 + Math.random() * 0.3;
            mote.life = mote.maxLife;
            mote.size = 1.0 + Math.random() * (isFlying ? 2.2 : 1.4);
            mote.cardIndex = c;
          }
        }

        // Update and render active trail motes
        for (let i = 0; i < TRAIL_POOL_SIZE; i++) {
          const mote = trailPool[i];
          if (mote.life <= 0) continue;

          mote.life -= dt;
          mote.x += mote.vx;
          mote.y += mote.vy;
          mote.vx *= 0.96;
          mote.vy *= 0.96;

          const progress = mote.life / mote.maxLife;
          const alpha = Math.sin(progress * Math.PI) * 0.65;
          if (alpha <= 0.01) continue;

          ctx.fillStyle = nodeGlowColors[mote.cardIndex] || bands[0];
          ctx.globalAlpha = Math.min(1, alpha);
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

      // A. Connecting Base Line
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
          const p = pathAt(reveal, count, width, height);
          ctx.lineTo(p.x, p.y);
          break;
        }
      }
      ctx.strokeStyle = `rgba(130, 165, 255, ${(0.22 * presence).toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // B. Pipeline Stream Particles
      ctx.globalCompositeOperation = "lighter";
      const stream = reduced ? 0 : time * SPEED;

      for (let i = 0; i < STREAM_COUNT; i++) {
        let u = u0[i] + stream * drift[i];
        u -= Math.floor(u);

        if (u > reveal) continue;

        const p = pathAt(u, count, width, height);
        const near = nodeProximity(u, count);

        const spread = SPREAD_NODE + (SPREAD_MID - SPREAD_NODE) * near;
        const a = seatAt(0, count, width, height);
        const b = seatAt(count - 1, count, width, height);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const px = p.x + nx * offset[i] * spread;
        const py = p.y + ny * offset[i] * spread;

        const brightness = (0.35 + 0.65 * (1 - near)) * presence;
        ctx.fillStyle = bands[Math.min(BANDS - 1, (u * BANDS) | 0)];
        ctx.globalAlpha = Math.min(1, brightness);
        const radius = size[i] * (1 + (1 - near) * 0.9);
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // C. Station Glowing Node Rings at Each Seated Card
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
      lastTime = performance.now();
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
  }, [flowRef, liveCardsRef]);

  return <canvas ref={canvasRef} className="flow-stage__stream" aria-hidden="true" />;
}
