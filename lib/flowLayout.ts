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
  return Math.max(310, Math.min(0.46 * pinH, 400));
}

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
 * The card box, which is not a constant on a phone.
 *
 * Wide: the fixed 196x76 above - six of those fit across a desktop panel.
 *
 * Narrow: as wide as the panel allows and only as tall as its own share of the
 * column. Height is DERIVED from the spacing rather than fixed, because a fixed
 * height is what would make six cards overlap on a short phone: the band on a
 * 568px screen is barely half the one on an 844px screen, and the same 76px box
 * cannot sit in both. Deriving it means the column tightens instead of
 * colliding, at any height, without a breakpoint per device.
 */
export function cardBox(pinW: number, pinH: number) {
  if (!isNarrow(pinW)) return CARD;
  const { h } = columnMetrics(pinH);

  /**
   * THE SAME WIDTH AS THE DESKTOP CARD, not as much as the panel allows.
   *
   * This used to stretch to min(usable, 320), which on a phone meant a card
   * far wider than anything inside it. `.hero__label-icon-badge` carries
   * `margin: auto`, so all that slack was absorbed as space BETWEEN the badge
   * and the label - the icon floating in from the left, the text pushed to the
   * right rail, and a lake of nothing in the middle. Desktop never showed it
   * because 196px is already about what the content measures.
   *
   * Holding to CARD.w fixes the internal spacing at its source rather than
   * patching the layout inside, and the width it frees up is what gives the
   * staircase below somewhere to travel.
   */
  const usable = (1 - PANEL.left - PANEL.right) * pinW - INSET * 2;
  return { w: Math.min(CARD.w, usable), h, radius: 12 };
}

/** Gap between two stacked cards. */
const COLUMN_GAP = 10;

/**
 * The column, solved so that six cards land exactly inside the band.
 *
 * SIZE IS DERIVED, NOT PICKED. The band is whatever the panel has left under
 * the copy, and that is 266px on a 568px phone against 448px on a 932px one -
 * no single card height sits in both. So the height falls out of the space: six
 * cards and five gaps share the band, capped at 56px so a tall phone gets
 * generous cards rather than absurd ones, floored at 30px so a short one stays
 * legible.
 *
 * `spacing` is then solved from the FINAL height rather than estimated ahead of
 * it, reserving half a card at each end. Skipping that is what left the last
 * card hanging a few px past the glass at every size.
 */
function columnMetrics(pinH: number) {
  const top = bandTop(pinH);
  const bottom = (1 - PANEL.bottom) * pinH - INSET;
  const available = Math.max(180, bottom - top);

  // Floor of 34 rather than 30: the icon badge inside the card is 30px on a
  // phone, and a card shorter than its own badge clips it.
  const h = Math.max(34, Math.min(56, (available - COLUMN_GAP * 5) / 6));
  // Centre to centre. First centre sits at top + h/2, last at bottom - h/2.
  const spacing = (available - h) / 5;

  return { top, h, spacing };
}

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
    const { top, h, spacing } = columnMetrics(pinH);
    const w = Math.min(CARD.w, (1 - PANEL.left - PANEL.right) * pinW - INSET * 2);

    /**
     * A STAIRCASE HERE TOO, descending rather than rising.
     *
     * The seats were a dead-centre column, which read as a list rather than a
     * journey. Now that the card no longer stretches to fill the panel there is
     * width left over, and spending it on a lateral drift gives the phone the
     * same staircase the desktop has - just running the other way, because a
     * phone is read downwards: 01 Customer at top LEFT, 06 Owner at bottom
     * RIGHT, so the enquiry still travels the full diagonal of the glass.
     *
     * The travel is whatever the card leaves behind, so it widens with the
     * screen and collapses to a straight column rather than overflowing when
     * there is nothing to spare.
     */
    const xMin = PANEL.left * pinW + INSET + w / 2;
    const xMax = (1 - PANEL.right) * pinW - INSET - w / 2;
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
