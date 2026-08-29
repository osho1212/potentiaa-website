"use client";

import { useEffect, useRef } from "react";
import { scrollState } from "@/lib/scrollState";
import { mixRgb, themeAt } from "@/lib/sectionTheme";

/**
 * Ambient depth behind the content - the equivalent of the reference site's
 * floating foliage, rebuilt from Potentiaa's own module geometry.
 *
 * LOOP-SAFE PARALLAX. The page scrolls forever, so a plain `y = -progress * d`
 * translate would snap back to zero at the seam. Instead each shard travels a
 * whole number of wrap-distances per page and its offset is taken modulo that
 * distance: it drifts upward continuously, re-enters from the bottom, and after
 * exactly the whole page has wrapped an integer number of times - landing back where
 * it started with nothing to see at the seam. Rotation uses whole turns per page
 * for the same reason.
 *
 * Purely decorative, so aria-hidden and frozen under prefers-reduced-motion.
 */

type Shard = {
  /** Starting offset down the wrap cycle, 0..1. */
  phase: number;
  left: string;
  size: number;
  /** Roughly how many wrap-distances it covers per page. Higher = nearer. */
  speed: number;
  /** Whole turns per page. */
  turns: number;
  /**
   * 0 = far, 1 = near. Drives opacity, blur and how much of the section accent
   * it takes, so one number governs everything that should agree about depth.
   * Hue is no longer per-shard: it comes from the section under the sightline,
   * so the whole field changes colour together as the page moves.
   */
  depth: number;
};

/**
 * Spread across the WIDTH, not pinned in the corners.
 *
 * They used to sit in the two outer margins, in calc() off the container edge,
 * because an earlier round measured 109px of glyphs set directly on top of a
 * shard and the fix was to banish them from the reading column. That fixed the
 * legibility and cost the page its depth: everything interesting happened in
 * two narrow strips, the middle was flat near-black from top to bottom, and the
 * whole thing read as monotone.
 *
 * The depth model is what lets them come back inside. There are three planes
 * now - falling cubes behind, text in the middle, module weaving through - and
 * these are unambiguously the back one. A shard crossing the centre passes
 * BEHIND the words, so the question stops being "does it touch text" and starts
 * being "can you still read the text with it there". That is answered by the
 * numbers below rather than by geography: none is above 0.2 opacity, all of
 * them are blurred, and none uses a hue that competes with body copy.
 *
 * `depth` drives size, speed, blur and opacity together, which is the part that
 * makes it read as space rather than as scattered squares - a near shard is
 * big, fast, sharp and bright; a far one is small, slow, soft and dim.
 */
const SHARDS: Shard[] = [
  { phase: 0.05, left: "6vw", size: 74, speed: 3, turns: 1, depth: 0.85 },
  { phase: 0.62, left: "17vw", size: 34, speed: 5, turns: 2, depth: 0.3 },
  { phase: 0.3, left: "27vw", size: 52, speed: 2, turns: -1, depth: 0.55 },
  { phase: 0.88, left: "38vw", size: 26, speed: 6, turns: 2, depth: 0.18 },
  { phase: 0.45, left: "49vw", size: 44, speed: 4, turns: -1, depth: 0.42 },
  { phase: 0.15, left: "60vw", size: 30, speed: 5, turns: 2, depth: 0.25 },
  { phase: 0.72, left: "70vw", size: 64, speed: 2, turns: -1, depth: 0.72 },
  { phase: 0.38, left: "79vw", size: 38, speed: 4, turns: 1, depth: 0.35 },
  { phase: 0.92, left: "88vw", size: 88, speed: 1, turns: -1, depth: 1.0 },
  { phase: 0.55, left: "95vw", size: 46, speed: 3, turns: 2, depth: 0.48 },
];

export default function DepthField() {
  const rootRef = useRef<HTMLDivElement>(null);
  const washRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".field__shard"));
    const glows = Array.from(root.querySelectorAll<HTMLElement>(".field__glow"));

    let raf = 0;

    let prevAccent = "";
    let prevP = -1;

    const tick = () => {
      const p = reduced ? 0 : scrollState.progress;
      if (Math.abs(p - prevP) > 0.00005) {
        prevP = p;
        const viewport = window.innerHeight;

        const theme = themeAt(viewport * 0.5);
        const accent = mixRgb(theme.from.accent, theme.to.accent, theme.t);

        if (accent !== prevAccent) {
          prevAccent = accent;
          root.style.setProperty("--field-accent", accent);
          if (washRef.current) {
            washRef.current.style.background =
              `radial-gradient(115% 85% at 50% 0%, ${accent} 0%, transparent 62%)`;
          }
        }

        nodes.forEach((node, i) => {
          const shard = SHARDS[i];
          const span = viewport + shard.size * 2;
          const offset = ((shard.phase + p * shard.speed) % 1 + 1) % 1;
          const y = (offset * span - shard.size * 2).toFixed(1);
          const rot = (p * shard.turns * 360).toFixed(1);
          node.style.transform = `translate3d(0, ${y}px, 0) rotate(${rot}deg)`;
        });

        glows.forEach((glow, i) => {
          const drift = (Math.sin((p + i * 0.33) * Math.PI * 2) * 60).toFixed(1);
          glow.style.transform = `translate3d(0, ${drift}px, 0)`;
        });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="field" ref={rootRef} aria-hidden="true">
      {/* The ambient wash. One very low-alpha tint across the whole viewport,
          recoloured every frame from the section under the sightline. This is
          the piece that actually answers "the site looks monotone": without it
          only the small objects change colour and the ground stays the same
          near-black from the first screen to the last. */}
      <div className="field__wash" ref={washRef} />
      {/* Back, but pushed out and dimmed to a third of what it was.

          At left:-34vw / 46vw wide with a 90px blur its right edge reached
          x=244 on a 1280 viewport, straight across Zeal's column, and the craft
          critic measured the result as a 162x430px luminance slab over him. At
          -52vw it stops short of the content entirely and does what it was
          named for - tinting the outer edge - instead of putting a gradient
          behind the character. */}
      <div
        className="field__glow"
        style={{
          top: "8vh",
          left: "-52vw",
          width: "46vw",
          height: "46vw",
          background: "var(--blue-700)",
          opacity: 0.18,
        }}
      />
      <div
        className="field__glow"
        style={{
          top: "64vh",
          right: "-36vw",
          width: "48vw",
          height: "48vw",
          background: "var(--coral-700)",
          opacity: 0.2,
        }}
      />

      {SHARDS.map((shard, index) => (
        <div
          key={index}
          className="field__shard"
          style={{
            top: 0,
            left: shard.left,
            width: shard.size,
            height: shard.size,
            /* Depth drives all three together. A near shard is bigger, brighter
               and sharper; a far one is small, dim and soft. Splitting these
               apart is what made the old set read as scattered squares rather
               than as space. */
            opacity: 0.06 + shard.depth * 0.14,
            filter: `blur(${(1 - shard.depth) * 2.6 + 0.4}px)`,
          }}
        />
      ))}
    </div>
  );
}
