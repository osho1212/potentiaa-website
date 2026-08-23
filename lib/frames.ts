/**
 * Hero frame-sequence configuration.
 *
 * Shared contract between the generator (/studio) and the runtime player
 * (components/ModuleStack.tsx). Change FRAME_COUNT here and both sides follow,
 * but you must re-render the sequence afterwards or the player will 404.
 */

export const FRAME_COUNT = 90;

/** Square render size, in CSS px, before devicePixelRatio scaling. */
export const FRAME_SIZE = 600;

export const FRAME_DIR = "/assets/module-frames";

/** frame_0000.webp ... frame_0089.webp */
export function frameName(index: number): string {
  return `frame_${String(index).padStart(4, "0")}.webp`;
}

export function framePath(index: number): string {
  return `${FRAME_DIR}/${frameName(index)}`;
}

/**
 * Scroll waypoints for the module stack.
 *
 * `at` is progress through ONE LAP of the page (0 = top of the lap, 1 = the end
 * of it). The module eases between consecutive waypoints, so reading this array
 * top to bottom is reading the choreography down the page.
 *
 * These no longer set a POSITION. Position is the helix in ModuleStack, which
 * is a continuous parametric path - a list of fixed points could never produce
 * the weave, and every previous attempt to route a big object around the copy
 * by moving its waypoints just relocated the collision rather than removing it.
 *
 * What they set is the SHAPE of that helix as it travels down the page:
 *
 *   reach  how far off centre it swings, 0..1 of half the viewport. Wide where
 *          the page is open, tucked in where the columns are busy.
 *   scale  how big it is, before the section's own room ceiling is applied.
 *   rise   vertical bias in fractions of the viewport, negative = higher.
 *
 * Size is driven from here AND from the section under the sightline: the
 * waypoint is the intent, `room` in lib/sectionTheme.ts is what that section
 * can actually take, and the two are multiplied. Intent can ask for a large
 * module over the Work grid; room refuses, because that section gives its left
 * column to Zeal and its right to four cards.
 *
 * THE FIRST AND LAST WAYPOINT MUST MATCH.
 * The page loops, so progress 1 and progress 0 are the same moment on screen.
 * If the two differed the module would visibly jump at the seam.
 */
export type Waypoint = {
  at: number;
  /** 0..1 of half the viewport width. */
  reach: number;
  scale: number;
  /** Fractions of viewport height; negative sits higher. */
  rise: number;
};

export const WAYPOINTS: Waypoint[] = [
  // Hero: the widest, biggest pass. The band is empty and full width, so this
  // is the one place the module can be at full size in the centre of the page.
  { at: 0.0, reach: 0.30, scale: 1.15, rise: 0.0 },
  { at: 0.08, reach: 0.62, scale: 1.1, rise: -0.04 },
  // Intro: opens out as the copy narrows to two columns.
  { at: 0.2, reach: 0.9, scale: 0.95, rise: 0.02 },
  // Work and Services: the busiest sections. Swing wide and shrink, so the
  // front half of the helix passes outside the cards entirely.
  { at: 0.36, reach: 1.0, scale: 0.78, rise: 0.0 },
  { at: 0.52, reach: 1.0, scale: 0.74, rise: -0.02 },
  // Helping: the scenes are the subject here, so it gives them room.
  { at: 0.66, reach: 0.95, scale: 0.8, rise: 0.03 },
  // Process, then the CTA: the page opens up again on the way out.
  { at: 0.82, reach: 0.8, scale: 0.95, rise: 0.0 },
  { at: 0.93, reach: 0.5, scale: 1.08, rise: -0.02 },
  // Loop seam - identical to `at: 0` above.
  { at: 1.0, reach: 0.30, scale: 1.15, rise: 0.0 },
];
