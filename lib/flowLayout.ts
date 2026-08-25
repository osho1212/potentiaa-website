/**
 * Where the flow cards settle, shared by the cards and the stream that joins
 * them up.
 *
 * One module rather than a constant in each, because the two have to agree
 * EXACTLY: the stream's whole job is to draw the line running through the
 * cards, and a copy of this arithmetic that drifted by even a few pixels would
 * put the line beside the nodes instead of through them.
 */

/**
 * The glass panel's inset, as fractions of the pinned layer (the viewport).
 *
 * MUST MATCH .flow-stage__panel in globals.css. The seats below are derived
 * from these rather than being positioned independently, because a card whose
 * corner hangs outside the glass is the one thing this layout may not do.
 *
 * `top` is NOT a fraction any more and is not listed here. The panel's top edge
 * is `--below-header` - a fixed px calc, because what it has to clear is the
 * fixed header pill, whose height does not scale with the viewport. Nothing in
 * this file reads it: the seats start at BAND_TOP, half a viewport down, so the
 * top edge cannot constrain them. Left, right and bottom still can, and still
 * do.
 */
export const PANEL = { left: 0.03, right: 0.03, bottom: 0.04 };

/**
 * Where the flow's band starts, below the section's header copy.
 *
 * The copy runs to roughly 44% of the viewport at the tightest supported
 * size; this leaves clearance under it.
 */
const BAND_TOP = 0.5;

/** Breathing room between a card's edge and the glass it sits on. */
const INSET = 18;

/**
 * The cube box in resting hero orbit.
 * Compact 3D isometric glass cube aspect ratio.
 */
export const CUBE = { w: 58, h: 58, radius: 16 };

/**
 * The card box. Uniform across all six, which is both the right look for a
 * row of stations and what makes containment provable: the seat inset below
 * is half of this, so every card's full extent is inside the panel by
 * construction rather than by having been eyeballed at one viewport size.
 *
 * GlassSurface needs explicit pixel dimensions too - it builds its
 * displacement map from them - so a fixed box is required either way.
 */
export const CARD = { w: 196, h: 76, radius: 14 };

/**
 * Live positioned card state for particle trails and stream coalescence.
 */
export interface LiveCardState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  k: number; // 0..1 morph progress for this card
  tint: number; // 0..1 ramp index
  active: boolean;
}

/**
 * The staircase's corners, in the pinned layer's pixels.
 *
 * Rises left to right because the sequence rises - the enquiry enters at the
 * bottom and the answer is wanted at the top.
 */
function bounds(pinW: number, pinH: number) {
  const padX = CARD.w / 2 + INSET;
  const padY = CARD.h / 2 + INSET;
  return {
    xMin: PANEL.left * pinW + padX,
    xMax: (1 - PANEL.right) * pinW - padX,
    // yMax is the FIRST seat (lowest on screen), yMin the last.
    yMax: (1 - PANEL.bottom) * pinH - padY,
    yMin: BAND_TOP * pinH + padY,
  };
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Seat `i` of `count`, in the pinned layer's own pixels.
 *
 * Guaranteed to sit fully inside the glass: the band it interpolates across
 * is already inset by half a card plus a margin, so the card's own extent
 * cannot reach the panel's edge at any viewport size.
 */
export function seatAt(i: number, count: number, pinW: number, pinH: number): Point {
  const k = count > 1 ? i / (count - 1) : 0;
  const b = bounds(pinW, pinH);
  // A very narrow viewport can invert the band; collapsing to the centre keeps
  // the cards inside rather than letting them cross over.
  const x = b.xMax > b.xMin ? b.xMin + (b.xMax - b.xMin) * k : pinW / 2;
  const y = b.yMax > b.yMin ? b.yMax + (b.yMin - b.yMax) * k : pinH / 2;
  return { x, y };
}

/**
 * A point `u` (0..1) of the way along the line through every seat.
 *
 * The seats are evenly spaced by construction, so segment length is uniform
 * and the walk is a straight index-and-fraction rather than an arc-length
 * search - which matters because the stream calls this once per particle per
 * frame.
 */
export function pathAt(u: number, count: number, pinW: number, pinH: number): Point {
  const segments = Math.max(1, count - 1);
  const clamped = u <= 0 ? 0 : u >= 1 ? 1 : u;
  const scaled = clamped * segments;
  const i = Math.min(segments - 1, Math.floor(scaled));
  const f = scaled - i;
  const a = seatAt(i, count, pinW, pinH);
  const b = seatAt(i + 1, count, pinW, pinH);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

/**
 * How close `u` sits to the nearest seat, 0 at a seat and 1 midway between two.
 *
 * The stream reads this to pull in and brighten at the nodes and spread out
 * between them, which is what makes the line read as connected STATIONS rather
 * than as an even pipe of dust.
 */
export function nodeProximity(u: number, count: number): number {
  const segments = Math.max(1, count - 1);
  const scaled = u * segments;
  const distance = Math.abs(scaled - Math.round(scaled));
  return Math.min(1, distance * 2);
}
