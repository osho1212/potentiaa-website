/**
 * THE ENERGY FIELD - geometry and palette for the filaments around the mark.
 *
 * STREAMLINES OF A SWEEP PAST A COUNTER-ROTATING PAIR, built to the owner's
 * video reference. Nothing here is a formula for a curve. There is a velocity
 * field - one direction of travel, a vortex on each module turning opposite
 * ways, and a slight pull toward or away from the stack - and every strand is
 * the path a particle takes through it, integrated from a seed point upstream.
 *
 * THE SHAPE, which is the part that took the longest to get right. Lifting the
 * video's shadows shows the skeleton plainly: a strand arrives from off-frame
 * almost straight, bends hard as it comes past the modules, and straightens out
 * again on the way out. The long approach and the long exit are what make the
 * bend read as a bend; strands that are all corner read as scribble. And which
 * WAY a strand bends depends on which side of the pair it passes - caught by
 * the top module's circulation it goes up and over, caught by the lower one it
 * goes down and under, and threading between them it gets the S. That variety
 * is the reference's texture, and it is why the pair has to counter-rotate:
 * same-sign vortices turn everything the same way and the weave disappears.
 *
 * The road here, because each wrong turn rules something out:
 *
 *   - circles about a single centre. The flow just went round and the object
 *     sat in the middle of a hoop;
 *   - figures of eight about a single centre. Every stream crossed at the SAME
 *     point, so density piled up along one diagonal;
 *   - a vortex pair of loops, lemniscates and enclosing sweeps. It distributed
 *     properly, but everything in it is a CLOSED curve, so light runs laps and
 *     the field reads as a tangle rather than as flow;
 *   - a sheared helix of open arcs. Open was right; parameterised on distance
 *     along an axis it came out as a straight radiating starburst;
 *   - a spiral convergent-divergent field, seeded all round the compass. This
 *     one is worth remembering because the evidence pointed at it: block-matching
 *     optical flow over the video shows motion vectors around the modules going
 *     every way at once, which looks like rays in and out. Rendered, it is a
 *     pinwheel - nothing like the reference. The vectors point every way because
 *     light travels ALONG strands that wrap the object, not because the strands
 *     themselves radiate;
 *   - one big elliptical circulation wrapped around the stack. Closer, and the
 *     right instinct about the envelope, but streamlines of a single swirl are
 *     concentric by construction: however the ellipse is stretched it comes out
 *     as nested rings around a whirlpool, and the reference has no such centre.
 *
 * Integration earns its keep because the things the reference does are
 * properties of a flow, not shapes to be drawn. Strands arrive, bend, and
 * leave, because a streamline has no reason to close. They travel in
 * near-parallel BUNDLES that behave like combed sheets, because two particles
 * seeded next to each other stay next to each other. They bunch where the flow
 * tightens and thin where it opens out, by continuity rather than by a taper
 * someone tuned. And crossings happen between bundles and never inside one,
 * which is what stops density becoming wool.
 *
 * The strands themselves never move. What reads as motion is light travelling
 * along them and dust riding them; the paths are integrated once, at build. That
 * is not a shortcut - it is what the reference does. Averaging forty frames of
 * it keeps 92% of a single frame's contrast, which is only possible if the
 * skeleton is standing still.
 */

import {
  FIELD_DATA,
  FIELD_SAMPLES,
  FIELD_SCALE,
  FIELD_STRANDS,
} from "./heroFieldData";

const TAU = Math.PI * 2;

/**
 * The two module anchors, in units of the artwork's half-width, with the
 * artwork's centre at the origin and +y upward.
 *
 * Read off the owner's own render: one at the weld between the middle and top
 * modules, one over the lower module. The local vortices sit on these, and so
 * does the lighting - see moduleGlow.
 */
export const MODULE_A: readonly [number, number] = [0.18, 0.54];
export const MODULE_B: readonly [number, number] = [-0.3, -0.56];

/**
 * Which way the flow runs, radians, +y up. THE ROTATION KNOB - turn this and
 * the whole field turns with it, because everything else is seeded off it.
 *
 * Set by measuring the reference rather than by choosing. The video's band runs
 * from the lower left up to the right at close to +30 degrees, hugging the
 * stack's diagonal, with real darkness above and below it - so that is where
 * this sits.
 *
 * Two neighbours were built and compared against a frame of the video side by
 * side, and both are worse in ways worth recording. Near level (-0.1) the band
 * stops following the stack and the composition flattens into a curtain drawn
 * across the modules. Up at the stack's own 66 degrees the strands run
 * ALONGSIDE the cubes instead of across them, and the wrap disappears because
 * nothing ever has to get past anything.
 */
const DRIFT = 0.52;
const DRIFT_X = Math.cos(DRIFT);
const DRIFT_Y = Math.sin(DRIFT);

/**
 * The per-module vortices: centre, circulation, core radius.
 *
 * Opposite signs, so streamlines S-bend as they thread between the two modules
 * instead of all orbiting the same way. Same-sign vortices just make everything
 * turn together and the weave through the middle of the stack disappears.
 *
 * Strong enough to dominate the drift within about a unit of a module, which is
 * what makes a strand visibly duck around a cube rather than bend politely near
 * it, and weak enough that nothing gets captured into an orbit.
 */
const VORTICES: ReadonlyArray<readonly [number, number, number, number]> = [
  [MODULE_A[0], MODULE_A[1], 1.35, 0.54],
  [MODULE_B[0], MODULE_B[1], -1.25, 0.56],
  [1.05, -0.9, 0.42, 1.05],
];

/** Where the circulation is centred: the middle of the stack. */
const CX = (MODULE_A[0] + MODULE_B[0]) / 2;
const CY = (MODULE_A[1] + MODULE_B[1]) / 2;

/** How far upstream of the stack the seeds are laid. */
const SEED_BACK = 2.5;

/**
 * Half-width of the seed line, across the sweep.
 *
 * Narrow on purpose. The reference is not an evenly filled rectangle of light -
 * it is a BAND through the stack with real darkness above and below it, and the
 * darkness is as much of the composition as the band. Seeding wide fills the
 * corners and the whole thing flattens into a curtain.
 */
const SEED_SPREAD = 1.75;

/**
 * How hard a bundle is drawn toward the stack, or pushed away from it.
 *
 * Small, and signed per bundle. It is what the owner saw as rays moving in AND
 * out of the central structure - but enough of it to notice on its own turns
 * the sweep into a whirlpool, so it stays a perturbation.
 */
const RADIAL = 0.09;

/**
 * Total arc length of a strand, in artwork half-widths.
 *
 * Generous, and that is the shape note. A reference strand arrives from
 * off-frame almost straight, bends hard as it comes past the modules, and
 * straightens out again on the way out - the long approach and the long exit
 * are what make the bend in the middle read as a bend rather than as the whole
 * curve. Short strands are all corner.
 */
const ARC = 6.4;



/**
 * Stream colours: blues, then coral reds. Nothing in between.
 *
 * The owner's call, and it is a real constraint rather than a preference -
 * these are the two colours in the render itself, and a field that wanders
 * through violet and magenta on its way between them is introducing a hue the
 * artwork does not contain.
 *
 * So the ramp is TWO ramps. A strand's colour drifts along the reference the
 * way the video's do, but only ever within its own family: a blue strand runs
 * through blues, a coral one through corals, and no strand crosses the gap.
 */
const PALETTE: Array<[number, number, number]> = [
  [12, 36, 160],
  [18, 54, 200],
  [30, 80, 220],
  [50, 115, 235],
  [255, 92, 74],
  [255, 124, 96],
  [255, 158, 130],
];

/** Index ranges of the two families in PALETTE. */
const BLUE_LAST = 3;
const CORAL_FIRST = 4;
const CORAL_LAST = 6;

/** Size classes a dust mote can be drawn at. See the note on `motes`. */
export const enum Mote {
  /** A pinpoint. Most of them. */
  Fine = 0,
  /** A visible grain with a small halo. */
  Grain = 1,
  /** An out-of-focus disc - the near ones. */
  Bokeh = 2,
}

export type Strand = {
  /** Which bundle it belongs to. Strands in a bundle were seeded side by side. */
  bundle: number;
  /**
   * The integrated path: x, y, depth per sample.
   *
   * Baked at build rather than evaluated on demand, because a streamline has no
   * closed form - point 40 is only knowable by having walked points 0 to 39.
   */
  path: Float32Array;
  /** How fast light runs the strand, lengths per second, and where it starts. */
  flow: number;
  phase: number;
  /** Resting line alpha. */
  base: number;
  /**
   * INDEX into the palette at the head of the strand, and at the tail.
   *
   * Two of them because the reference shifts colour ALONG a strand. The renderer
   * walks between these and bins each segment by the index it lands on, so it
   * needs small integers it can use as bucket keys rather than a colour it would
   * have to rebuild from three floats tens of thousands of times a frame.
   */
  colour: number;
  colourEnd: number;
  /** Number of light heads travelling this strand at once. */
  heads: number;
  /**
   * Dust riding the strand: three floats each - where it sits along the strand,
   * which size class it is, and how bright.
   *
   * Flat rather than an array of objects because the renderer walks this once
   * per strand per frame and an object per mote is an allocation per mote.
   */
  motes: Float32Array;
};

/** Deterministic pseudo-random, so the field is identical on every load. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * The velocity at a point, normalised to unit length.
 *
 * `dir` is +1 for a strand running outward and -1 for one running in. It is a
 * property of the STRAND rather than of the field, which is why this takes it as
 * an argument: the two families share one swirl and travel through it in
 * opposite directions, and that is exactly the in-and-out the reference has.
 *
 * Normalised so one step always covers the same arc length, which keeps samples
 * evenly spaced along every strand however fast the flow is where it happens to
 * be. The renderer relies on that - it treats sample index as distance when it
 * works out how far behind a light head a segment sits, and uneven spacing would
 * make the light stretch and bunch as it travelled.
 */
function velocity(
  x: number,
  y: number,
  dir: number,
  out: { x: number; y: number; curl: number },
) {
  // THE SWEEP. One direction of travel for the whole field, which is what makes
  // a strand arrive from off-frame and leave again rather than circling.
  //
  // A single circulation centre was tried here and does not work: streamlines
  // of one swirl are concentric by construction, so however the ellipse is
  // stretched the field comes out as a set of nested rings around a whirlpool.
  // The reference has no centre like that. What it has is strands bending
  // DIFFERENT WAYS as they pass - over the top of the stack, under the bottom -
  // and that is a pair of counter-rotating cells sitting in a sweep.
  let vx = DRIFT_X;
  let vy = DRIFT_Y;
  let curl = 0;

  // A gentle pull toward the stack or away from it, signed per bundle. Small:
  // it is what the owner saw as rays moving in and out, and enough of it to
  // notice is enough to turn the sweep back into a whirlpool.
  const dx = x - CX;
  const dy = y - CY;
  const r = Math.hypot(dx, dy) || 1e-4;
  const march = (dir * RADIAL * r) / (r + 0.55);
  vx += (dx / r) * march;
  vy += (dy / r) * march;

  // The modules' own vortices - the wrap, and the whole of the curve's
  // character. These are what bend a strand hard as it comes past a cube and
  // let it straighten out again once it is clear.
  for (let i = 0; i < VORTICES.length; i += 1) {
    const [vcx, vcy, g, core] = VORTICES[i];
    const bx = x - vcx;
    const by = y - vcy;
    const b2 = bx * bx + by * by;
    // Rankine: solid-body rotation inside the core, falling away as 1/r
    // outside it. A bare 1/r blows up at the centre and throws any streamline
    // that gets close.
    const f = g / (b2 + core * core);
    vx -= by * f;
    vy += bx * f;
    // How strongly this point is inside a vortex at all. Drives how fast a
    // strand rolls through depth - see the integration in buildField.
    curl += (core * core) / (b2 + core * core);
  }

  const len = Math.hypot(vx, vy) || 1;
  out.x = vx / len;
  out.y = vy / len;
  out.curl = curl;
}

/**
 * How far the traced field is pulled in toward the middle.
 *
 * The video is a wide landscape frame in which the cubes are a small part of
 * the picture and the strands sweep well past them. This hero's field is a
 * near-square box only 1.8 times the artwork, and the artwork fills most of it.
 * Warped at true scale, most of the traced composition therefore lands outside
 * the visible area and what is left inside is the occlusion gap behind the
 * modules - a lot of measured filament, almost none of it on screen.
 *
 * Shrinking trades exact module alignment for showing more of the sweep. The
 * wrap ends up slightly tighter than the artwork's own cubes, but the cubes are
 * opaque and cover that region anyway, so what is lost is hidden and what is
 * gained is visible.
 */
const SHRINK = 1.0;

/**
 * Builds the field, by unpacking the strands traced off the reference video.
 *
 * NOT GENERATED HERE ANY MORE. Everything above this - the sweep, the vortex
 * pair, the integrator - built strands that behaved like the reference's
 * without being the reference's, and three rounds of tuning against the video
 * did not close the gap. What closed it was measuring the video instead of
 * imitating it: ridge detection over a frame finds the centreline of every
 * filament in it, and lib/heroFieldData is the result, warped 17 degrees onto
 * this artwork's module axis. See public/__trace.html for the tracer.
 *
 * So the SHAPE is no longer a guess. What is still generated is everything the
 * trace cannot know, because a single still frame does not contain it:
 *
 *   - DEPTH. A traced strand is flat. The roll below carries it from behind the
 *     artwork to in front of it and back, and rolls faster near the modules, so
 *     the crossing happens where the reference shows it happening;
 *   - the travelling light, its speed and phase;
 *   - the dust riding each strand;
 *   - the colour RAMP. The trace fixes each strand's family - blue or coral,
 *     sampled from the video - and the drift along its length is filled in
 *     within that family.
 *
 * The velocity field above is kept deliberately. It is what the depth roll's
 * `curl` term reads, and it is the fallback if the traced data is ever absent.
 *
 * INFILL, added afterward. The owner marked the ring immediately around the
 * stack and asked for it denser, with the extra density carrying on inward -
 * and the trace cannot supply that by itself, because it has exactly as many
 * strands as the video frame happened to show. Rather than invent new curves,
 * a strand already passing close to the stack is CLONED and pulled toward the
 * stack's own centre - a fixed fraction of the way from where it is to (CX,
 * CY) at every sample. The clone is still a measured shape, just nested one
 * ring further in, which is what "denser, moving inward" asked for without
 * drawing anything that was not in the reference to begin with.
 */

/**
 * How close a strand's midpoint has to be to the stack to earn infill.
 *
 * Held fairly high on purpose. The first pass at this used 0.42 and it
 * qualified most of the field - the cost of a frame is proportional to
 * strand count, and that one number took it from 24ms to 42ms for a density
 * gain that only reads clearly in the last third, right at the stack. Higher
 * spends the extra strands where they are seen.
 */
const INFILL_NEAR = 2;

/**
 * Extra strands per qualifying original: how far each is pulled toward centre,
 * and the WIDEST it may then be swung about the centre, by proximity.
 *
 * Pull alone was the first version, and it under-served the gaps the owner
 * circled - places beside the existing strands rather than beyond them, which
 * a purely radial clone can never reach because it rides the same angle as the
 * strand it came from. Swinging each clone about the stack's own centre after
 * pulling it in carries it sideways instead, still as a copy of a real
 * measured strand, just moved to an angle the trace did not happen to leave
 * one at.
 *
 * The angle is now a RANGE, drawn per clone, rather than one fixed degree per
 * slot. A fixed angle aims at whichever gap happened to be marked at the time
 * it was chosen and nothing else - the very next request circled a DIFFERENT
 * gap the same fixed swing could not reach, because there was no strand near
 * there to begin with and 16 or 20 degrees of nudge is not enough to cross to
 * it. Drawing the swing at random up to a wide maximum spreads the clones
 * around the whole ring instead of toward one rehearsed spot, so the next
 * gap that gets marked is more likely to already have something in it.
 *
 * The clone count is unchanged from the pull-only version, so this does not
 * cost more than the density pass already did.
 */
const INFILL: ReadonlyArray<readonly [number, readonly (readonly [number, number])[]]> = [
  [0.58, [[0.3, 55]]],
  [0.82, [
    [0.24, 70],
    [0.46, 85],
  ]],
];

/**
 * THE TRANSPLANT PASS - filling a hole the infill above structurally cannot.
 *
 * Every clone the infill makes is pulled TOWARD the stack, so it can only ever
 * land somewhere between its source strand and the centre. That is the right
 * behaviour for thickening the ring around the modules, and it is why two
 * successive attempts to fill the pocket east of the stack failed: the pocket
 * is OUTSIDE most of the field, and no amount of widening the swing angle
 * reaches outward.
 *
 * So this pass measures instead of guessing. Rendering the field and sampling
 * a 34x36 occupancy grid over it, the marked pocket came back 34% dark - 92
 * cells of 270 - and those dark cells sit at 1.0 to 2.0 units from the field
 * centre, between about -5 and +50 degrees. Those numbers are these constants.
 *
 * The move is a POLAR REMAP rather than a translation. A strand is carried to
 * the target by rotating it about the field centre and scaling its distance
 * from that centre, which keeps it tangential to the same swirl everything
 * else follows - translating it bodily would drop a curve into the pocket
 * pointing across the flow instead of along it, and it would read as debris.
 * The shape is still a measured one; only where it sits on the swirl changes.
 */
const TRANSPLANT_COUNT = 0;
const TRANSPLANT_R = [1.05, 2.0] as const;
const TRANSPLANT_ANGLE = [(-6 * Math.PI) / 180, (52 * Math.PI) / 180] as const;

/** Radius band a strand must sit in to be worth transplanting. */
const TRANSPLANT_SOURCE_R = [0.7, 2.3] as const;

/**
 * How much of the field to push toward coral.
 *
 * The trace fixes each strand's family from the video, and only 9.6% of the
 * baked strands came out coral - the reference itself is that blue-heavy. The
 * owner asked for 20% more, read as PERCENTAGE POINTS of the whole field
 * rather than 20% of that already-small slice, which would have been three
 * strands and no visible change at all. Applied by flipping a fraction of the
 * BLUE strands to coral rather than by touching the corals already there, so
 * this only ever adds warmth, never removes it: solving
 * 0.096 + p*(1-0.096) = 0.296 for p gives the constant below.
 */
const CORAL_BOOST = 0.11;

export function buildField(count: number, samples: number): Strand[] {
  const random = rng(20260822);
  const strands: Strand[] = [];

  // Unpack: one leading int for the colour family, then x,y pairs at 1/4096 of
  // a unit. See the header of lib/heroFieldData.
  const raw = atob(FIELD_DATA);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  const packed = new Int16Array(bytes.buffer);
  const stride = 1 + FIELD_SAMPLES * 2;

  // The traced strands are stored longest-first. Taking the first `count` of
  // them thins the field by dropping the shortest, which is the right end to
  // lose: the long sweeps carry the composition.
  const take = Math.min(FIELD_STRANDS, Math.max(1, count));

  const point = { x: 0, y: 0, curl: 0 };

  // Emits one strand from a set of already-resampled, already-pulled x,y
  // samples. Depth, colour, motes and timing are all generated here, which is
  // why both the traced original and its inward clones go through this rather
  // than each building a Strand literal of their own.
  const emit = (rawXY: Float32Array, coral: boolean) => {
    const path = new Float32Array(samples * 3);
    const rollRate = 0.5 + random() * 0.45;
    const amp = 0.55 + random() * 0.75;
    let roll = random() * TAU;
    let prevX = 0;
    let prevY = 0;

    for (let i = 0; i < samples; i += 1) {
      const x = rawXY[i * 2];
      const y = rawXY[i * 2 + 1];
      path[i * 3] = x;
      path[i * 3 + 1] = y;
      // DEPTH, which the trace cannot supply - a frame is flat. The strand
      // rolls about its own direction of travel and rolls FASTER where the
      // flow curls, so the crossing from behind the artwork to in front of it
      // happens at the modules, which is where the reference does it and the
      // only place it reads as wrapping.
      path[i * 3 + 2] = amp * Math.sin(roll);

      if (i > 0) {
        const step = Math.hypot(x - prevX, y - prevY);
        velocity(x, y, 1, point);
        roll += step * rollRate * (0.35 + 2.1 * point.curl);
      }
      prevX = x;
      prevY = y;
    }

    // How close this strand runs to the stack, for the brightness falloff.
    // Recomputed from its OWN midpoint rather than passed in, so an inward
    // clone - sitting closer to the modules than the strand it came from - is
    // brighter accordingly, with no separate bookkeeping for it.
    const midI = samples >> 1;
    const near = 1 - clamp(Math.hypot(rawXY[midI * 2] - CX, rawXY[midI * 2 + 1] - CY) / 2.4, 0, 1);

    // Colour: the family comes from the trace, the drift along the strand is
    // filled in within that family. No strand crosses the gap between them.
    const lo = coral ? CORAL_FIRST : 0;
    const hi = coral ? CORAL_LAST : BLUE_LAST;
    const head = lo + Math.floor(random() * (hi - lo + 1));
    const tail = clamp(
      head + (random() < 0.5 ? -1 : 1) * (1 + Math.floor(random() * 2)),
      lo,
      hi,
    );

    const moteCount = 4 + Math.floor(random() * 6);
    const motes = new Float32Array(moteCount * 3);
    for (let m = 0; m < moteCount; m += 1) {
      const roll2 = random();
      motes[m * 3] = random();
      motes[m * 3 + 1] =
        roll2 < 0.72 ? Mote.Fine : roll2 < 0.94 ? Mote.Grain : Mote.Bokeh;
      motes[m * 3 + 2] = 0.45 + random() * 0.75;
    }

    strands.push({
      bundle: strands.length % 24,
      path,
      flow: 0.03 + random() * 0.07,
      phase: random(),
      // High enough that the WHOLE strand is visible at rest, not just the lit
      // part - a filament has to be a filament when nothing is running along
      // it. Falls away with distance from the stack, because the reference's
      // contrast is most of its drama.
      // Measured against the still rather than chosen. Cropped to the same
      // framing the reference uses, the two matched at the mean (20.7 against
      // 19.9) but not in SHAPE: the reference ran 8 / 18.7 / 44.7 through its
      // p50 / p75 / p90 while this ran 16 / 16 / 21.3 - the same average light
      // spread flat instead of concentrated into filaments. Brightening the
      // strands lifts the top of that curve without moving the median, which
      // is the part of the gap this can actually close.
      base: (0.15 + random() * 0.17) * (0.45 + 1.0 * near),
      colour: head,
      colourEnd: tail,
      heads: 1 + Math.floor(random() * 2),
      motes,
    });

    return near;
  };

  const rawXY = new Float32Array(samples * 2);
  const pulled = new Float32Array(samples * 2);

  /** Strands worth remapping into the empty pocket - see TRANSPLANT_COUNT. */
  const pool: { xy: Float32Array; r: number; a: number; coral: boolean }[] = [];

  for (let s = 0; s < take; s += 1) {
    const at = s * stride;
    // See CORAL_BOOST: a blue strand from the trace has an extra, independent
    // chance to be recoloured. Corals from the trace are never touched, so
    // this only ever adds warmth.
    const coral = packed[at] === 1 || random() < CORAL_BOOST;

    // Resample the trace onto whatever sample count the renderer wants. The
    // stored points are already evenly spaced along the strand, so this is a
    // straight linear read - and at equal counts it is a copy.
    for (let i = 0; i < samples; i += 1) {
      const u = (i / (samples - 1)) * (FIELD_SAMPLES - 1);
      const k = Math.min(FIELD_SAMPLES - 2, u | 0);
      const f = u - k;
      const a = at + 1 + k * 2;
      rawXY[i * 2] = ((packed[a] + (packed[a + 2] - packed[a]) * f) / FIELD_SCALE) * SHRINK;
      rawXY[i * 2 + 1] =
        ((packed[a + 1] + (packed[a + 3] - packed[a + 1]) * f) / FIELD_SCALE) * SHRINK;
    }

    const near = emit(rawXY, coral);

    // Keep a copy if this strand sits at a radius worth remapping. Recorded in
    // polar about the field centre, because the transplant works in polar.
    {
      const midI = samples >> 1;
      const dx = rawXY[midI * 2] - CX;
      const dy = rawXY[midI * 2 + 1] - CY;
      const r = Math.hypot(dx, dy);
      if (r >= TRANSPLANT_SOURCE_R[0] && r <= TRANSPLANT_SOURCE_R[1]) {
        pool.push({ xy: rawXY.slice(), r, a: Math.atan2(dy, dx), coral });
      }
    }

    // The infill. Only strands already passing close to the stack qualify -
    // pulling a strand from out at the rim would invent a sweep that was never
    // there. Which bracket it falls in decides how many companions it gets, how
    // far each sits from it, and which way each is swung - all three step up
    // together as the original strand gets nearer the stack, which is the
    // "denser, moving inward, filling the gaps beside it" the density needed.
    if (near >= INFILL_NEAR) {
      let plan: readonly (readonly [number, number])[] = INFILL[0][1];
      for (const [threshold, list] of INFILL) if (near >= threshold) plan = list;

      for (const [pull, maxSwingDeg] of plan) {
        // Signed, up to the bracket's maximum - see the note on INFILL.
        const rotateDeg = (random() * 2 - 1) * maxSwingDeg;
        const theta = (rotateDeg * Math.PI) / 180;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        for (let i = 0; i < samples; i += 1) {
          // Pull toward the stack first...
          const px = rawXY[i * 2] + (CX - rawXY[i * 2]) * pull;
          const py = rawXY[i * 2 + 1] + (CY - rawXY[i * 2 + 1]) * pull;
          // ...then swing the pulled point about the stack's own centre, which
          // is what carries the clone sideways into a gap the original strand
          // never reached rather than stacking it directly underneath.
          const dx = px - CX;
          const dy = py - CY;
          pulled[i * 2] = CX + dx * cosT - dy * sinT;
          pulled[i * 2 + 1] = CY + dx * sinT + dy * cosT;
        }
        emit(pulled, coral);
      }
    }
  }

  // ---- the transplant pass, into the measured pocket --------------------
  //
  // Targets are laid on a coarse spiral through the region rather than at
  // independent random points: independent draws clump and leave holes at this
  // count, which is the whole problem being solved. Walking radius and angle by
  // co-prime-ish steps covers the pocket evenly.
  if (pool.length > 0) {
    // Nearest-radius source lookup. Scaling a strand from 0.8 out to 1.9 does
    // not just move it, it stretches it to nearly twice the size and thins the
    // pocket back out; picking a source that already sits near the target
    // radius keeps the scale factor close to 1 and the strand its own size.
    const byR = pool.slice().sort((p, q) => p.r - q.r);

    for (let t = 0; t < TRANSPLANT_COUNT; t += 1) {
      const fr = (t + 0.5) / TRANSPLANT_COUNT;
      // EQUAL AREA in radius, not equal spacing. A ring at 1.9 encloses far
      // more area than one at 1.1, so spreading targets evenly along the
      // radius leaves the outer half of the pocket as sparse as it started -
      // which is exactly what the first attempt at this measured.
      const r0 = TRANSPLANT_R[0], r1 = TRANSPLANT_R[1];
      const spread = (t * 0.37) % 1;
      const targetR = Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * spread);
      const targetA =
        TRANSPLANT_ANGLE[0] + (TRANSPLANT_ANGLE[1] - TRANSPLANT_ANGLE[0]) * fr;

      const want = (targetR - byR[0].r) / (byR[byR.length - 1].r - byR[0].r || 1);
      const jitter = Math.floor((random() - 0.5) * 9);
      const idx = clamp(Math.round(want * (byR.length - 1)) + jitter, 0, byR.length - 1);
      const src = byR[idx];
      // Rotate by the angular difference, scale by the radial ratio: the strand
      // keeps its shape and its relationship to the swirl, and simply sits
      // somewhere else on it.
      const dA = targetA - src.a + (random() - 0.5) * 0.24;
      const k = (targetR / src.r) * (0.92 + random() * 0.16);
      const cosA = Math.cos(dA);
      const sinA = Math.sin(dA);

      for (let i = 0; i < samples; i += 1) {
        const dx = (src.xy[i * 2] - CX) * k;
        const dy = (src.xy[i * 2 + 1] - CY) * k;
        pulled[i * 2] = CX + dx * cosA - dy * sinA;
        pulled[i * 2 + 1] = CY + dx * sinA + dy * cosA;
      }
      emit(pulled, src.coral);
    }
  }

  return strands;
}

/**
 * How present a strand is at `t`.
 *
 * THE thing that makes these read as flow rather than as objects. A strand has
 * no ends in the reference - it thins away into black long before it stops being
 * computed - so the integration runs well past where the light does and this
 * window takes it down. Raised to two and a half rather than squared because a
 * plain sine falls off too early and leaves the corners empty.
 */
export function strandWindow(t: number): number {
  const e = Math.sin(Math.PI * t);
  if (e <= 0) return 0;
  return e * e * Math.sqrt(e);
}

/**
 * How much the modules light the field at a point.
 *
 * In the reference the modules are emissive and the strands passing near them
 * are visibly hotter for it - a filament brightens as it approaches a cube and
 * falls away again behind it. Without this the field is evenly lit end to end,
 * which is the single clearest tell that it was drawn rather than lit.
 */
export function moduleGlow(x: number, y: number): number {
  const ax = x - MODULE_A[0];
  const ay = y - MODULE_A[1];
  const bx = x - MODULE_B[0];
  const by = y - MODULE_B[1];
  const spread = 0.5;
  return (
    1 +
    0.85 *
      (Math.exp(-(ax * ax + ay * ay) / spread) +
        Math.exp(-(bx * bx + by * by) / spread))
  );
}

/** The palette, for the renderer to resolve a strand's colour against. */
export function streamPalette(): ReadonlyArray<readonly [number, number, number]> {
  return PALETTE;
}
