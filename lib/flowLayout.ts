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
export function panelInsetPx(pinW: number): number {
  if (pinW >= 1280) return 100;
  if (pinW >= 1024) return Math.max(40, Math.min(pinW * 0.06, 80));
  return Math.max(16, Math.min(pinW * 0.04, 32));
}

export const PANEL = { bottom: 0.04 };

/**
 * Where the flow's band starts, below the section's header copy.
 *
 * The copy runs to roughly 44% of the viewport at the tightest supported
 * size; this leaves clearance under it.
 */
const BAND_TOP = 0.5;

/**
 * Where the column starts on a phone: a PIXEL reserve, not a fraction.
 *
 * The heading and body are on the glass here too, stacked above the flow rather
 * than beside it, so the column starts under them. The first version of this
 * took a fraction of the viewport - and that is the wrong shape for the thing
 * being cleared. The copy is roughly a fixed 320px tall whatever the screen
 * height is; a fraction gives it too little on a short phone and too much on a
 * tall one. Measured: 0.46 reserved 261px on a 568px screen for copy that
 * needed 323, and the first card landed on the last two lines of the body.
 *
 * So: at least enough for the copy, at most 400px, and free to sit between the
 * two on the screens where a fraction happens to be the better answer.
 */
function bandTop(pinH: number): number {
  return Math.max(285, Math.min(0.36 * pinH, 315));
}

function columnMetrics(pinH: number) {
  const top = bandTop(pinH);
  const bottom = (1 - PANEL.bottom) * pinH - INSET - 16;
  const available = Math.max(280, bottom - top);

  // Spacing centre to centre across the 6 stations
  const h = CUBE.h;
  const spacing = (available - h) / 5;

  return { top, h, spacing };
}

/** Breathing room between a card's edge and the glass it sits on. */
export const INSET = 12;

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
 * GlassSurface needs explicit pixel dimensions too - so a fixed box is required.
 */
export const CARD = { w: 196, h: 76, radius: 14 };

/**
 * Below this the staircase becomes a column. Matches the 767px breakpoint in
 * globals.css - the same moment the two-up layouts stop fitting side by side.
 * Read off the PIN width rather than the window so the cards and the stream
 * cannot disagree: both are handed the same pin box.
 */
const NARROW = 768;

export function isNarrow(pinW: number): boolean {
  return pinW < NARROW;
}

/**
 * The card box, wide vs narrow.
 */
export function cardBox(pinW: number, pinH: number) {
  if (!isNarrow(pinW)) return CARD;
  const { h } = columnMetrics(pinH);
  const insetX = panelInsetPx(pinW);
  const usable = pinW - insetX * 2 - INSET * 2;
  return { w: Math.min(CARD.w, usable), h, radius: 12 };
}


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
  const insetX = panelInsetPx(pinW);
  const padX = CUBE.w / 2 + INSET + 40;
  const padY = CUBE.h / 2 + INSET + 50;
  return {
    xMin: insetX + padX,
    xMax: pinW - insetX - padX,
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

  /**
   * A COLUMN, NOT A STAIRCASE, once there is no width to rise across.
   *
   * The desktop seats rise left to right because the sequence rises. A phone
   * has no left to right to spend, so the same sequence is spent downwards -
   * and the direction flips with it: 01 sits at the TOP here, because a column
   * on a phone is read top to bottom, and a first step at the bottom would be
   * read last. The staircase keeps its own direction; this is the same six
   * steps in the order the medium reads them.
   *
   * Written here rather than in the cards, so the stream that joins them up
   * follows without knowing anything about it - which is the reason this
   * module exists.
   */
  if (isNarrow(pinW)) {
    const insetX = panelInsetPx(pinW);
    const { top, h, spacing } = columnMetrics(pinH);
    // Staircase trajectory: 01 Customer at top-left, 06 Owner at bottom-right
    const xMin = insetX + INSET + CUBE.w / 2 + 10;
    const xMax = pinW - insetX - INSET - CUBE.w / 2 - 10;
    const x = xMax > xMin ? xMin + (xMax - xMin) * k : pinW / 2;

    return { x, y: top + h / 2 + spacing * i };
  }

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
