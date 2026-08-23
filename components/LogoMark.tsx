"use client";

import { useId } from "react";

/**
 * The Potentiaa mark, rebuilt as clean vector.
 *
 * The supplied files in the brand folder (2.svg / 3.svg / 4.svg / potential.svg)
 * are traced JPEGs wrapped in SVG, so they blur when scaled and cannot be
 * recoloured. This is the geometry redrawn from the brand board: three
 * connected modules rising left to right - midnight, electric blue, coral -
 * welded at the corners by small joiners ("start, connect, scale").
 */
export default function LogoMark({
  className,
  title = "Potentiaa",
}: {
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");

  const g = (name: string) => `pot-${uid}-${name}`;

  return (
    <svg
      className={className}
      viewBox="0 0 114 114"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={g("m1")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--midnight-700)" />
          <stop offset="100%" stopColor="var(--midnight-900)" />
        </linearGradient>
        <linearGradient id={g("m2")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--blue-400)" />
          <stop offset="100%" stopColor="var(--blue-700)" />
        </linearGradient>
        <linearGradient id={g("m3")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--coral-400)" />
          <stop offset="100%" stopColor="var(--coral-600)" />
        </linearGradient>
        <linearGradient id={g("j1")} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--midnight-600)" />
          <stop offset="100%" stopColor="var(--blue-600)" />
        </linearGradient>
        <linearGradient id={g("j2")} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--blue-500)" />
          <stop offset="100%" stopColor="var(--coral-500)" />
        </linearGradient>
      </defs>

      {/* joiners sit under the modules so the weld reads as one shape */}
      <rect x="30" y="64" width="16" height="16" rx="5" fill={`url(#${g("j1")})`} />
      <rect x="64" y="30" width="16" height="16" rx="5" fill={`url(#${g("j2")})`} />

      <rect x="4" y="72" width="38" height="38" rx="11" fill={`url(#${g("m1")})`} />
      <rect x="38" y="38" width="38" height="38" rx="11" fill={`url(#${g("m2")})`} />
      <rect x="72" y="4" width="38" height="38" rx="11" fill={`url(#${g("m3")})`} />
    </svg>
  );
}
