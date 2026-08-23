/**
 * THE MARK, as pure geometry - numbers and a distance field, nothing else.
 *
 * Split out of lib/heroModel so that BOTH renderers can share one definition of
 * the shape without sharing a renderer:
 *
 *   lib/heroModel   polygonises it with three's marching cubes, for /studio to
 *                   bake the scroll sequence from;
 *   lib/heroShader  emits the same field as GLSL, for the hero to raymarch
 *                   live.
 *
 * The split is not tidiness. heroModel imports three, and the hero runs on the
 * HOMEPAGE - importing it there would have put the whole of three.js into a
 * 21kB bundle to draw one object that never needed a scene graph.
 *
 * If the shape changes, it changes here, and both renderers follow.
 */

// ---- Proportions, in model units ---------------------------------------

/** Edge length of one module's square face. */
export const PLATE = 1.0;

/**
 * Diagonal offset to the next module, on both axes.
 *
 * This is the gap the connector has to span, so it is set with NECK rather
 * than on its own. Wide enough that the two modules clearly do not touch -
 * there is a run of open space between them and the connector is a visible
 * piece of the object, not a dimple where two corners met.
 */
export const STEP = 0.96;

/** Total thickness of the plate. */
export const DEPTH = 0.4;

/** Face corner radius. Large - this is the mark's signature. */
export const CORNER = 0.24;

/** Edge bevel rolled around the rim, front and back. */
export const BEVEL = 0.055;

/**
 * THE CONNECTOR.
 *
 * Width of the bar that joins one module to the next, across the diagonal.
 *
 * The first version had no bar. The modules were placed close enough to
 * overlap and the smooth minimum was left to bridge the gap on its own, which
 * works but gives you exactly one control: the blend radius k. And k does two
 * jobs at once - it sets how THICK the neck is and how far back along the two
 * edges the blend reaches - so they cannot be tuned apart. Asking for a
 * thinner neck gave a shorter one; asking for a longer one melted the corners
 * off both modules.
 *
 * An explicit bar separates them. NECK alone sets the thickness, STEP alone
 * sets the length, and WELD is then free to be small - just the fillet where
 * the bar meets each module.
 */
export const NECK = 0.19;

/** The connector is a touch thinner than the modules, so it reads as a neck. */
export const NECK_DEPTH = DEPTH * 0.86;

/**
 * Half-length of the bar along the rising diagonal.
 *
 * Deliberately long enough to bury its ends inside both modules. A bar that
 * merely reached the surface would leave the join depending on where exactly
 * the isosurface fell; running it to the module centres makes the connection
 * unconditional. The buried part costs nothing and is invisible - smooth-min
 * only moves a surface where two fields are within WELD of each other, and
 * deep inside a module the bar is nowhere near the module's own zero.
 */
export const NECK_REACH = (STEP * Math.SQRT2) / 2 + 0.05;

/** Corner radius on the bar's own cross-section. */
export const NECK_CORNER = 0.045;

/**
 * Weld radius - the fillet where the connector meets a module.
 *
 * Small now, and that is the whole benefit of building the connector
 * explicitly. It no longer has to be big enough to bridge anything, so it can
 * be set at the size a weld should actually be: enough to kill the crease,
 * not enough to round the modules' corners off.
 */
export const WELD = 0.11;

/** Half the model's reach on x and y - the outer corner of an end module. */
export const REACH = STEP + PLATE / 2;




/** Module centres on the rising diagonal. */
export const CENTRES: Array<[number, number]> = [
  [-STEP, -STEP],
  [0, 0],
  [STEP, STEP],
];

/** Connector centres - halfway between each neighbouring pair. */
export const JOINTS: Array<[number, number]> = [
  [-STEP / 2, -STEP / 2],
  [STEP / 2, STEP / 2],
];

// ---- The distance field -------------------------------------------------

// ---- The distance field -------------------------------------------------
//
// Ported verbatim into GLSL by lib/heroShader. Keep the two in step: they are
// the same maths written twice because one runs on the CPU to build a mesh and
// the other runs per pixel on the GPU, and there is no third form that serves
// both.

/**
 * Signed distance to one module plate.
 *
 * Built as a 2D rounded square extruded on z, then the extrusion's rim is
 * rounded by BEVEL. Doing it in two stages is what allows a big face radius on
 * a thin plate: a uniform rounded box caps its radius at half the SHORTEST
 * side, so at DEPTH 0.4 the face corners could never exceed 0.2 - under the
 * radius the mark needs. Separating the two radii removes that ceiling.
 */
export function plate(x: number, y: number, z: number, cx: number, cy: number): number {
  const px = Math.abs(x - cx) - PLATE / 2 + CORNER;
  const py = Math.abs(y - cy) - PLATE / 2 + CORNER;
  const face =
    Math.hypot(Math.max(px, 0), Math.max(py, 0)) +
    Math.min(Math.max(px, py), 0) -
    CORNER;

  const rx = face + BEVEL;
  const ry = Math.abs(z) - DEPTH / 2 + BEVEL;
  return (
    Math.min(Math.max(rx, ry), 0) +
    Math.hypot(Math.max(rx, 0), Math.max(ry, 0)) -
    BEVEL
  );
}

/**
 * Signed distance to one connector: a slim bar lying along the rising
 * diagonal, extruded and bevelled exactly like the modules so the two read as
 * the same piece of stock.
 *
 * Worked in the bar's own frame - u runs along the rise, v across it - which
 * is what keeps it a straight-sided bar rather than a rotated square that has
 * to be approximated.
 */
export function neck(x: number, y: number, z: number, cx: number, cy: number): number {
  const dx = x - cx;
  const dy = y - cy;
  const u = (dx + dy) * Math.SQRT1_2;
  const v = (dy - dx) * Math.SQRT1_2;

  const pu = Math.abs(u) - NECK_REACH + NECK_CORNER;
  const pv = Math.abs(v) - NECK / 2 + NECK_CORNER;
  const bar =
    Math.hypot(Math.max(pu, 0), Math.max(pv, 0)) +
    Math.min(Math.max(pu, pv), 0) -
    NECK_CORNER;

  const rx = bar + BEVEL;
  const ry = Math.abs(z) - NECK_DEPTH / 2 + BEVEL;
  return (
    Math.min(Math.max(rx, ry), 0) +
    Math.hypot(Math.max(rx, 0), Math.max(ry, 0)) -
    BEVEL
  );
}

/**
 * Polynomial smooth minimum (Quilez).
 *
 * A plain `min` of two distance fields gives their union with a crease along
 * the intersection. This one blends the two over a band of width `k`, which
 * produces a circular-arc fillet - the weld. It returns a value at or below
 * `min(a, b)`, which also makes it safe to sphere-trace: it never overestimates
 * the distance, so a ray stepping by it cannot tunnel through the surface.
 */
export function smoothMin(a: number, b: number, k: number): number {
  const h = Math.min(Math.max(0.5 + (0.5 * (b - a)) / k, 0), 1);
  return b + (a - b) * h - k * h * (1 - h);
}

/**
 * Signed distance to the whole welded body. Negative inside.
 *
 * Modules first, then the connectors blended in. The modules are far enough
 * apart that they contribute nothing to each other - their fields are never
 * within WELD at the surface - so every fillet in the object is a bar-to-module
 * weld, which is what the joint is supposed to be.
 */
export function bodyDistance(x: number, y: number, z: number): number {
  let d = plate(x, y, z, CENTRES[0][0], CENTRES[0][1]);
  for (let i = 1; i < CENTRES.length; i += 1) {
    d = smoothMin(d, plate(x, y, z, CENTRES[i][0], CENTRES[i][1]), WELD);
  }
  for (const [cx, cy] of JOINTS) {
    d = smoothMin(d, neck(x, y, z, cx, cy), WELD);
  }
  return d;
}

// ---- Colour -------------------------------------------------------------

/**
 * The gradient down the chain, sampled from styles/tokens.css.
 *
 * `at` runs 0 at the bottom-left module's outer corner to 1 at the top-right's,
 * measured along the rising diagonal. The stops are deliberately UNEVEN: each
 * module holds one flat brand colour across its face and the hue moves fast
 * through the necks, so the object reads as three coloured modules welded
 * together rather than as a shape someone airbrushed.
 *
 * The modules land at 0.176 / 0.500 / 0.824 and the two welds at 0.338 / 0.662,
 * which is where the transitions are placed.
 *
 * The first module sits BELOW the published midnight-700 step, which looks
 * like a palette violation and is not one. At metalness 1 a colour is
 * reflectance, not paint: the environment multiplies it and the render lands
 * roughly a stop and a half brighter than the swatch. Feeding the literal token
 * in put the first two modules at nearly the same value on screen and the
 * staircase lost its darkest end.
 *
 * magenta-500 in the second weld is not decoration. tokens.css calls it
 * "gradient-only, sampled from the logo" - blue and coral meet through magenta
 * in the brand gradient, and a straight RGB interpolation between them goes
 * through a dead mauve instead.
 */
export const GRADIENT: Array<{ at: number; hex: number }> = [
  { at: 0.0, hex: 0x061847 }, // below midnight-700 - see note
  { at: 0.2, hex: 0x0d2a78 }, // midnight-700, roughly
  { at: 0.3, hex: 0x1740cc }, // blue-600
  { at: 0.4, hex: 0x265dff }, // blue-500
  { at: 0.638, hex: 0x2f66ff },
  { at: 0.665, hex: 0xfa4592 }, // magenta-500 - the weld
  { at: 0.7, hex: 0xf8574b },
  { at: 0.8, hex: 0xff6a5b }, // coral-500
  { at: 1.0, hex: 0xff9080 }, // coral-400, opened up at the tip
];

/** sRGB byte -> linear float. Both renderers shade in linear space. */
export function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** A gradient stop's hex, unpacked into linear RGB. */
export function stopLinear(hex: number): [number, number, number] {
  return [
    toLinear((hex >> 16) & 0xff),
    toLinear((hex >> 8) & 0xff),
    toLinear(hex & 0xff),
  ];
}
