"use client";

import { site } from "@/lib/site";

/**
 * Infinite trust strip. The track is duplicated once and translated by exactly
 * its own width plus the gap, so the loop is seamless.
 *
 * The chips are placeholder slots, not real client marks - design.md 6 rules
 * out stock or generated imagery, so nothing here pretends to be a logo.
 */
export default function Marquee() {
  const track = (
    <div className="marquee__track" aria-hidden="true">
      {site.trustSlots.map((label, index) => (
        <span className="marquee__slot" key={index}>
          {label}
        </span>
      ))}
    </div>
  );

  return (
    <div className="marquee">
      {track}
      {track}
    </div>
  );
}
