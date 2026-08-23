/*
 * UNUSED. Nothing imports this file.
 *
 * The hero object was rendered live for a while - raymarched, with the energy
 * filaments wound around it - and the owner's call is that the hero shows their
 * own render as a picture instead. See components/sections/Hero.
 *
 * Kept rather than deleted because the work is sound and the repo has no
 * version control to recover it from. It costs nothing at runtime: an unimported
 * module is not bundled. Delete the three files together - HeroObject,
 * heroShader, heroTrails - if the picture is the final answer.
 */

import {
  CAM_DISTANCE,
  DEPTH_FAR,
  DEPTH_NEAR,
  EYE,
  FRUSTUM,
} from "./heroShader";

/**
 * THE ENERGY TRAILS.
 *
 * Long glowing filaments winding around the mark, with light running along
 * them - the object reading as something with current in it rather than a
 * still life.
 *
 * They are RIBBONS, not lines. `gl_LineWidth` is clamped to 1 on essentially
 * every desktop GL implementation, so a line-based version is a hairline you
 * cannot thicken, cannot taper and cannot give a soft core to. Each trail is
 * built as a triangle strip whose two edges are pushed apart in SCREEN space by
 * the vertex shader, which keeps the width constant in pixels no matter how far
 * the filament is from the camera - the thing a glow has to do to look like
 * light rather than like tube.
 *
 * They share the raymarcher's camera and its depth mapping, so they sort
 * against the body correctly: a filament passing behind the middle module is
 * hidden by it and comes out the other side. That is the entire reason the
 * hero canvas has a depth buffer.
 *
 * Geometry is built once on the CPU. The flow is a shader-side function of
 * time, so nothing is re-uploaded per frame.
 */

/** Filaments. Each is one continuous helix around the chain's long axis. */
const TRAIL_COUNT = 13;

/** Look-ahead used to give every vertex a forward direction. See buildTrails. */
const LOOKAHEAD = 1e-3;

/** Samples along each filament. Enough that the curvature reads as smooth. */
const SEGMENTS = 150;

/**
 * Half-width of a ribbon, in NDC.
 *
 * Wide, on purpose. The first pass at this was 0.007 - about three pixels -
 * on the reasoning that a filament is a thin thing. It read as wireframe: a
 * hairline has no room for a falloff, so there is no glow, only a drawn stroke.
 * A glow needs a hot core AND a soft shoulder, and the shoulder is most of the
 * width. The visible bright line is still thin; it is the falloff either side
 * of it that makes it light.
 */
const RIBBON_WIDTH = 0.011;

/**
 * Per-filament character.
 *
 * `radius` how far it orbits from the chain's axis, in model units. Under
 *          about 1.1 it cuts through the modules instead of around them.
 * `twist`  turns over the filament's whole length.
 * `reach`  how far it runs along the axis, in model units. Over the object's
 *          own span, so the filaments enter and leave the frame rather than
 *          starting and stopping in mid-air.
 * `hue`    linear RGB. Brand blue through magenta to coral, matching the
 *          object's own ramp so the light looks like it came off it.
 */
const TRAILS: Array<{
  radius: number;
  twist: number;
  reach: number;
  hue: [number, number, number];
  seed: number;
}> = [
  { radius: 1.22, twist: 1.45, reach: 6.2, hue: [0.05, 0.22, 1.00], seed: 0.00 },
  { radius: 1.52, twist: 1.10, reach: 6.8, hue: [0.30, 0.10, 0.90], seed: 0.37 },
  { radius: 1.10, twist: 1.85, reach: 5.6, hue: [0.90, 0.16, 0.60], seed: 0.66 },
  { radius: 1.82, twist: 0.95, reach: 7.4, hue: [0.08, 0.30, 1.00], seed: 0.14 },
  { radius: 1.38, twist: 1.60, reach: 6.4, hue: [0.60, 0.14, 0.85], seed: 0.82 },
  { radius: 2.05, twist: 0.80, reach: 8.0, hue: [1.00, 0.30, 0.14], seed: 0.51 },
  { radius: 1.00, twist: 2.20, reach: 5.2, hue: [0.14, 0.45, 1.00], seed: 0.23 },
  { radius: 1.66, twist: 1.25, reach: 7.0, hue: [0.45, 0.12, 0.95], seed: 0.91 },
  { radius: 1.30, twist: 1.95, reach: 6.0, hue: [0.10, 0.34, 1.00], seed: 0.44 },
  { radius: 2.35, twist: 0.68, reach: 8.6, hue: [0.75, 0.20, 0.55], seed: 0.07 },
  { radius: 1.14, twist: 2.45, reach: 5.4, hue: [1.00, 0.42, 0.20], seed: 0.72 },
  { radius: 1.94, twist: 1.05, reach: 7.6, hue: [0.20, 0.16, 1.00], seed: 0.29 },
  { radius: 1.46, twist: 1.75, reach: 6.6, hue: [0.95, 0.24, 0.42], seed: 0.58 },
];

/** Interleaved vertex data plus the count, ready for one buffer and one draw. */
export type TrailGeometry = {
  data: Float32Array;
  vertexCount: number;
  /** Floats per vertex: pos(3) next(3) side(1) t(1) seed(1) hue(3). */
  stride: number;
};

const STRIDE = 12;

/**
 * Builds every filament into one interleaved buffer.
 *
 * Plain triangles rather than strips, because thirteen separate strips in one
 * buffer would need degenerate vertices between them to stop the last vertex of
 * one joining the first of the next - and at this size the extra vertices cost
 * less than the bookkeeping.
 */
export function buildTrails(): TrailGeometry {
  const vertsPerTrail = (SEGMENTS - 1) * 6;
  const data = new Float32Array(TRAIL_COUNT * vertsPerTrail * STRIDE);

  // The chain's own axis, and two directions across it.
  const ax = [Math.SQRT1_2, Math.SQRT1_2, 0];
  const ux = [0, 0, 1];
  const vx = [Math.SQRT1_2, -Math.SQRT1_2, 0];

  let at = 0;

  const point = (
    trail: (typeof TRAILS)[number],
    t: number,
    out: [number, number, number],
  ) => {
    const along = (t - 0.5) * trail.reach;
    const angle = t * trail.twist * Math.PI * 2 + trail.seed * Math.PI * 2;
    // A breathing radius, so the filaments are not identical helices.
    const r = trail.radius * (1 + 0.26 * Math.sin(t * Math.PI * 3 + trail.seed * 7));
    const c = Math.cos(angle) * r;
    const s = Math.sin(angle) * r;
    out[0] = ax[0] * along + ux[0] * c + vx[0] * s;
    out[1] = ax[1] * along + ux[1] * c + vx[1] * s;
    out[2] = ax[2] * along + ux[2] * c + vx[2] * s;
  };

  const a: [number, number, number] = [0, 0, 0];
  const b: [number, number, number] = [0, 0, 0];
  const aNext: [number, number, number] = [0, 0, 0];
  const bNext: [number, number, number] = [0, 0, 0];

  const push = (
    p: [number, number, number],
    n: [number, number, number],
    side: number,
    t: number,
    trail: (typeof TRAILS)[number],
  ) => {
    data[at + 0] = p[0];
    data[at + 1] = p[1];
    data[at + 2] = p[2];
    data[at + 3] = n[0];
    data[at + 4] = n[1];
    data[at + 5] = n[2];
    data[at + 6] = side;
    data[at + 7] = t;
    data[at + 8] = trail.seed;
    data[at + 9] = trail.hue[0];
    data[at + 10] = trail.hue[1];
    data[at + 11] = trail.hue[2];
    at += STRIDE;
  };

  for (const trail of TRAILS) {
    for (let i = 0; i < SEGMENTS - 1; i += 1) {
      const t0 = i / (SEGMENTS - 1);
      const t1 = (i + 1) / (SEGMENTS - 1);
      point(trail, t0, a);
      point(trail, t1, b);

      // EVERY vertex needs its own FORWARD direction.
      //
      // The first version handed the far vertex of each segment the near one as
      // its "next", which points backwards - so the vertex shader's screen
      // normal flipped, the ribbon crossed itself at every joint, and thirteen
      // smooth helices rendered as thirteen zigzags. Sampling a hair further
      // along the curve gives both ends of a segment a direction that agrees,
      // and it agrees with the next segment's too, so the joins are seamless.
      point(trail, t0 + LOOKAHEAD, aNext);
      point(trail, t1 + LOOKAHEAD, bNext);

      // Two triangles per segment: (a-, a+, b-) and (a+, b+, b-).
      push(a, aNext, -1, t0, trail);
      push(a, aNext, +1, t0, trail);
      push(b, bNext, -1, t1, trail);

      push(a, aNext, +1, t0, trail);
      push(b, bNext, +1, t1, trail);
      push(b, bNext, -1, t1, trail);
    }
  }

  return { data, vertexCount: TRAILS.length * vertsPerTrail, stride: STRIDE };
}

const f = (n: number) => {
  const s = n.toFixed(6);
  return s.includes(".") ? s : `${s}.0`;
};

export const TRAIL_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aPos;
in vec3 aNext;
in float aSide;
in float aT;
in float aSeed;
in vec3 aHue;

out float vSide;
out float vT;
out float vSeed;
out vec3 vHue;
out float vViewZ;

uniform mat3 uSpin;
uniform float uAspect;

const float CAM_DISTANCE = ${f(CAM_DISTANCE)};
const float FRUSTUM = ${f(FRUSTUM)};

/**
 * The raymarcher's camera, inverted.
 *
 * That shader builds a ray from a pixel; this one has to build a pixel from a
 * point, and the two must be exact inverses or the filaments would sit a few
 * pixels off the object they are supposed to be wound around. Same constants,
 * same basis, so they cannot drift apart.
 */
vec3 toView(vec3 world, vec3 forward, vec3 right, vec3 up) {
  vec3 camPos = -forward * CAM_DISTANCE;
  vec3 d = world - camPos;
  return vec3(dot(d, right), dot(d, up), dot(d, forward));
}

void main() {
  vec3 forward = normalize(-vec3(${f(EYE[0])}, ${f(EYE[1])}, ${f(EYE[2])}));
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);

  float halfTan = FRUSTUM / CAM_DISTANCE;

  vec3 v0 = toView(uSpin * aPos, forward, right, up);
  vec3 v1 = toView(uSpin * aNext, forward, right, up);

  vec2 s0 = vec2((v0.x / v0.z) / (halfTan * uAspect), (v0.y / v0.z) / halfTan);
  vec2 s1 = vec2((v1.x / v1.z) / (halfTan * uAspect), (v1.y / v1.z) / halfTan);

  // Widen across the filament's SCREEN direction, so the ribbon holds its
  // thickness in pixels wherever it is in depth.
  vec2 dir = s1 - s0;
  dir = length(dir) < 1e-6 ? vec2(1.0, 0.0) : normalize(dir * vec2(uAspect, 1.0));
  vec2 normal = vec2(-dir.y, dir.x) / vec2(uAspect, 1.0);

  vSide = aSide;
  vT = aT;
  vSeed = aSeed;
  vHue = aHue;
  vViewZ = v0.z;

  gl_Position = vec4(s0 + normal * aSide * ${f(RIBBON_WIDTH)}, 0.0, 1.0);
}
`;

export const TRAIL_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in float vSide;
in float vT;
in float vSeed;
in vec3 vHue;
in float vViewZ;

out vec4 outColour;

uniform float uTime;
uniform float uMotion;

const float DEPTH_NEAR = ${f(DEPTH_NEAR)};
const float DEPTH_FAR  = ${f(DEPTH_FAR)};

void main() {
  // TWO falloffs, not one. A single exponent cannot be both a hot filament and
  // a halo: raise it and the glow disappears, lower it and the line goes soft
  // and dead. The sharp term is the wire, the broad one is the light around it,
  // and adding them is what a bright thin thing actually looks like.
  float across = 1.0 - abs(vSide);
  float core = pow(across, 9.0) + pow(across, 2.0) * 0.32;

  // Ends taper to nothing, so a filament arrives and leaves rather than being
  // cut off at the edge of its own geometry.
  float ends = smoothstep(0.0, 0.10, vT) * smoothstep(1.0, 0.88, vT);

  // THE FLOW.
  //
  // Bright heads running along the filament with a tail behind each. Built on
  // fract() of a term that is linear in both t and time, so it repeats
  // seamlessly forever - no restart, no seam, nothing to keep in sync.
  float travel = fract(vT * 1.6 - uTime * 0.14 * uMotion + vSeed);
  float head = pow(1.0 - travel, 9.0);
  float tail = pow(1.0 - travel, 2.0) * 0.30;

  // Fine sparks along the length, which is what stops a clean gradient from
  // looking like a drawn stroke.
  float spark = pow(abs(sin(vT * 190.0 + vSeed * 31.0)), 26.0);

  // Dim, and deliberately. These are meant to be light AROUND the mark, not a
  // second subject: at full strength thirteen additive ribbons wash the body
  // out completely and the hero becomes a ball of string. The heads are the
  // only part allowed to be bright, and they are small.
  float energy = 0.10 + 1.1 * head + tail * 0.5 + 0.7 * spark * (0.2 + head);
  float intensity = core * ends * energy;

  vec3 colour = vHue * intensity * 0.85;
  // Heads burn toward white, the way a bright emissive does through any
  // sensible exposure.
  colour += vec3(1.0) * pow(across, 9.0) * ends * head * 0.35;

  // Premultiplied, and added with ONE/ONE - see the note in heroShader.
  outColour = vec4(colour, intensity * 0.28);
  gl_FragDepth = clamp((vViewZ - DEPTH_NEAR) / (DEPTH_FAR - DEPTH_NEAR), 0.0, 1.0);
}
`;
