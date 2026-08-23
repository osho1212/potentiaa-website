import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import {
  BEVEL,
  bodyDistance,
  CORNER,
  DEPTH,
  GRADIENT,
  NECK,
  PLATE,
  REACH,
  STEP,
  WELD,
} from "./heroShape";

// Re-exported so /studio and anything else that already imports the model can
// keep doing so; the definitions themselves live in heroShape, which the
// homepage's raymarcher also reads.
export { BEVEL, bodyDistance, CORNER, DEPTH, NECK, PLATE, REACH, STEP, WELD };

/**
 * Half-width of the marching-cubes sampling box, in model units.
 *
 * The field has to be evaluated in a margin of empty space around the body or
 * the isosurface would be clipped by the edge of the grid.
 */
const EXTENT = REACH * 1.14;

/**
 * Grid resolution per axis.
 *
 * Set by the SMALLEST feature, which is the connector: at 144 the bar was only
 * eight cells across and its end fillets were five, which is not enough to
 * carry a curve. 168 puts ten cells across the bar. Cost is cubic, so this is
 * 4.7M samples and about 4.6M polygonise calls: several seconds, once, on a
 * dev-only page.
 */
const RESOLUTION = 168;

/** Triangle budget. The body measures ~35k; this is headroom, not a target. */
const MAX_POLYGONS = 200_000;

/**
 * THE HERO MODEL - Potentiaa's mark as one welded metal object.
 *
 * The previous hero was three separate rounded cubes touching corner to corner.
 * This is the mark the brand actually uses (see LogoMark): three modules RISING
 * left to right and JOINED - "start, connect, scale". The joint is the whole
 * point, so it cannot be three meshes parked next to each other; the metal has
 * to flow from one module into the next through a waist.
 *
 * That rules out CSG and rules out three's box primitives. There is no boolean
 * that produces a fillet, and a hand-built connector mesh would show a seam
 * exactly where the eye is meant to read continuity.
 *
 * So the body is defined as a SIGNED DISTANCE FIELD and polygonised.
 *
 *   - each module is a rounded-corner square plate (2D rounded box, extruded,
 *     with a small bevel rolled onto the edges);
 *   - each joint is a slim bar lying along the rising diagonal, its ends
 *     buried inside the two modules it links;
 *   - all five are combined with a POLYNOMIAL SMOOTH MINIMUM rather than a
 *     hard min, so where the bar enters a module the two distance fields blend
 *     into one surface with a fillet of radius `WELD`. There is no seam
 *     because there are no two surfaces; there is one field with one
 *     isosurface.
 *
 * Marching cubes reproduces a plane EXACTLY - the field is linear along any
 * grid edge that crosses a flat face, so the interpolated crossing lands on the
 * real surface. The faces and their straight edges come out crisp at this
 * resolution; only the curvature carries second-order error, and the corners
 * are round anyway. Normals come from the field gradient rather than from face
 * averaging, so the shading is analytic-smooth across the welds.
 *
 * It is baked once, on /studio, and the result is a static BufferGeometry. The
 * site never runs any of this - it plays back 90 pre-rendered webp frames.
 */

const STOPS = GRADIENT.map((stop) => ({
  at: stop.at,
  // THREE.Color converts sRGB hex into the linear working space on assignment,
  // which is the space vertex colours are interpolated and shaded in. Passing
  // the raw hex bytes through would wash the whole gradient out.
  color: new THREE.Color(stop.hex),
}));

/** Colour at a point, from where it sits along the rising diagonal. */
function colourAt(x: number, y: number, target: THREE.Color): THREE.Color {
  const t = Math.min(Math.max(((x + y) / (2 * REACH) + 1) / 2, 0), 1);

  let i = 0;
  while (i < STOPS.length - 2 && t > STOPS[i + 1].at) i += 1;

  const a = STOPS[i];
  const b = STOPS[i + 1];
  const span = b.at - a.at;
  const raw = span <= 0 ? 0 : (t - a.at) / span;
  // Smoothstep, so the hue arrives and leaves each stop without a visible
  // crease across the face.
  const k = raw * raw * (3 - 2 * raw);

  return target.copy(a.color).lerp(b.color, k);
}

// ---- Build --------------------------------------------------------------

/** Direction the metal is brushed in, in model space. */
const BRUSH = new THREE.Vector3(1, -1, 0.22).normalize();

/** Direction the grain repeats ACROSS - perpendicular to BRUSH, in the plate. */
const GRAIN_AXIS = new THREE.Vector3(1, 1, 0.16).normalize();

/**
 * Polygonises the field and returns a static, self-contained BufferGeometry
 * carrying position, normal, colour and tangent.
 *
 * The MarchingCubes helper is used purely as a polygoniser: its field is filled
 * directly rather than through addBall(), because the shape is a distance field
 * and not a sum of metaballs. Field is stored as NEGATED distance so that
 * "inside" is the high side, which is the convention its tables assume, and the
 * isolation level is therefore 0.
 */
export function buildHeroGeometry(): THREE.BufferGeometry {
  const marcher = new MarchingCubes(
    RESOLUTION,
    new THREE.MeshBasicMaterial(),
    false,
    false,
    MAX_POLYGONS,
  );
  marcher.isolation = 0;

  const size = marcher.size;
  const half = marcher.halfsize;
  const field = marcher.field;

  for (let k = 0; k < size; k += 1) {
    const z = ((k - half) / half) * EXTENT;
    const kOffset = k * size * size;
    for (let j = 0; j < size; j += 1) {
      const y = ((j - half) / half) * EXTENT;
      const jOffset = kOffset + j * size;
      for (let i = 0; i < size; i += 1) {
        const x = ((i - half) / half) * EXTENT;
        field[jOffset + i] = -bodyDistance(x, y, z);
      }
    }
  }

  marcher.update();

  // ---- Lift the triangles out into a plain geometry ---------------------
  //
  // MarchingCubes keeps oversized dynamic buffers and a draw range; copying out
  // the used span gives a normal static mesh that can be uploaded once and
  // spun for 90 frames without the polygoniser hanging around in memory.
  const vertices = marcher.count;
  const source = marcher.geometry;
  const src = {
    position: source.getAttribute("position").array as Float32Array,
    normal: source.getAttribute("normal").array as Float32Array,
  };

  const position = new Float32Array(vertices * 3);
  const normal = new Float32Array(vertices * 3);
  const color = new Float32Array(vertices * 3);
  const tangent = new Float32Array(vertices * 4);

  const scratch = new THREE.Color();
  const n = new THREE.Vector3();
  const t = new THREE.Vector3();

  for (let v = 0; v < vertices; v += 1) {
    const p3 = v * 3;

    // The polygoniser works in a -1..1 box; scale back into model units.
    const x = src.position[p3] * EXTENT;
    const y = src.position[p3 + 1] * EXTENT;
    const z = src.position[p3 + 2] * EXTENT;
    position[p3] = x;
    position[p3 + 1] = y;
    position[p3 + 2] = z;

    // Gradient normals are unnormalised - they are central differences of the
    // field, so their length is the local gradient magnitude.
    n.set(src.normal[p3], src.normal[p3 + 1], src.normal[p3 + 2]).normalize();
    normal[p3] = n.x;
    normal[p3 + 1] = n.y;
    normal[p3 + 2] = n.z;

    colourAt(x, y, scratch);
    color[p3] = scratch.r;
    color[p3 + 1] = scratch.g;
    color[p3 + 2] = scratch.b;

    // BRUSH TANGENTS.
    //
    // Anisotropic reflection needs a surface direction to stretch the highlight
    // along, and three only defines one from UVs - which marching cubes cannot
    // give meaningfully. So the grain direction is supplied directly: one fixed
    // model-space axis, projected onto each vertex's tangent plane. That is
    // also what brushing physically is - a direction belonging to the STOCK,
    // not to each face - so every face inherits the same grain and it stays
    // continuous across the welds.
    t.copy(BRUSH).addScaledVector(n, -BRUSH.dot(n));
    if (t.lengthSq() < 1e-8) {
      // Face square-on to the grain; any in-plane direction will do.
      t.set(-n.y, n.x, 0);
      if (t.lengthSq() < 1e-8) t.set(1, 0, 0);
    }
    t.normalize();

    const p4 = v * 4;
    tangent[p4] = t.x;
    tangent[p4 + 1] = t.y;
    tangent[p4 + 2] = t.z;
    tangent[p4 + 3] = 1;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(color, 3));
  geometry.setAttribute("tangent", new THREE.BufferAttribute(tangent, 4));
  geometry.computeBoundingSphere();

  source.dispose();
  (marcher.material as THREE.Material).dispose();

  return geometry;
}

/**
 * Anodised brushed aluminium.
 *
 * Fully metallic, so the module's colour is its REFLECTANCE rather than a
 * diffuse tint - which is why the environment does most of the work and the
 * punctual lights only supply the hard speculars along the bevels.
 *
 * Two things make it read as brushed rather than polished:
 *
 *   1. `anisotropy`, which smears the reflection along the tangent the geometry
 *      carries, so highlights stretch across the faces in one direction;
 *   2. a roughness grain injected in the shader - fine parallel streaks running
 *      along BRUSH. Anisotropy alone gives a satin sheen with no texture in it;
 *      the streaks are what the eye actually reads as machined metal.
 *
 * The grain is computed from model position rather than sampled from a map,
 * again because there are no usable UVs, and it is a value-noise stack so the
 * streaks have a mix of coarse and hairline in them.
 */
export function buildHeroMaterial(): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    // White base: the hue is entirely in the vertex colours, which carry the
    // gradient through the welds. Tinting here as well would apply it twice.
    color: 0xffffff,
    vertexColors: true,
    metalness: 1,
    // Brushed, not polished. At 0.26 the faces held a mirror-sharp reflection
    // of the room and the object read as moulded plastic with stripes printed
    // on it; anodised aluminium scatters far more than that, and it is the
    // scatter that lets the colour show as colour rather than as a highlight.
    roughness: 0.36,
    // Enough to stretch the highlight without it turning into a bar of light.
    anisotropy: 0.9,
    anisotropyRotation: 0,
    envMapIntensity: 1.6,
    // A whisper of lacquer over the brushing - it is what puts the crisp line
    // on the bevels that the reference has and bare metal does not. Kept low:
    // clearcoat is a dielectric layer, so more of it is literally more
    // plastic on top of the metal.
    clearcoat: 0.12,
    clearcoatRoughness: 0.28,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrainAxis = { value: GRAIN_AXIS };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec3 uGrainAxis;
        varying float vGrain;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vGrain = dot( position, uGrainAxis );`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vGrain;

        float potHash( float p ) {
          return fract( sin( p * 127.1 ) * 43758.5453123 );
        }

        float potNoise( float p ) {
          float i = floor( p );
          float f = fract( p );
          f = f * f * ( 3.0 - 2.0 * f );
          return mix( potHash( i ), potHash( i + 1.0 ), f );
        }`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        // Frequencies are capped by the RENDER, not by taste. A module face is
        // about 350px at the 2x supersample and spans ~0.86 of vGrain, so a
        // frequency over ~250 puts the streaks under two pixels and they stop
        // being brushing and start being sampling noise - which then crawls
        // frame to frame, the one artefact a baked sequence must not have.
        float potGrain =
            potNoise( vGrain * 90.0 ) * 0.46
          + potNoise( vGrain * 190.0 ) * 0.33
          + potNoise( vGrain * 420.0 ) * 0.21;
        roughnessFactor = clamp( roughnessFactor + ( potGrain - 0.5 ) * 0.2, 0.04, 1.0 );`,
      );
  };

  return material;
}
