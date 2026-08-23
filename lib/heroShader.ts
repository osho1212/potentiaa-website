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

import { GRADIENT, stopLinear } from "./heroShape";

/**
 * THE HERO OBJECT, AS A SHADER.
 *
 * Raymarched per pixel rather than meshed, and it is a DIFFERENT MODEL from the
 * one that flies down the page.
 *
 * Both of those need saying, because both were mistakes on the way here.
 *
 * WHY RAYMARCHED. What this replaced was a 4K still, and stills have a fixed
 * number of samples along every edge while this object is almost all edge.
 * Measured on the supplied render at the size the hero actually draws it, the
 * bevels carry stair-stepping and speckle that no re-encoding removes, because
 * they are in the source. A mesh only moves the ceiling: marching cubes at
 * /studio's resolution is 4.7M samples and several seconds - fine for baking a
 * sprite sheet, impossible on a homepage - and it still approximates every
 * curve with flat triangles. Sphere tracing has no such ceiling. The silhouette
 * is solved per pixel at whatever resolution the display asks for, the normals
 * are the analytic gradient of the field, and the edge coverage falls out of
 * the distance itself. One draw call, one quad, zero bytes of asset.
 *
 * WHY ITS OWN PROPORTIONS. The first version imported the shape from
 * lib/heroShape, on the reasoning that one mark should be defined once. That
 * put the SCROLLING module in the hero - thin plates joined by a long slim bar,
 * which is what that element was deliberately tuned to be - and it is not the
 * object in the reference render at all. The reference is chunky rounded cubes
 * nearly touching, joined by a SHORT, sharply pinched hourglass.
 *
 * They are two models on purpose, so they are two profiles. The numbers below
 * are measured off the supplied render; lib/heroShape keeps the ones the
 * sprite sequence is baked from, and neither should be edited to satisfy the
 * other. What they do still share is the colour ramp, which is brand and
 * belongs to both.
 */

// ---- Proportions, measured off the supplied render ----------------------

/** Edge length of one module's square face. */
const PLATE = 1.0;

/** Total thickness. Nearly two thirds of the face - a cube, not a plate. */
const DEPTH = 0.62;

/** Face corner radius. */
const CORNER = 0.26;

/** Edge bevel rolled around the rim. */
const BEVEL = 0.05;

/**
 * Diagonal offset to the next module.
 *
 * Over 1, so the modules do NOT overlap - there is real space between them and
 * the weld has to reach across it. That gap is what makes the waist read as a
 * waist rather than as a dimple where two corners met.
 */
const STEP = 1.02;

/**
 * Weld radius - and it is enormous, which is the whole shape.
 *
 * The reference's neck is barely a tenth of a module wide but flares into both
 * of them across a huge concave fillet. That combination only comes out of a
 * smooth minimum run close to its breaking point: the corner arcs either side
 * of the joint sit 0.764 apart, so their half-separation is 0.382, and the
 * neck's half-width solves
 *
 *     sqrt( 0.382^2 + p^2 ) - CORNER = k / 4
 *
 * At k below 0.488 the two fields never meet and the modules come apart
 * entirely. At 0.50 they join with p = 0.048 - a waist under a tenth of a
 * module - and the k/4 pull-in reaches half a module back along each face,
 * which is the flare. A few hundredths either way is the difference between a
 * broken chain and a sausage.
 *
 * No explicit connector bar here, unlike the scrolling module. That element
 * wanted a neck that was thin AND long, which a blend radius cannot give you
 * on its own; this one wants thin and SHORT, which is precisely what a blend
 * radius does give you.
 */
const WELD = 0.5;

/** Half the model's reach on x and y - the outer corner of an end module. */
export const REACH = STEP + PLATE / 2;

/** Module centres on the rising diagonal. */
const CENTRES: Array<[number, number]> = [
  [-STEP, -STEP],
  [0, 0],
  [STEP, STEP],
];

// ---- Camera and pose ----------------------------------------------------

/**
 * Depth range, in model units along the view axis.
 *
 * Both passes map view depth into 0..1 with the same linear formula and write
 * it to gl_FragDepth. Sharing one range is what lets the energy trails pass
 * BEHIND the object where they should and in front where they should - which
 * is most of what sells them as orbiting it rather than being painted over it.
 * The body spans roughly +/-2 about the origin with the camera at 9, so
 * everything lands well inside.
 */
export const DEPTH_NEAR = 4.0;
export const DEPTH_FAR = 15.0;

/** Half-height of the framing at the object, in model units. */
export const FRUSTUM = REACH * 1.19;

/**
 * How far back the camera stands.
 *
 * A LONG LENS, not an orthographic projection, and this is the single change
 * that stopped the object looking like a sticker.
 *
 * Under an ortho camera every pixel shares one view direction, so every pixel
 * of a FLAT face reflects the environment along the same vector and comes back
 * the same colour. The faces rendered as patches of paint - no gradient,
 * nothing for the eye to read as a surface. It is not a lighting bug; a
 * direction-only environment cannot vary across a plane that has one normal.
 *
 * At 9 units with the framing above the lens works out around 22 degrees, near
 * enough a 100mm equivalent: wide enough that the view vector sweeps a face and
 * drags a real gradient over it, long enough that the modules keep their
 * parallel-sided product look instead of splaying.
 */
export const CAM_DISTANCE = 9.0;

/**
 * Where the camera sits, as a direction from the origin.
 *
 * ISOMETRIC - equal on all three axes - and getting here took three wrong
 * turns worth recording.
 *
 * The reference render shows each module as a cube seen down its own body
 * diagonal: one top face as a rhombus, two side faces below it. That view has
 * exactly one camera direction, and it is (1, 1, 1) in the cube's own frame.
 * The modules are axis-aligned, so it is (1, 1, 1) here too.
 *
 * What did not work:
 *
 *   - a low, near-frontal camera (3.2, 2.5, 8.8). Faces on, so the cubes read
 *     as flat tiles with a sliver of wall;
 *   - raising only the Y axis (2.6, 4.8, 6.9). The chain runs along +Y as well
 *     as +X, so elevating the eye foreshortens the very axis the chain is built
 *     on - at 33 degrees the three modules collapsed into a horizontal row;
 *   - leaning the OBJECT about the chain's axis instead. That turns each face
 *     into a rhombus without ever showing a second face, so the modules stayed
 *     flat however far it was pushed, in either direction.
 *
 * On (1, 1, 1) the chain projects to about 30 degrees up and to the right,
 * which is the diagonal the reference runs on, and every module shows three
 * faces. No lean is needed at all - hence BASE_TIP at 0.
 */
export const EYE: [number, number, number] = [5.2, 5.2, 5.2];

/**
 * Extra lean about the chain's own axis, in radians.
 *
 * Zero: the camera is doing this job now. Kept as a named control because it is
 * the one knob that changes how the modules sit WITHOUT moving the chain on
 * screen, which is what any future tuning of this pose will want.
 */
export const BASE_TIP = 0;

/** 3x3 multiply, both operands and the result column-major. */
function multiply(a: number[], b: number[]): number[] {
  const out = new Array<number>(9);
  for (let c = 0; c < 3; c += 1) {
    for (let r = 0; r < 3; r += 1) {
      out[c * 3 + r] =
        a[0 * 3 + r] * b[c * 3 + 0] +
        a[1 * 3 + r] * b[c * 3 + 1] +
        a[2 * 3 + r] * b[c * 3 + 2];
    }
  }
  return out;
}

/** Rotation about an arbitrary unit axis (Rodrigues), column-major. */
function axisAngle(x: number, y: number, z: number, angle: number): number[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = 1 - c;
  return [
    x * x * k + c, y * x * k + z * s, z * x * k - y * s,
    x * y * k - z * s, y * y * k + c, z * y * k + x * s,
    x * z * k + y * s, y * z * k - x * s, z * z * k + c,
  ];
}

/**
 * The object's orientation at a moment in time - object space to world.
 *
 * On the CPU, and uploaded to BOTH passes as one uniform, rather than computed
 * inside each shader from a clock. The raymarcher and the trail ribbons have to
 * agree to the last bit: they are drawn by different programs into the same
 * depth buffer, and a pose that differed even slightly between them would show
 * up as filaments sliding against the object they are wound around. One matrix
 * cannot disagree with itself.
 *
 * A slow sway rather than a spin. The lean (BASE_TIP) is applied first so the
 * sway happens about the object's own axes; whole cycles of a sine, so it never
 * lands anywhere it has not already been.
 */
export function poseMatrix(seconds: number, motion: number): Float32Array {
  // Dev-only tuning hook, so the lean can be swept from the console against the
  // reference render instead of costing a rebuild per guess. Never read in
  // production - the constant is the value that ships.
  const override =
    process.env.NODE_ENV === "development"
      ? (window as unknown as { __heroTip?: number }).__heroTip
      : undefined;
  const tip = override ?? BASE_TIP;

  // Setting the hook also stops the sway, so a swept pose can be compared
  // against a still reference without the phase moving under it.
  const t = override === undefined ? seconds * 0.0555 * motion : 0;
  const sway = multiply(
    multiply(
      axisAngle(1, 0, 0, Math.sin(t * Math.PI * 4) * 0.055),
      axisAngle(0, 1, 0, Math.sin(t * Math.PI * 2) * 0.3),
    ),
    axisAngle(0, 0, 1, Math.sin(t * Math.PI * 2) * 0.03),
  );
  const lean = axisAngle(Math.SQRT1_2, Math.SQRT1_2, 0, tip);
  return new Float32Array(multiply(sway, lean));
}

const f = (n: number) => {
  const s = n.toFixed(6);
  return s.includes(".") ? s : `${s}.0`;
};

/** `vec3(r, g, b)` in linear space, from an sRGB hex. */
const glslColour = (hex: number) => {
  const [r, g, b] = stopLinear(hex);
  return `vec3(${f(r)}, ${f(g)}, ${f(b)})`;
};

/**
 * The gradient, unrolled as a chain of smoothstepped mixes.
 *
 * A loop over a stop array would need the stops in a uniform array and a branch
 * per pixel; the stop list is fixed at build time, so it is cheaper and simpler
 * to emit it as straight-line code. Smoothstep between neighbours reproduces
 * the same easing the mesh path applies on the CPU.
 */
function gradientGlsl(): string {
  const lines = [`  vec3 c = ${glslColour(GRADIENT[0].hex)};`];
  for (let i = 1; i < GRADIENT.length; i += 1) {
    const a = GRADIENT[i - 1].at;
    const b = GRADIENT[i].at;
    lines.push(
      `  c = mix(c, ${glslColour(GRADIENT[i].hex)}, smoothstep(${f(a)}, ${f(b)}, t));`,
    );
  }
  return lines.join("\n");
}

export const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColour;

uniform vec2 uResolution;
/** Object space to world. Built on the CPU - see poseMatrix. */
uniform mat3 uSpin;

const float DEPTH_NEAR = ${f(DEPTH_NEAR)};
const float DEPTH_FAR  = ${f(DEPTH_FAR)};

const float PLATE  = ${f(PLATE)};
const float DEPTH  = ${f(DEPTH)};
const float CORNER = ${f(CORNER)};
const float BEVEL  = ${f(BEVEL)};
const float WELD    = ${f(WELD)};
const float REACH   = ${f(REACH)};
const float FRUSTUM = ${f(FRUSTUM)};
const float CAM_DISTANCE = ${f(CAM_DISTANCE)};

const vec2 C0 = vec2(${f(CENTRES[0][0])}, ${f(CENTRES[0][1])});
const vec2 C1 = vec2(${f(CENTRES[1][0])}, ${f(CENTRES[1][1])});
const vec2 C2 = vec2(${f(CENTRES[2][0])}, ${f(CENTRES[2][1])});

// ---- The field ----------------------------------------------------------

float sdPlate(vec3 p, vec2 c) {
  vec2 q = abs(p.xy - c) - vec2(PLATE * 0.5) + vec2(CORNER);
  float face = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - CORNER;

  vec2 w = vec2(face + BEVEL, abs(p.z) - DEPTH * 0.5 + BEVEL);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - BEVEL;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

/**
 * The whole body. Three cubes and nothing else - the necks are not modelled,
 * they are what the smooth minimum leaves behind between two shapes it can only
 * just reach across. See WELD.
 */
float map(vec3 p) {
  float d = sdPlate(p, C0);
  d = smin(d, sdPlate(p, C1), WELD);
  d = smin(d, sdPlate(p, C2), WELD);
  return d;
}

/**
 * Analytic-ish normal, by the tetrahedron trick - four taps instead of the six
 * a central difference needs, for the same result.
 */
vec3 normalAt(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0006;
  return normalize(
    e.xyy * map(p + e.xyy) +
    e.yyx * map(p + e.yyx) +
    e.yxy * map(p + e.yxy) +
    e.xxx * map(p + e.xxx));
}

/**
 * Ambient occlusion, sampled along the normal.
 *
 * The only reason the welds read as welds. Without it the necks are lit exactly
 * like the faces they grow out of and the joint flattens into a painted-on
 * line; darkening where the field says the surface is enclosed is what puts a
 * crease at the root of every connector.
 */
float occlusion(vec3 p, vec3 n) {
  float occ = 0.0;
  float scale = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.014 + 0.15 * float(i) / 4.0;
    occ += (h - map(p + n * h)) * scale;
    scale *= 0.82;
  }
  return clamp(1.0 - 1.5 * occ, 0.0, 1.0);
}

// ---- Shading ------------------------------------------------------------

/**
 * The studio the object stands in.
 *
 * Procedural rather than an HDRI, and that is not a compromise - it is the
 * reason this can be satin. Satin metal is almost entirely a reflection of its
 * surroundings, so the surroundings have to be SMOOTH: a real environment map
 * roughened by hand shows its mip seams on a curved bevel, while a function is
 * continuous by construction and can be sampled along any direction at any
 * blur without banding.
 *
 * A big soft key panel above and to the left, a cool wash from behind right,
 * and a dark floor - the classic three-quarter product set-up, which is what
 * the supplied render was lit with.
 */
vec3 studio(vec3 d) {
  // A lit ceiling over a dark floor, crossing at the horizon. Steep, because
  // the first version graded gently across the whole sphere and the side walls
  // - whose reflections point outward and slightly down - came back nearly as
  // bright as the top faces, which is a metal with no form.
  vec3 col = mix(vec3(0.010, 0.013, 0.026), vec3(0.92, 0.94, 1.00),
                 smoothstep(-0.12, 0.86, d.y));

  // Floor bounce, cool. Small, but it is the only thing lighting the underside
  // of each module, and without it the bottom third of the object is a hole.
  col += vec3(0.055, 0.065, 0.105) * smoothstep(-0.15, -0.95, d.y);

  // THE SOFT BOX, and it has to be a panel rather than a lobe.
  //
  // pow() gives a spot with no edge - crank the exponent to bound it and it
  // becomes a hot streak dragged across every flat face, which is exactly what
  // it looked like: a scratch, not a light. smoothstep across a narrow angular
  // band is a source with a size and a soft edge, so a flat face reflects a
  // BAND of it and a bevel reflects the edge as a line.
  float key = dot(d, normalize(vec3(-0.36, 0.74, 0.57)));
  col += vec3(1.80, 1.80, 1.86) * smoothstep(0.78, 0.995, key);

  // Cool wash from behind right, to separate the object's far side from the
  // page rather than to light it.
  float wash = dot(d, normalize(vec3(0.88, -0.06, -0.46)));
  col += vec3(0.09, 0.15, 0.36) * smoothstep(0.42, 1.0, wash);

  return col;
}

vec3 fresnel(vec3 f0, float cosTheta) {
  return f0 + (vec3(1.0) - f0) * pow(1.0 - cosTheta, 5.0);
}

/**
 * Fresnel for the ENVIRONMENT term, ceilinged by roughness.
 *
 * Plain Schlick drives every grazing pixel to white, which is right for a
 * mirror and wrong for satin: a rough surface scatters the grazing lobe so it
 * never fully reaches 1. Without this the side walls of all three modules
 * blew out and the object read as pale plastic. This is the standard IBL
 * form - the ceiling is (1 - roughness) rather than 1.
 */
vec3 fresnelRough(vec3 f0, float cosTheta, float rough) {
  return f0 + (max(vec3(1.0 - rough), f0) - f0) * pow(1.0 - cosTheta, 5.0);
}

/** GGX specular for one punctual light - the crisp lines along the bevels. */
vec3 highlight(vec3 n, vec3 v, vec3 l, vec3 f0, float rough, vec3 tint) {
  vec3 h = normalize(v + l);
  float nl = max(dot(n, l), 0.0);
  float nh = max(dot(n, h), 0.0);
  float nv = max(dot(n, v), 1e-4);
  float vh = max(dot(v, h), 0.0);

  float a = rough * rough;
  float a2 = a * a;
  float dd = nh * nh * (a2 - 1.0) + 1.0;
  float ndf = a2 / (3.14159265 * dd * dd);

  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float g = (nl / (nl * (1.0 - k) + k)) * (nv / (nv * (1.0 - k) + k));

  return tint * fresnel(f0, vh) * ndf * g * nl;
}

/** Base reflectance, from where the point sits along the rising diagonal. */
vec3 baseColour(vec3 p) {
  float t = clamp(((p.x + p.y) / (2.0 * REACH) + 1.0) * 0.5, 0.0, 1.0);
${gradientGlsl()}
  return c;
}

void main() {
  float aspect = uResolution.x / uResolution.y;

  vec3 forward = normalize(-vec3(${f(EYE[0])}, ${f(EYE[1])}, ${f(EYE[2])}));
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);

  float halfTan = FRUSTUM / CAM_DISTANCE;
  vec3 ro = -forward * CAM_DISTANCE;
  vec3 rd = normalize(forward
          + right * (vUv.x * aspect * halfTan)
          + up * (vUv.y * halfTan));

  mat3 spin = uSpin;
  mat3 unspin = transpose(spin);

  vec3 o = unspin * ro;
  vec3 dir = unspin * rd;

  // Sphere tracing. smin never overestimates the distance, so a full step is
  // safe; the 0.92 is for the plate field, which is exact outside the body but
  // only a bound near the bevels.
  float travel = 0.0;
  float nearest = 1e9;
  float nearestAt = 0.0;

  for (int i = 0; i < 88; i++) {
    vec3 p = o + dir * travel;
    float d = map(p);
    if (d < nearest) { nearest = d; nearestAt = travel; }
    if (d < 0.0004 || travel > 24.0) break;
    travel += d * 0.92;
  }

  // COVERAGE, not a hit test.
  //
  // The closest the ray ever came to the surface, measured against the width of
  // one pixel in model units. Dead centre of the object that is zero and the
  // pixel is solid; a pixel straddling the silhouette gets a partial value that
  // is the real geometric coverage rather than a count of subsamples. This is
  // one sample per pixel producing a cleaner edge than the 4K still managed,
  // and it is the reason there is no supersampling anywhere in here.
  // Under a perspective camera a pixel covers more world the further away it
  // lands, so the coverage width has to be measured at the hit rather than
  // taken as a constant.
  float pixel = 2.0 * halfTan * nearestAt / uResolution.y;
  float alpha = 1.0 - smoothstep(0.0, pixel * 1.1, nearest);
  if (alpha < 0.002) discard;

  vec3 p = o + dir * nearestAt;
  vec3 n = normalAt(p);
  vec3 v = -dir;

  // Back into world space to shade: the studio does not sway with the object.
  vec3 nw = spin * n;
  vec3 vw = -rd;

  vec3 albedo = baseColour(p);
  float ao = occlusion(p, n);

  // Satin: rough enough that the studio arrives as a broad gradient rather than
  // a mirror of it, polished enough to keep a hard line on every bevel. Metal,
  // so there is no diffuse term at all - the colour IS the reflectance, which
  // is why it deepens in the crevices instead of going grey.
  float rough = 0.24;
  float nv = max(dot(nw, vw), 1e-4);

  vec3 reflected = reflect(-vw, nw);
  reflected = normalize(mix(reflected, nw, rough * rough));
  vec3 col = studio(reflected) * fresnelRough(albedo, nv, rough) * ao;

  // The bevel lines only. The soft box in the environment is now doing the
  // lighting, so these are down to a rim pass - kept broad, because a sharp
  // one lays a hot streak across the flat faces instead of catching the edges.
  col += highlight(nw, vw, normalize(vec3(-0.36, 0.80, 0.52)),
                   albedo, rough * 1.6, vec3(0.55));
  col += highlight(nw, vw, normalize(vec3(0.88, -0.30, -0.32)),
                   albedo, rough * 2.0, vec3(0.34, 0.13, 0.10));

  // The body's own colour bounced back into the shadowed side, so the dark
  // faces read as blue metal rather than as holes. This is the term that keeps
  // saturation where the studio does not reach.
  col += albedo * 0.42 * ao;

  col = vec3(1.0) - exp(-col * 1.95);

  // Depth along the VIEW axis, not along the ray - the two differ by the
  // cosine of the pixel's angle off centre, and the trail pass measures view
  // depth. Getting this wrong tilts the plane the trails sort against.
  float viewZ = nearestAt * dot(rd, forward);
  gl_FragDepth = clamp((viewZ - DEPTH_NEAR) / (DEPTH_FAR - DEPTH_NEAR), 0.0, 1.0);

  // PREMULTIPLIED. The trails add light on top of this with a plain ONE/ONE
  // blend, and additive compositing only works on premultiplied colour - with
  // straight alpha a glow over a transparent pixel would darken it.
  vec3 srgb = pow(col, vec3(1.0 / 2.2));
  outColour = vec4(srgb * alpha, alpha);
}
`;
