"use client";

import { useEffect, useRef } from "react";
import { scrollState } from "@/lib/scrollState";

interface Cube {
  left: string;
  size: number;
  phase: number;
  speed: number;
  turns: number;
  depth: number;
  color: string;
}

const INTRO_CUBES: Cube[] = [
  { left: "4%", size: 66, phase: 0.1, speed: 2.2, turns: 0.8, depth: 0.8, color: "rgba(38, 93, 255, 0.13)" },
  { left: "16%", size: 36, phase: 0.6, speed: 3.4, turns: -1.2, depth: 0.4, color: "rgba(99, 102, 241, 0.11)" },
  { left: "28%", size: 52, phase: 0.25, speed: 1.8, turns: 1.0, depth: 0.6, color: "rgba(250, 69, 146, 0.09)" },
  { left: "42%", size: 32, phase: 0.8, speed: 4.0, turns: -1.5, depth: 0.35, color: "rgba(59, 130, 246, 0.10)" },
  { left: "56%", size: 48, phase: 0.45, speed: 2.6, turns: 1.1, depth: 0.55, color: "rgba(139, 92, 246, 0.12)" },
  { left: "70%", size: 60, phase: 0.15, speed: 2.0, turns: -0.9, depth: 0.75, color: "rgba(38, 93, 255, 0.13)" },
  { left: "84%", size: 38, phase: 0.7, speed: 3.2, turns: 1.3, depth: 0.45, color: "rgba(250, 69, 146, 0.09)" },
  { left: "93%", size: 56, phase: 0.35, speed: 2.4, turns: -1.0, depth: 0.7, color: "rgba(99, 102, 241, 0.12)" },
];

export default function IntroCubes() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".intro-cube-shard"));

    let raf = 0;
    let prevP = -1;

    const tick = () => {
      const p = reduced ? 0 : scrollState.progress;
      if (Math.abs(p - prevP) > 0.00005) {
        prevP = p;
        const rect = root.getBoundingClientRect();
        const height = rect.height || 800;

        nodes.forEach((node, i) => {
          const cube = INTRO_CUBES[i];
          const span = height + cube.size * 2;
          const offset = ((cube.phase + p * cube.speed * 2.0) % 1 + 1) % 1;
          const y = offset * span - cube.size;
          const rot = p * cube.turns * 360;
          node.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg)`;
        });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="intro-cubes-field" ref={rootRef} aria-hidden="true">
      {INTRO_CUBES.map((cube, i) => (
        <div
          key={i}
          className="intro-cube-shard"
          style={{
            left: cube.left,
            width: `${cube.size}px`,
            height: `${cube.size}px`,
            background: cube.color,
            border: "1px solid rgba(99, 102, 241, 0.20)",
            boxShadow: `0 4px 16px rgba(99, 102, 241, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.8)`,
            borderRadius: "14px",
            opacity: 0.75 + cube.depth * 0.25,
            filter: `blur(${(1 - cube.depth) * 1.2}px)`,
          }}
        />
      ))}
    </div>
  );
}
