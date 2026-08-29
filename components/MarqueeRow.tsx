"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * One self-scrolling row. The track is rendered twice and translated by exactly
 * its own width plus one gap, so the second copy arrives where the first left
 * and the loop has no seam.
 *
 * Extracted from the trust strip rather than written beside it. That strip had
 * the technique hardcoded to one content type, and the testimonial rows need
 * the same mechanic at a different duration and direction - two copies of a
 * seam-free marquee is the kind of duplication that drifts apart the first time
 * only one of them gets fixed.
 *
 * WHAT `decorative` IS FOR, because the two callers genuinely differ.
 *
 * A marquee duplicates its content, so something has to be hidden or a screen
 * reader reads the whole list twice. Hiding the clone and keeping the original
 * is right when the content is words worth hearing - a testimonial is. Hiding
 * BOTH is right when the row carries placeholder chrome, which is what the
 * trust strip is until real client marks land: announcing "Client logo" six
 * times is noise, and announcing it twelve times is worse.
 */
export default function MarqueeRow({
  children,
  /** Seconds for one full pass. Longer reads calmer. */
  duration = 32,
  /** Right-to-left by default; `reverse` runs it the other way. */
  reverse = false,
  /** Hide BOTH tracks from assistive tech - see the note above. */
  decorative = false,
  className = "",
}: {
  children: ReactNode;
  duration?: number;
  reverse?: boolean;
  decorative?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`marquee ${reverse ? "marquee--reverse" : ""} ${className}`.trim()}
      style={{ "--marquee-duration": `${duration}s` } as CSSProperties}
      aria-hidden={decorative || undefined}
    >
      <div className="marquee__track">{children}</div>
      {/* The clone. Always hidden: it is the same words a second time. */}
      <div className="marquee__track" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
