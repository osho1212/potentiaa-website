"use client";

import MarqueeRow from "./MarqueeRow";
import { site } from "@/lib/site";

/**
 * Infinite trust strip. The scrolling itself lives in MarqueeRow, which the
 * testimonial rows share; this owns only the chips and the fact that they are
 * placeholders.
 *
 * design.md 6 rules out stock or generated imagery, so nothing here pretends to
 * be a logo - and because the whole row is placeholder chrome rather than
 * content, it is marked decorative and stays out of the accessibility tree
 * entirely.
 */
export default function Marquee() {
  return (
    <MarqueeRow duration={32} decorative>
      {site.trustSlots.map((label, index) => (
        <span className="marquee__slot" key={index}>
          {label}
        </span>
      ))}
    </MarqueeRow>
  );
}
