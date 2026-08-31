"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import GlassSurface from "./GlassSurface";
import { sampleGradientCss } from "@/lib/heroParticles";
import { constellationState } from "@/lib/constellationState";

const ORBITS = [
  { rx: 0.44, ry: 0.36, cx: 0.5, cy: 0.48 },
  { rx: 0.38, ry: 0.42, cx: 0.5, cy: 0.50 },
  { rx: 0.46, ry: 0.38, cx: 0.5, cy: 0.52 },
  { rx: 0.40, ry: 0.34, cx: 0.5, cy: 0.46 },
  { rx: 0.48, ry: 0.40, cx: 0.5, cy: 0.50 },
  { rx: 0.42, ry: 0.44, cx: 0.5, cy: 0.52 },
];

const TIMING = [
  { duration: 32, reverse: false },
  { duration: 38, reverse: true },
  { duration: 28, reverse: false },
  { duration: 34, reverse: true },
  { duration: 30, reverse: false },
  { duration: 42, reverse: true },
];

const NODES = [
  { title: "Customer", note: "Order placed", index: "01", tint: 0.05 },
  { title: "Front Desk", note: "Logged on screen", index: "02", tint: 0.24 },
  { title: "Team & Staff", note: "Job assigned", index: "03", tint: 0.44 },
  { title: "Stock", note: "Auto-synced", index: "04", tint: 0.64 },
  { title: "Billing", note: "1-click GST bill", index: "05", tint: 0.82 },
  { title: "Owner", note: "Live profit report", index: "06", tint: 1.0 },
];

function NodeIcon({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 1:
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </svg>
      );
    case 2:
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 3:
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
        </svg>
      );
    case 4:
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M14 8H8" />
          <path d="M16 12H8" />
          <path d="M13 16H8" />
        </svg>
      );
    case 5:
    default:
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      );
  }
}

function ease(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

export default function HeroFlowConstellation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const container = containerRef.current;
    if (!container) return;

    let rafId = 0;
    const started = performance.now();
    const count = NODES.length;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const now = performance.now();
      const elapsed = (now - started) / 1000;

      const heroEl = document.querySelector<HTMLElement>(".hero");
      const flowEl = document.querySelector<HTMLElement>(".flow-section");
      const trackEl = document.querySelector<HTMLElement>(".flow-pipeline__berths");

      const winW = window.innerWidth;
      const winH = window.innerHeight;

      // Hero box dimensions for elliptical orbit
      const heroRect = heroEl?.getBoundingClientRect();
      const boxW = heroRect?.width || winW;
      const boxH = heroRect?.height || winH;
      const heroCenterY = (heroRect?.top || 0) + boxH * 0.5;

      // Transition progress t: 0 in Hero -> 1 when Flow section aligns
      let t = 0;
      if (flowEl) {
        const flowRect = flowEl.getBoundingClientRect();
        const startY = winH * 0.85;
        const endY = winH * 0.2;
        t = Math.max(0, Math.min(1, (startY - flowRect.top) / (startY - endY)));
      }

      // Track stations positions in FlowSection
      const trackRect = trackEl?.getBoundingClientRect();
      const isMobile = winW < 768;

      for (let i = 0; i < count; i++) {
        const el = nodeRefs.current[i];
        if (!el) continue;

        const orbit = ORBITS[i % ORBITS.length];
        const timing = TIMING[i % TIMING.length];
        const dir = timing.reverse ? -1 : 1;

        // Continuous fluid orbital motion in Hero
        const u = i / count + (dir * elapsed) / timing.duration;
        const phi = u * Math.PI * 2;
        const orbitScale = Math.min(boxW, boxH) < 600 ? 0.72 : 1.0;

        const orbitX = (orbit.cx - 0.5) * boxW * 0.92 + orbit.rx * boxW * 0.88 * orbitScale * Math.sin(phi);
        const orbitY = heroCenterY + (orbit.cy - 0.5) * boxH * 0.88 - orbit.ry * boxH * 0.78 * orbitScale * Math.cos(phi);

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
          seatY = (flowEl?.getBoundingClientRect().top || winH * 1.5) + 320;
        }

        // Staggered easing from orbit to seat
        const k = ease((t - i * 0.06) / 0.64);

        const x = orbitX * (1 - k) + seatX * k;
        const y = orbitY * (1 - k) + seatY * k;

        // Deep 3D spatial trajectory when moving to the bottleneck section
        const orbitZ = Math.sin(phi * 2.0) * 32;
        const swoopZ = Math.sin(k * Math.PI) * -110;
        const dockElevationZ = 30; // elevated 3D glass slab in bottleneck section
        const z = orbitZ * (1 - k) + (swoopZ + dockElevationZ) * k;

        // 3D perspective orientation
        const pitch = Math.sin(phi + i * 1.2) * 16 * (1 - k) + (10 * k); // forward 3D tilt in bottleneck
        const yaw = Math.cos(phi + i * 1.6) * 18 * (1 - k) + (-5 * (i - 2.5) * k); // perspective fanout
        const roll = Math.sin(phi * 0.8 + i) * 8 * (1 - k);
        const scale = (1.0 + Math.sin(phi) * 0.06 * (1 - k)) * (1.0 + k * 0.06);

        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${pitch.toFixed(1)}deg) rotateY(${yaw.toFixed(1)}deg) rotateZ(${roll.toFixed(1)}deg) scale(${scale.toFixed(3)})`;

        // Update live screen coordinates for particle filament physics (always active)
        if (constellationState.nodes[i]) {
          constellationState.nodes[i].x = winW * 0.5 + x;
          constellationState.nodes[i].y = y;
          constellationState.nodes[i].active = 1.0;
        }

        const labelEl = labelRefs.current[i];
        if (labelEl) {
          const labelOpacity = Math.max(0, Math.min(1, (k - 0.2) * 2.5));
          labelEl.style.opacity = labelOpacity.toFixed(3);
          labelEl.style.transform = `translate3d(0, ${(1 - labelOpacity) * 8}px, 0)`;
        }
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="hero-constellation" ref={containerRef} aria-hidden="true">
      {NODES.map((node, i) => (
        <div
          key={node.title}
          ref={(el) => {
            nodeRefs.current[i] = el;
          }}
          className="constellation-node"
          style={
            {
              "--node-tint": sampleGradientCss(node.tint, { lighten: 0.5 }),
              "--node-glow": sampleGradientCss(node.tint, { alpha: 0.4 }),
            } as unknown as React.CSSProperties
          }
        >
          {/* Volumetric shadow plane for 3D depth */}
          <div className="constellation-node__shadow" aria-hidden="true" />

          <GlassSurface
            className="constellation-node__glass"
            width={80}
            height={80}
            borderRadius={22}
            distortionScale={-85}
            redOffset={2}
            greenOffset={8}
            blueOffset={15}
            brightness={62}
            opacity={0.92}
            blur={10}
            backgroundOpacity={0.08}
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
