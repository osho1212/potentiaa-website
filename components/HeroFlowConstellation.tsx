"use client";

import { useEffect, useRef, useState } from "react";
import GlassSurface from "./GlassSurface";
import { constellationState } from "@/lib/constellationState";

// Faster, smoother, and more chaotic multi-harmonic orbital configurations
// Faster, smoother, and more chaotic multi-harmonic orbital configurations for 5 nodes
const CHAOTIC_ORBITS = [
  { cx: -0.38, cy: 0.30, rx: 0.22, ry: 0.26, f1: 0.115, f2: 0.185, f3: 0.082, phase: 0.2 },
  { cx: -0.40, cy: 0.68, rx: 0.24, ry: 0.26, f1: -0.098, f2: 0.165, f3: 0.104, phase: 1.8 },
  { cx: 0.00, cy: 0.16, rx: 0.22, ry: 0.16, f1: 0.125, f2: -0.150, f3: 0.090, phase: 3.2 },
  { cx: 0.40, cy: 0.36, rx: 0.24, ry: 0.28, f1: -0.108, f2: 0.178, f3: -0.088, phase: 0.9 },
  { cx: 0.38, cy: 0.72, rx: 0.25, ry: 0.25, f1: 0.122, f2: -0.155, f3: 0.112, phase: 2.5 },
];

const MOBILE_CHAOTIC = [
  { cx: -0.34, cy: 0.16, rx: 0.16, ry: 0.12, f1: 0.12, f2: 0.18, f3: 0.08, phase: 0.2 },
  { cx: -0.40, cy: 0.52, rx: 0.12, ry: 0.18, f1: -0.10, f2: 0.16, f3: 0.09, phase: 1.8 },
  { cx: 0.00, cy: 0.88, rx: 0.18, ry: 0.10, f1: 0.13, f2: -0.14, f3: 0.08, phase: 3.4 },
  { cx: 0.38, cy: 0.32, rx: 0.14, ry: 0.18, f1: 0.12, f2: -0.15, f3: 0.10, phase: 2.5 },
  { cx: 0.34, cy: 0.72, rx: 0.16, ry: 0.14, f1: -0.12, f2: 0.15, f3: -0.08, phase: 4.2 },
];

const NODES = [
  { title: "Order Capture", note: "Front Desk / Sales", index: "01", tint: "#60A5FA", glow: "rgba(45, 107, 255, 0.20)", tintVal: 0.05 },
  { title: "Capacity & Approval", note: "Operations Manager", index: "02", tint: "#818CF8", glow: "rgba(99, 102, 241, 0.20)", tintVal: 0.28 },
  { title: "Stock Movement", note: "Warehouse / Fulfilment", index: "03", tint: "#C084FC", glow: "rgba(168, 85, 247, 0.20)", tintVal: 0.52 },
  { title: "Billing & Ledger", note: "Accounts Team", index: "04", tint: "#FB7185", glow: "rgba(250, 69, 146, 0.20)", tintVal: 0.76 },
  { title: "Owner Visibility", note: "Business Owner", index: "05", tint: "#FF8C7F", glow: "rgba(255, 107, 92, 0.20)", tintVal: 1.0 },
];

function NodeIcon({ index }: { index: number }) {
  switch (index) {
    case 0:
      // Order Capture (Clipboard / Sales Order)
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      );
    case 1:
      // Capacity & Approval (Operations Manager Shield & Check)
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 2:
      // Stock Movement (Warehouse / Fulfilment Box)
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case 3:
      // Billing & Ledger (Accounts Team Receipt / Ledger)
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M14 8H8" />
          <path d="M16 12H8" />
          <path d="M13 16H8" />
        </svg>
      );
    case 4:
    default:
      // Owner Visibility (Business Owner Growth Dashboard)
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
          <path d="M3 20h18" />
        </svg>
      );
  }
}

function ease(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

function sampleStreamRgba(u: number, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  if (u < 0.25) {
    const t = u / 0.25;
    const r = Math.round(45 + (129 - 45) * t);
    const g = Math.round(107 + (140 - 107) * t);
    const b = Math.round(255 + (248 - 255) * t);
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  } else if (u < 0.50) {
    const t = (u - 0.25) / 0.25;
    const r = Math.round(129 + (192 - 129) * t);
    const g = Math.round(140 + (132 - 140) * t);
    const b = Math.round(248 + (252 - 248) * t);
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  } else if (u < 0.75) {
    const t = (u - 0.50) / 0.25;
    const r = Math.round(192 + (251 - 192) * t);
    const g = Math.round(132 + (113 - 132) * t);
    const b = Math.round(252 + (133 - 252) * t);
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  } else {
    const t = (u - 0.75) / 0.25;
    const r = Math.round(251 + (255 - 251) * t);
    const g = Math.round(113 + (140 - 113) * t);
    const b = Math.round(133 + (127 - 133) * t);
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  }
}

interface StreamParticle {
  u: number;
  speed: number;
  offset: number;
  size: number;
  phase: number;
}

export default function HeroFlowConstellation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const streamCanvasRef = useRef<HTMLCanvasElement>(null);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const container = containerRef.current;
    const streamCanvas = streamCanvasRef.current;
    if (!container || !streamCanvas) return;

    const ctx = streamCanvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let rafId = 0;
    let running = false;
    const started = performance.now();
    let lastTime = started;
    const count = NODES.length;

    /* Looked up once per mount, not per frame. document.querySelector every
       tick was three DOM queries this component never needed - these
       elements don't get replaced while it's alive. */
    const heroEl = document.querySelector<HTMLElement>(".hero");
    const flowEl = document.querySelector<HTMLElement>(".flow-section");
    const trackEl = document.querySelector<HTMLElement>(".flow-pipeline__berths");
    const heroCopyEl = heroEl?.querySelector<HTMLElement>(".hero__copy") ?? null;

    // 1. Initialize 1,200 particle motes for the luminous pipeline stream
    const STREAM_COUNT = 1200;
    const streamParticles: StreamParticle[] = [];
    for (let i = 0; i < STREAM_COUNT; i++) {
      streamParticles.push({
        u: i / STREAM_COUNT,
        speed: 0.055 + Math.random() * 0.065,
        offset: (Math.random() * 2 - 1) * Math.pow(Math.random(), 0.6),
        size: 0.75 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = (now - started) / 1000;

      const winW = window.innerWidth;
      const winH = window.innerHeight;

      // Ensure stream canvas matches device pixel ratio
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (streamCanvas.width !== winW * dpr || streamCanvas.height !== winH * dpr) {
        streamCanvas.width = winW * dpr;
        streamCanvas.height = winH * dpr;
        streamCanvas.style.width = `${winW}px`;
        streamCanvas.style.height = `${winH}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, winW, winH);

      // Hero box dimensions for elliptical orbit
      const heroRect = heroEl?.getBoundingClientRect();
      const boxW = heroRect?.width || winW;
      const boxH = heroRect?.height || winH;
      const heroCenterY = (heroRect?.top || 0) + boxH * 0.5;

      // Transition progress t: 0 in Hero -> 1 when Flow section aligns
      const flowRect = flowEl?.getBoundingClientRect();
      let t = 0;
      if (flowRect) {
        const startY = winH * 0.85;
        const endY = winH * 0.2;
        t = Math.max(0, Math.min(1, (startY - flowRect.top) / (startY - endY)));
      }

      // Track stations positions in FlowSection
      const trackRect = trackEl?.getBoundingClientRect();
      const isMobile = winW < 768;

      /* Measured once per frame, not once per node (5x): the copy block's
         box doesn't depend on which node is being placed. */
      const copyBox = heroCopyEl?.getBoundingClientRect();
      const deadZoneHalfW = copyBox ? copyBox.width * 0.24 : 0;
      const deadZoneHalfH = copyBox ? copyBox.height * 0.28 : 0;
      const copyCenterY = copyBox ? copyBox.top + copyBox.height * 0.5 : 0;

      const nodeScreenCoords: Array<{ x: number; y: number }> = [];

      for (let i = 0; i < count; i++) {
        const el = nodeRefs.current[i];
        if (!el) continue;

        const cfg = isMobile ? MOBILE_CHAOTIC[i % MOBILE_CHAOTIC.length] : CHAOTIC_ORBITS[i % CHAOTIC_ORBITS.length];

        // Multi-frequency chaotic harmonic trajectory
        const t1 = elapsed * cfg.f1 * Math.PI * 2 + cfg.phase;
        const t2 = elapsed * cfg.f2 * Math.PI * 2 + cfg.phase * 1.618;
        const t3 = elapsed * cfg.f3 * Math.PI * 2 + cfg.phase * 2.718;

        const harmonicX = Math.sin(t1) * 0.62 + Math.sin(t2) * 0.28 + Math.cos(t3) * 0.10;
        const harmonicY = Math.cos(t1 * 1.05) * 0.62 + Math.cos(t2 * 1.25) * 0.28 + Math.sin(t3 * 0.85) * 0.10;

        let orbitX = cfg.cx * boxW + cfg.rx * boxW * harmonicX;
        let orbitY = heroCenterY + (cfg.cy - 0.5) * boxH + cfg.ry * boxH * harmonicY;

        // Smooth continuous text margin deflection
        if (copyBox) {
          const dy = orbitY - copyCenterY;
          if (Math.abs(dy) < deadZoneHalfH) {
            const pushFactor = Math.cos((dy / deadZoneHalfH) * (Math.PI * 0.5));
            if (orbitX < 0 && orbitX > -deadZoneHalfW) {
              orbitX = -deadZoneHalfW - pushFactor * 14;
            } else if (orbitX >= 0 && orbitX < deadZoneHalfW) {
              orbitX = deadZoneHalfW + pushFactor * 14;
            }
          }
        }

        // Target seat in Flow Section pipeline
        let seatX = 0;
        let seatY = 0;

        if (trackRect) {
          if (isMobile) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const cellW = trackRect.width / 2;
            const cellH = trackRect.height / 3;
            seatX = trackRect.left + (col + 0.5) * cellW - winW * 0.5;
            seatY = trackRect.top + (row + 0.5) * cellH;
          } else {
            const cellW = trackRect.width / count;
            seatX = trackRect.left + (i + 0.5) * cellW - winW * 0.5;
            seatY = trackRect.top + trackRect.height * 0.35;
          }
        } else {
          seatX = (-0.5 + (i + 0.5) / count) * Math.min(winW * 0.85, 1100);
          /* Reuses the rect already read once above rather than taking a
             fresh one per node - this branch is cold (the berths element
             exists in practice), but it is a forced layout inside a loop. */
          seatY = (flowRect?.top || winH * 1.5) + 320;
        }

        // Staggered easing from orbit to seat
        const k = ease((t - i * 0.06) / 0.64);

        const x = orbitX * (1 - k) + seatX * k;
        const y = orbitY * (1 - k) + seatY * k;

        // Spatial trajectory - clean alignment with zero parallax in docked section
        const orbitZ = Math.sin(t1 * 2.0) * 36 + Math.cos(t2) * 16;
        const z = orbitZ * (1 - k);

        // 3D banking - zero tilt/yaw/pitch in docked section
        const pitch = (Math.sin(t1 + i * 1.2) * 20 + Math.cos(t2) * 8) * (1 - k);
        const yaw = (Math.cos(t2 + i * 1.6) * 22 + Math.sin(t3) * 10) * (1 - k);
        const roll = (Math.sin(t3 * 0.8 + i) * 16 + Math.cos(t1) * 8) * (1 - k);
        const scale = 1.0 + Math.sin(t1) * 0.08 * (1 - k);

        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${pitch.toFixed(1)}deg) rotateY(${yaw.toFixed(1)}deg) rotateZ(${roll.toFixed(1)}deg) scale(${scale.toFixed(3)})`;

        const screenX = winW * 0.5 + x;
        const screenY = y;
        nodeScreenCoords.push({ x: screenX, y: screenY });

        // Update live screen coordinates for particle filament physics
        if (constellationState.nodes[i]) {
          constellationState.nodes[i].x = screenX;
          constellationState.nodes[i].y = screenY;
          constellationState.nodes[i].active = 1.0;
        }

        const labelEl = labelRefs.current[i];
        if (labelEl) {
          const labelOpacity = Math.max(0, Math.min(1, (k - 0.2) * 2.5));
          labelEl.style.opacity = labelOpacity.toFixed(3);
          labelEl.style.transform = `translate3d(0, ${(1 - labelOpacity) * 8}px, 0)`;
        }
      }

      // 2. Render Luminous Particle Stream Line between Floating Modules
      // Stream is 100% invisible in Hero section (streamAlpha = 0), and begins appearing smoothly as we scroll to the bottleneck section
      const streamAlpha = Math.max(0, Math.min(1.0, (t - 0.04) / 0.45));

      if (nodeScreenCoords.length >= 2 && streamAlpha > 0.005) {
        // Precompute cumulative segment lengths
        const segLengths: number[] = [];
        let totalLen = 0;
        for (let i = 0; i < nodeScreenCoords.length - 1; i++) {
          const dx = nodeScreenCoords[i + 1].x - nodeScreenCoords[i].x;
          const dy = nodeScreenCoords[i + 1].y - nodeScreenCoords[i].y;
          const len = Math.sqrt(dx * dx + dy * dy);
          segLengths.push(len);
          totalLen += len;
        }

        if (totalLen > 10) {
          // A. Radiant Station Halos beneath each floating module
          for (let i = 0; i < nodeScreenCoords.length; i++) {
            const p = nodeScreenCoords[i];
            const u = i / Math.max(1, nodeScreenCoords.length - 1);
            const pulse = Math.sin(elapsed * 4.0 + i * 1.2) * 0.15 + 0.85;
            const haloGrad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 36 * pulse);
            haloGrad.addColorStop(0, sampleStreamRgba(u, 0.45 * streamAlpha));
            haloGrad.addColorStop(0.5, sampleStreamRgba(u, 0.18 * streamAlpha));
            haloGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 36 * pulse, 0, Math.PI * 2);
            ctx.fill();
          }

          // B. Soft Radiant Core Backbone Line
          ctx.beginPath();
          ctx.moveTo(nodeScreenCoords[0].x, nodeScreenCoords[0].y);
          for (let i = 1; i < nodeScreenCoords.length; i++) {
            ctx.lineTo(nodeScreenCoords[i].x, nodeScreenCoords[i].y);
          }
          ctx.strokeStyle = sampleStreamRgba(0.5, 0.30 * streamAlpha);
          ctx.lineWidth = 2.5;
          ctx.shadowColor = "rgba(129, 140, 248, 0.65)";
          ctx.shadowBlur = 14;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // C. 1,200 Luminous Flowing Shimmer Particles along the pipeline
          for (let i = 0; i < streamParticles.length; i++) {
            const sp = streamParticles[i];
            sp.u = (sp.u + sp.speed * dt) % 1.0;

            const targetDist = sp.u * totalLen;
            let acc = 0;
            let segIdx = 0;
            let segT = 0;

            for (let s = 0; s < segLengths.length; s++) {
              if (acc + segLengths[s] >= targetDist || s === segLengths.length - 1) {
                segIdx = s;
                segT = segLengths[s] > 0 ? (targetDist - acc) / segLengths[s] : 0;
                break;
              }
              acc += segLengths[s];
            }

            const pA = nodeScreenCoords[segIdx];
            const pB = nodeScreenCoords[segIdx + 1] || pA;

            // Base position on line
            const bx = pA.x + (pB.x - pA.x) * segT;
            const by = pA.y + (pB.y - pA.y) * segT;

            // Normal perpendicular vector
            const dx = pB.x - pA.x;
            const dy = pB.y - pA.y;
            const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const nx = -dy / len;
            const ny = dx / len;

            // Lateral Gaussian dispersion (pinches near stations, billows between them)
            const spanSpread = (Math.sin(segT * Math.PI) * 18 + 3.5) * sp.offset;
            const shimmer = Math.sin(sp.phase + elapsed * 5.5) * 2.2;
            const px = bx + nx * (spanSpread + shimmer);
            const py = by + ny * (spanSpread + shimmer);

            const moteAlpha = (0.35 + 0.65 * (1 - Math.abs(sp.offset))) * streamAlpha;
            ctx.fillStyle = sampleStreamRgba(sp.u, moteAlpha);
            ctx.beginPath();
            ctx.arc(px, py, sp.size, 0, Math.PI * 2);
            ctx.fill();
          }

          // D. Fast Travelling Energy Comets / Pulses racing through the stations
          for (let c = 0; c < 3; c++) {
            const cometU = ((elapsed * 0.18 + c * 0.333) % 1.0);
            const cometDist = cometU * totalLen;
            let acc = 0;
            let segIdx = 0;
            let segT = 0;

            for (let s = 0; s < segLengths.length; s++) {
              if (acc + segLengths[s] >= cometDist || s === segLengths.length - 1) {
                segIdx = s;
                segT = segLengths[s] > 0 ? (cometDist - acc) / segLengths[s] : 0;
                break;
              }
              acc += segLengths[s];
            }

            const pA = nodeScreenCoords[segIdx];
            const pB = nodeScreenCoords[segIdx + 1] || pA;
            const cx = pA.x + (pB.x - pA.x) * segT;
            const cy = pA.y + (pB.y - pA.y) * segT;

            // Bright head
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = sampleStreamRgba(cometU, 1.0);
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      ctx.restore();
    };

    /* HIDDEN UNTIL A FRAME HAS ACTUALLY POSITIONED THE NODES.
       Their CSS resting state is top:0 / left:50% with no transform, so all
       five sit stacked at the top centre of the viewport until the first
       tick writes a transform. That is only invisible if a tick is
       guaranteed to run, and it is not: on a deep link to a section far down
       the page, neither observed target ever intersects and the loop never
       starts. Showing the container from the first positioned frame instead
       makes that impossible, and it doubles as the guarantee that a stopped
       loop can never leave anything on screen. */
    container.style.visibility = "hidden";

    const start = () => {
      if (running) return;
      running = true;
      /* Synchronous, so the transforms are correct BEFORE the container is
         revealed - scheduling it would show one frame of wherever the nodes
         were left when the loop last stopped. tick() arms the next frame
         itself, so this must not also call requestAnimationFrame. */
      tick();
      container.style.visibility = "";
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
      rafId = 0;

      /* LEAVE NOTHING BEHIND. The container is position:fixed, so whatever
         the last frame drew stays welded to the viewport for every section
         below - and the last frame is the fully docked, fully lit one. The
         canvas is only ever cleared inside tick, and .constellation-node is
         pointer-events:auto inside a pointer-events:none parent, so frozen
         nodes stay live hover targets too. Hiding covers all of it. */
      container.style.visibility = "hidden";
      ctx.clearRect(0, 0, streamCanvas.width, streamCanvas.height);

      /* The hero swarm draws filaments to these coordinates and gates them on
         `active` (see lib/heroParticles). Left at 1 they are stale positions
         the nodes no longer occupy, which is exactly what this flag is for. */
      for (let i = 0; i < count; i++) {
        if (constellationState.nodes[i]) constellationState.nodes[i].active = 0;
      }
    };

    /* Runs while EITHER endpoint of the orbit-to-dock journey is near the
       viewport: the nodes fly from the hero and land in the flow section, so
       both have to be gone before there is nothing left to animate.
       .hero-constellation itself is position:fixed and always intersects, so
       it cannot be the observed target - heroEl and flowEl move with scroll.

       The membership has to be tracked per target rather than folded out of
       `entries`. A callback only carries the targets whose state CHANGED, so
       an `entries.some(...)` reads as "nothing is near" the moment the hero
       alone leaves - while the flow section is still on screen, mid-dock -
       and freezes the whole thing in place. That was the pinned-nodes bug. */
    const near = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) near.add(entry.target);
          else near.delete(entry.target);
        }
        if (near.size > 0) start();
        else stop();
      },
      { rootMargin: "400px 0px" },
    );
    if (heroEl) observer.observe(heroEl);
    if (flowEl) observer.observe(flowEl);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="hero-constellation" ref={containerRef} aria-hidden="true">
      {/* Luminous Particle Line Stream Canvas connecting floating modules */}
      <canvas ref={streamCanvasRef} className="constellation-stream-canvas" />

      {NODES.map((node, i) => (
        <div
          key={node.title}
          ref={(el) => {
            nodeRefs.current[i] = el;
          }}
          className="constellation-node"
          style={
            {
              "--node-tint": node.tint,
              "--node-glow": node.glow,
            } as unknown as React.CSSProperties
          }
        >
          {/* Volumetric shadow plane for 3D depth */}
          <div className="constellation-node__shadow" aria-hidden="true" />

          <GlassSurface
            className="constellation-node__glass"
            width={68}
            height={68}
            borderRadius={15}
            distortionScale={-85}
            redOffset={2}
            greenOffset={8}
            blueOffset={15}
            brightness={65}
            opacity={0.92}
            blur={10}
            backgroundOpacity={0.12}
            saturation={1.3}
          >
            <div className="constellation-node__icon">
              <NodeIcon index={i} />
            </div>
          </GlassSurface>

          {/* Connected station label (reveals upon alignment in Flow Section) */}
          <div
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className="constellation-node__label"
          >
            <span className="constellation-node__badge">{node.index}</span>
            <span className="constellation-node__title">{node.title}</span>
            <span className="constellation-node__note">{node.note}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
