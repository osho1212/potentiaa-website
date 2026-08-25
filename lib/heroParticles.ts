/**
 * THE NEURAL SWARM - the 3D formation that replaced the traced energy field.
 *
 * A folded sphere of particles, each with its own firing phase, ported from a
 * generator export (Three.js target) and rebuilt to live in the hero.
 *
 * WHY THIS IS POINTS + ADDITIVE AND NOT INSTANCED MESHES + BLOOM
 *
 * The export shipped an InstancedMesh of tetrahedra through an
 * EffectComposer/UnrealBloomPass chain. Both had to go.
 *
 * The bloom pass is what put a black box behind the hero. UnrealBloomPass
 * composites its blurred copies over an opaque ground inside the composer's own
 * render targets, so whatever the WebGL context's clear alpha is set to, the
 * pass hands back opaque pixels and the canvas stops being transparent. There
 * is no clear-alpha fix for that; the pass has to not be there.
 *
 * What replaces it is cheaper AND more transparent: one THREE.Points, additive
 * blending, and a sprite whose alpha falls off from a hot core to a wide soft
 * tail. Additive blending IS glow - a bright core surrounded by a dim halo,
 * summed wherever particles overlap - and because black contributes nothing
 * under addition, the empty parts of the canvas stay genuinely empty. The
 * former needed several full-screen blur passes a frame; this needs none.
 *
 * WHY THE PER-FRAME LOOP HAS NO TRIG IN IT
 *
 * The density here is only affordable because of this, so it is load-bearing.
 *
 * The export ran six transcendental calls per particle per frame - the fold
 * cosine, the firing sine, the brightness wave, and three jiggle terms - which
 * at this count is a quarter of a million Math.sin/cos calls a frame and the
 * whole frame budget on its own.
 *
 * Every one of them has the form sin(k + w*t) or cos(k + w*t), where k is fixed
 * per particle and only w*t moves. Expanded with the angle-sum identities,
 *
 *     sin(k + wt) = sin(k)cos(wt) + cos(k)sin(wt)
 *     cos(k + wt) = cos(k)cos(wt) - sin(k)sin(wt)
 *
 * the per-particle halves sin(k), cos(k) are constants - computed once into the
 * tables below - and the per-frame halves sin(wt), cos(wt) are the same for
 * every particle, so they are computed once at the top of the frame. What is
 * left inside the loop is multiplication and addition, and the trig count per
 * frame is a fixed handful regardless of how many particles there are.
 *
 * The one term this cannot be done exactly for is the brightness wave, which
 * reads the particle's CURRENT y rather than a fixed phase. It is evaluated
 * against the resting y instead. The wave is a broad slow band across the
 * formation and the jiggle it ignores is sub-unit, so nothing about it reads
 * differently.
 *
 * Depth fade is done here too, off each particle's own z, rather than with a
 * THREE fog: under additive blending fog toward black is a brightness fade
 * anyway, and doing it directly costs nothing and keeps the hues true.
 */

import * as THREE from "three";

/**
 * The brand gradient, as the swarm's colour ramp.
 *
 * The same four stops the hero title and the CTA run through - deep blue up
 * through electric blue and the logo magenta to coral - and mapped the same way
 * round: the ramp is keyed to a particle's RESTING height, so the formation
 * reads deep blue at the bottom and coral at the top, in the same direction as
 * the module stack it wraps.
 *
 * Values from styles/tokens.css. Sampled into a lookup table at startup so the
 * frame loop indexes it rather than interpolating.
 */
const GRADIENT: Array<{ t: number; rgb: [number, number, number] }> = [
  { t: 0.0, rgb: [0x0a / 255, 0x24 / 255, 0x70 / 255] }, // --midnight-700
  { t: 0.3, rgb: [0x26 / 255, 0x5d / 255, 0xff / 255] }, // --blue-500
  { t: 0.66, rgb: [0xfa / 255, 0x45 / 255, 0x92 / 255] }, // --magenta-500
  { t: 1.0, rgb: [0xff / 255, 0x6a / 255, 0x5b / 255] }, // --coral-500
];

const LUT_SIZE = 256;

/**
 * The ramp at `t`, 0..1, as unit rgb. The one place the stops above get
 * interpolated - buildGradientLut() bakes this into a table for the frame
 * loop, and sampleGradientCss() below dresses it for CSS.
 */
function gradientAt(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  let a = GRADIENT[0];
  let b = GRADIENT[GRADIENT.length - 1];
  for (let s = 0; s < GRADIENT.length - 1; s++) {
    if (clamped >= GRADIENT[s].t && clamped <= GRADIENT[s + 1].t) {
      a = GRADIENT[s];
      b = GRADIENT[s + 1];
      break;
    }
  }
  const span = b.t - a.t || 1;
  const k = (clamped - a.t) / span;
  return [
    a.rgb[0] + (b.rgb[0] - a.rgb[0]) * k,
    a.rgb[1] + (b.rgb[1] - a.rgb[1]) * k,
    a.rgb[2] + (b.rgb[2] - a.rgb[2]) * k,
  ];
}

/**
 * The same ramp the particles are coloured from, as a CSS colour for the DOM
 * side of the effect (the flow cards).
 *
 * Exported so the cards and the swarm cannot drift apart: a card at position
 * `t` along the flow is tinted from the identical stops the particle at that
 * end of the formation is, rather than from hand-matched hex that would need
 * re-matching every time the palette moves.
 *
 * `alpha` below 1 returns `rgba()` - card borders want the hue at a fraction
 * of its strength, not a washed-out approximation of it.
 *
 * `lighten` mixes toward white, and TEXT NEEDS IT. The ramp opens on
 * --midnight-700, which is chosen to work as light summed additively against
 * its neighbours in the swarm; set as a foreground colour on a --midnight-950
 * page it is very nearly the background. The first card's note measured
 * rgb(10, 36, 112) on rgb(2, 10, 36) - present, but not readable. Mixing
 * toward white keeps the hue progression legible across the whole ramp
 * instead of only its warm half.
 */
export function sampleGradientCss(
  t: number,
  { alpha = 1, lighten = 0 }: { alpha?: number; lighten?: number } = {},
): string {
  const [r, g, b] = gradientAt(t);
  const k = Math.max(0, Math.min(1, lighten));
  const mix = (v: number) => v + (1 - v) * k;
  const to255 = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  const [rr, gg, bb] = [to255(mix(r)), to255(mix(g)), to255(mix(b))];
  return alpha >= 1 ? `rgb(${rr}, ${gg}, ${bb})` : `rgba(${rr}, ${gg}, ${bb}, ${alpha})`;
}

/**
 * The formation, turned 45 degrees clockwise in the screen plane.
 *
 * Done as an object rotation rather than a CSS transform on the canvas. A CSS
 * rotate would resample already-rendered pixels - so every sprite softens - and
 * would turn the element's box with it, which at this element's negative inset
 * puts the corners somewhere they were never measured for. Rotating the Points
 * makes the GPU draw it turned, at full sharpness, inside an unmoved box.
 *
 * Negative because three rotates counter-clockwise about +Z, and the camera
 * sits on +Z looking back down the axis, so clockwise on screen is -Z.
 *
 * The colour ramp turns with it, being a property of the particles rather than
 * of the view - which is what "the whole effect" asks for, and happens to bring
 * the coral pole round toward the top-right, closer to the axis the module
 * stack runs along.
 */
const ROTATION_Z = (-45 * Math.PI) / 180;

/** World -> object, to put the cursor in the same frame as the particles. */
const ROT_COS = Math.cos(ROTATION_Z);
const ROT_SIN = Math.sin(ROTATION_Z);

/**
 * THE CURSOR REPEL.
 *
 * Radius is in world units against a formation of radius `scale` (45), so this
 * clears a pocket around a third of its width - big enough to read as the swarm
 * noticing, small enough that the shape never stops being the shape.
 *
 * The displacement is applied to a particle's TARGET rather than to its
 * position. Everything already eases toward that target at 0.1 a frame, so the
 * pocket opens and closes on the same spring the rest of the motion uses and
 * needs no easing of its own - and because the target is recomputed from the
 * formation every frame, letting go always resolves back to the true shape
 * instead of accumulating drift.
 *
 * Falloff is squared: linear leaves a visible rim where the push cuts off.
 */
const REPEL_RADIUS = 24;
const REPEL_STRENGTH = 5.6;
/** How fast the effect fades in on enter and out on leave, per frame. */
const REPEL_EASE = 0.09;

/**
 * THE LABEL GLOW - the floating service callouts (components/HeroLabels)
 * brighten the particles nearest them on hover, rather than pushing them
 * away. Same influence-point machinery as the cursor repel, run a second
 * time with its own radius/strength/ease and no displacement term.
 */
const GLOW_RADIUS = 20;
const GLOW_STRENGTH = 1.1;
const GLOW_EASE = 0.08;

export interface ParticlesSwarmOptions {
  count: number;
  /** World-space sprite size. Smaller reads as dust, larger as plasma. */
  particleSize?: number;
}

/** The brand ramp, flattened to LUT_SIZE rgb triples. */
function buildGradientLut(): Float32Array {
  const lut = new Float32Array(LUT_SIZE * 3);
  for (let i = 0; i < LUT_SIZE; i++) {
    const [r, g, b] = gradientAt(i / (LUT_SIZE - 1));
    lut[i * 3] = r;
    lut[i * 3 + 1] = g;
    lut[i * 3 + 2] = b;
  }
  return lut;
}

/**
 * SUPERSAMPLING. The renderer draws this many times the display's own pixels
 * per axis and lets the browser scale the canvas back down.
 *
 * A particle here covers only a handful of pixels, and at that size the edge IS
 * the particle - there is no interior for the eye to read, so whatever the edge
 * does is what the dot looks like. Rendering above display resolution puts real
 * samples inside that edge instead of leaving it to land on whole pixels, and
 * the downscale resolves them into accurate partial coverage.
 *
 * Costs the square of this number in fill. 1.5 is the point where the dots stop
 * crawling as they move; past it the difference stops being visible and the
 * fill bill keeps going up.
 *
 * The delivered factor is actually higher than this, and not by accident worth
 * correcting: .hero__art carries a scale(0.9), so the buffer - sized off the
 * LAYOUT box, which a transform does not change - already lands on a painted
 * box a tenth smaller. Effective supersampling is this over that scale, about
 * 1.67. Aspect is untouched, the scale being uniform, and the cursor still maps
 * against the visual rect, so nothing downstream needs to know.
 */
/**
 * ONLY WHERE THE DISPLAY CANNOT RESOLVE THE EDGE ITSELF.
 *
 * Everything above is true at dpr 1 and stops being true above it: a 2x panel
 * is already putting four samples where this puts one, and the crawl the
 * supersample exists to kill is not visible there to begin with.
 *
 * Applied unconditionally it was not a 1.5x bill, it was a 2.25x one, on the
 * most expensive surface on the page - additively blended points with depth
 * testing off, so every fragment blends. Measured on a dpr 2 display it asked
 * for a 4141x4347 buffer: 18 megapixels against the 6.5 the viewport needs,
 * and it cost a quarter of all frames through the hero. With it off there,
 * frames over budget across the same scroll fall from 27.2% to 2.4%.
 *
 * So it is spent where it buys something and not where it does not.
 */
const SUPERSAMPLE = 1.0;

/**
 * Ceiling on the delivered ratio, after the supersample.
 * Capped at 1.5 for optimal GPU memory and fill rate headroom.
 */
const MAX_PIXEL_RATIO = 1.5;

/**
 * The particle shape, computed per fragment instead of sampled from a sprite.
 *
 * WHY THERE IS NO TEXTURE HERE ANY MORE. A sprite has a fixed resolution and
 * arrives on screen through a filter, and at these sizes both of those are
 * blur: bilinear sampling of a 128px image down to six pixels averages the edge
 * across the whole dot no matter how crisp the source was, which is a floor on
 * sharpness that no amount of source detail gets under. gl_PointCoord gives the
 * exact position within the point, so the edge can be evaluated analytically at
 * whatever resolution the frame is actually being drawn at - the shape is
 * resolution-independent and the only softness left is the half pixel of
 * antialiasing deliberately put there.
 *
 * The core is flat to 0.55 and closes by 0.72, which at these point sizes is
 * under a pixel of transition - a hard edge with just enough ramp not to crawl.
 * The halo is what is left of the old sprite's skirt: kept, because additive
 * overlap between neighbours is what makes the formation glow rather than
 * stipple, but held to a fraction so it lights the gaps without fogging them.
 */
const PARTICLE_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aDirection;
  attribute vec3 aFold;
  attribute vec2 aFire;
  attribute vec4 aJit;
  attribute vec2 aWave;
  attribute vec3 aBaseColor;
  attribute float aTract;

  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  uniform vec3 uRepel;
  uniform vec3 uGlow;

  varying vec3 vColor;

  void main() {
    float foldPhaseCos = cos(uTime * 0.2);
    float foldPhaseSin = sin(uTime * 0.2);
    float firePhaseCos = cos(uTime * 2.5);
    float firePhaseSin = sin(uTime * 2.5);
    float wavePhaseCos = cos(uTime * 1.5);
    float wavePhaseSin = sin(uTime * 1.5);
    float jitACos = cos(uTime * 5.0);
    float jitASin = sin(uTime * 5.0);
    float jitBCos = cos(uTime * 6.2);
    float jitBSin = sin(uTime * 6.2);
    float jitCCos = cos(uTime * 4.1);
    float jitCSin = sin(uTime * 4.1);

    float fold = 0.75 + aFold.x * (aFold.y * foldPhaseCos - aFold.z * foldPhaseSin);
    float radius = 45.0 * fold;

    float x = radius * aDirection.x;
    float y = radius * aDirection.y;
    float z = radius * aDirection.z;

    x += (x >= 0.0 ? 1.0 : -1.0) * 5.0;

    if (aTract > 0.5) {
      x *= 0.15;
      y *= 0.8;
      z *= 0.5;
    }

    if (uRepel.z > 0.001) {
      vec2 diff = vec2(x, y) - uRepel.xy;
      float d2 = dot(diff, diff);
      float r2 = 24.0 * 24.0;
      if (d2 < r2 && d2 > 0.0001) {
        float d = sqrt(d2);
        float falloff = 1.0 - d / 24.0;
        float push = (falloff * falloff * uRepel.z) / d;
        x += diff.x * push;
        y += diff.y * push;
      }
    }

    float jiggle = aTract > 0.5 ? 0.0 : 0.3;
    float jX = (aJit.x * jitACos + aJit.y * jitASin) * jiggle;
    float jY = (aJit.z * jitBCos - aJit.w * jitBSin) * jiggle;
    float jZ = (jitCSin * aJit.y - jitCCos * aJit.x) * jiggle;

    vec3 pos = vec3(x + jX, y + jY, z + jZ);

    float s = aFire.x * firePhaseCos + aFire.y * firePhaseSin;
    float spike = 0.0;
    if (s > 0.0) {
      float s2 = s * s;
      float s4 = s2 * s2;
      float s8 = s4 * s4;
      float s16 = s8 * s8;
      float s32 = s16 * s16;
      spike = s32 * s8;
    }

    float wave = (aWave.x * wavePhaseCos - aWave.y * wavePhaseSin + 1.0) * 0.5;
    float depth = 0.4 + 0.6 * (pos.z * (1.0 / 45.0) * 0.5 + 0.5);

    float glowBoost = 0.0;
    if (uGlow.z > 0.001) {
      vec2 gdiff = pos.xy - uGlow.xy;
      float gd2 = dot(gdiff, gdiff);
      float gr2 = 20.0 * 20.0;
      if (gd2 < gr2) {
        float gfall = 1.0 - sqrt(gd2) / 20.0;
        glowBoost = gfall * gfall * uGlow.z;
      }
    }

    float level = (0.464 + wave * 0.272 + spike * 1.92 + (aTract > 0.5 ? 0.24 : 0.0) + glowBoost) * depth;
    float hot = spike * 0.6;
    vColor = aBaseColor * level + vec3(hot);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * (uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  varying vec3 vColor;

  void main() {
    // 0 at the centre of the point, 1 at its edge.
    float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (d > 1.0) discard;

    float core = 1.0 - smoothstep(0.55, 0.72, d);
    float halo = pow(1.0 - d, 3.0) * 0.16;
    float a = core + halo;
    if (a < 0.004) discard;

    // Additive blending multiplies rgb by alpha, so the colour is passed
    // straight through; vColor is allowed over 1.0 to clip a white-hot core.
    gl_FragColor = vec4(vColor, a);
  }
`;

export class ParticlesSwarm {
  private readonly count: number;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly points: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly clock = new THREE.Clock();

  /** Per-particle constants - see the header on why these exist. */
  private readonly ux: Float32Array;
  private readonly uy: Float32Array;
  private readonly uz: Float32Array;
  private readonly foldAmp: Float32Array;
  private readonly foldCos: Float32Array;
  private readonly foldSin: Float32Array;
  private readonly fireSin: Float32Array;
  private readonly fireCos: Float32Array;
  private readonly jitSin: Float32Array;
  private readonly jitCos: Float32Array;
  private readonly jit2Sin: Float32Array;
  private readonly jit2Cos: Float32Array;
  private readonly waveSin: Float32Array;
  private readonly waveCos: Float32Array;
  private readonly baseR: Float32Array;
  private readonly baseG: Float32Array;
  private readonly baseB: Float32Array;
  private readonly tract: Uint8Array;

  /** Shape parameters - the generator's four sliders, fixed. */
  private readonly scale = 45;
  private readonly activity = 2.5;
  private readonly separation = 5;
  private readonly complexity = 8;

  private raf = 0;
  private running = false;
  private disposed = false;

  // ---- Cursor state ------------------------------------------------------
  private readonly container: HTMLElement;
  /** Mouse only. Coarse pointers get none of this, and pay for none of it. */
  private readonly pointerEnabled: boolean;
  private pointerClientX = 0;
  private pointerClientY = 0;
  private pointerSeen = false;
  private lastPointerMove = 0;
  /** Eased 0..1 - how much of the repel is currently applied. */
  private influence = 0;
  /** The repel centre, in the particles' own (pre-rotation) frame. */
  private repelX = 0;
  private repelY = 0;

  // ---- Label glow state ---------------------------------------------------
  /** Set by setGlow(), read once a frame in updateInfluences(). */
  private glowActive = false;
  private glowClientX = 0;
  private glowClientY = 0;
  /** Eased 0..1, same reasoning as `influence` above. */
  private glowInfluence = 0;
  private glowX = 0;
  private glowY = 0;

  /**
   * Stored on window rather than on the container: the container is
   * pointer-events: none (it sits over the headline), so it receives no pointer
   * events of its own and hit-testing has to be done against its box by hand.
   *
   * Deliberately does no layout reading. Resolving these coordinates against
   * the container needs its viewport box, and that read is deferred to
   * updatePointer so it happens at most once a frame instead of once an event.
   */
  private readonly onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    this.pointerClientX = event.clientX;
    this.pointerClientY = event.clientY;
    this.pointerSeen = true;
    this.lastPointerMove = performance.now();
  };

  constructor(container: HTMLElement, opts: ParticlesSwarmOptions) {
    const count = (this.count = opts.count);
    this.container = container;
    this.pointerEnabled = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    this.scene = new THREE.Scene();

    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    this.camera.position.set(0, 0, 100);

    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // supersampling covers this, and covers it better
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault());

    if (this.pointerEnabled) {
      window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    }

    // ---- Per-particle constants ------------------------------------------
    this.ux = new Float32Array(count);
    this.uy = new Float32Array(count);
    this.uz = new Float32Array(count);
    this.foldAmp = new Float32Array(count);
    this.foldCos = new Float32Array(count);
    this.foldSin = new Float32Array(count);
    this.fireSin = new Float32Array(count);
    this.fireCos = new Float32Array(count);
    this.jitSin = new Float32Array(count);
    this.jitCos = new Float32Array(count);
    this.jit2Sin = new Float32Array(count);
    this.jit2Cos = new Float32Array(count);
    this.waveSin = new Float32Array(count);
    this.waveCos = new Float32Array(count);
    this.baseR = new Float32Array(count);
    this.baseG = new Float32Array(count);
    this.baseB = new Float32Array(count);
    this.tract = new Uint8Array(count);

    const lut = buildGradientLut();
    const goldenRatio = 1.61803398875;
    const { complexity, scale } = this;

    for (let i = 0; i < count; i++) {
      const p = i / count;

      // Fibonacci sphere - even coverage without clumping at the poles.
      const theta = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * p)));
      const phi = (2 * Math.PI * i) / goldenRatio;

      const sinTheta = Math.sin(theta);
      this.ux[i] = sinTheta * Math.cos(phi);
      this.uy[i] = sinTheta * Math.sin(phi);
      this.uz[i] = Math.cos(theta);

      const phiC = phi * complexity;
      this.foldAmp[i] = 0.25 * Math.sin(theta * complexity);
      this.foldCos[i] = Math.cos(phiC);
      this.foldSin[i] = Math.sin(phiC);

      const seed = Math.sin(i * 12.9898 + i * 78.233) * 43758.5453;
      this.fireSin[i] = Math.sin(seed);
      this.fireCos[i] = Math.cos(seed);

      this.jitSin[i] = Math.sin(i);
      this.jitCos[i] = Math.cos(i);
      this.jit2Sin[i] = Math.sin(2 * i);
      this.jit2Cos[i] = Math.cos(2 * i);

      const restY = this.uy[i] * scale * 0.1;
      this.waveSin[i] = Math.sin(restY);
      this.waveCos[i] = Math.cos(restY);

      this.tract[i] = i % 60 === 0 ? 1 : 0;

      // Colour off resting height, with a little lateral lean so the ramp runs
      // on the same diagonal as the hero title's gradient rather than straight up.
      const t = Math.max(0, Math.min(1, 0.5 + this.uy[i] * 0.44 + this.ux[i] * 0.14));
      const idx = Math.min(LUT_SIZE - 1, (t * (LUT_SIZE - 1)) | 0) * 3;
      this.baseR[i] = lut[idx];
      this.baseG[i] = lut[idx + 1];
      this.baseB[i] = lut[idx + 2];
    }

    // ---- GPU buffers (packed once for Vertex Shader) --------------------
    const dirArray = new Float32Array(count * 3);
    const foldArray = new Float32Array(count * 3);
    const fireArray = new Float32Array(count * 2);
    const jitArray = new Float32Array(count * 4);
    const waveArray = new Float32Array(count * 2);
    const baseColorArray = new Float32Array(count * 3);
    const tractArray = new Float32Array(count);
    const dummyPos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      dirArray[i * 3 + 0] = this.ux[i];
      dirArray[i * 3 + 1] = this.uy[i];
      dirArray[i * 3 + 2] = this.uz[i];

      foldArray[i * 3 + 0] = this.foldAmp[i];
      foldArray[i * 3 + 1] = this.foldCos[i];
      foldArray[i * 3 + 2] = this.foldSin[i];

      fireArray[i * 2 + 0] = this.fireSin[i];
      fireArray[i * 2 + 1] = this.fireCos[i];

      jitArray[i * 4 + 0] = this.jitSin[i];
      jitArray[i * 4 + 1] = this.jitCos[i];
      jitArray[i * 4 + 2] = this.jit2Sin[i];
      jitArray[i * 4 + 3] = this.jit2Cos[i];

      waveArray[i * 2 + 0] = this.waveSin[i];
      waveArray[i * 2 + 1] = this.waveCos[i];

      baseColorArray[i * 3 + 0] = this.baseR[i];
      baseColorArray[i * 3 + 1] = this.baseG[i];
      baseColorArray[i * 3 + 2] = this.baseB[i];

      tractArray[i] = this.tract[i];
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(dummyPos, 3));
    this.geometry.setAttribute("aDirection", new THREE.BufferAttribute(dirArray, 3));
    this.geometry.setAttribute("aFold", new THREE.BufferAttribute(foldArray, 3));
    this.geometry.setAttribute("aFire", new THREE.BufferAttribute(fireArray, 2));
    this.geometry.setAttribute("aJit", new THREE.BufferAttribute(jitArray, 4));
    this.geometry.setAttribute("aWave", new THREE.BufferAttribute(waveArray, 2));
    this.geometry.setAttribute("aBaseColor", new THREE.BufferAttribute(baseColorArray, 3));
    this.geometry.setAttribute("aTract", new THREE.BufferAttribute(tractArray, 1));

    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), scale * 2);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: opts.particleSize ?? 1.5 },
        uScale: { value: height * 0.5 },
        uRepel: { value: new THREE.Vector3(0, 0, 0) },
        uGlow: { value: new THREE.Vector3(0, 0, 0) },
      },
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.rotation.z = ROTATION_Z;
    this.scene.add(this.points);

    this.resize(width, height);
    this.animate = this.animate.bind(this);
    this.renderFrame(0);
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const pixelRatio = Math.min(dpr * (dpr > 1 ? 1 : SUPERSAMPLE), MAX_PIXEL_RATIO);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);

    this.material.uniforms.uScale.value = height * pixelRatio * 0.5;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (!this.running) this.renderFrame(this.clock.getElapsedTime());
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.animate);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  setGlow(active: boolean, clientX: number, clientY: number) {
    this.glowActive = active;
    this.glowClientX = clientX;
    this.glowClientY = clientY;
  }

  dispose() {
    this.stop();
    this.disposed = true;
    if (this.pointerEnabled) {
      window.removeEventListener("pointermove", this.onPointerMove);
    }
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private animate() {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.animate);
    this.renderFrame(this.clock.getElapsedTime());
  }

  private unproject(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } | null {
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    if (px < 0 || px > 1 || py < 0 || py > 1) return null;

    const halfHeight = Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
    const worldX = (px * 2 - 1) * halfHeight * this.camera.aspect;
    const worldY = -(py * 2 - 1) * halfHeight;
    return {
      x: worldX * ROT_COS + worldY * ROT_SIN,
      y: -worldX * ROT_SIN + worldY * ROT_COS,
    };
  }

  private updateInfluences() {
    const pointerIdle = this.influence < 0.001 && performance.now() - this.lastPointerMove > 400;
    const wantsPointer = this.pointerEnabled && this.pointerSeen && !pointerIdle;
    const glowIdle = !this.glowActive && this.glowInfluence < 0.001;

    let pointerInside = false;
    let glowInside = false;

    if (wantsPointer || !glowIdle) {
      const rect = this.container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (wantsPointer) {
          const p = this.unproject(this.pointerClientX, this.pointerClientY, rect);
          if (p) {
            pointerInside = true;
            this.repelX = p.x;
            this.repelY = p.y;
          }
        }
        if (this.glowActive) {
          const p = this.unproject(this.glowClientX, this.glowClientY, rect);
          if (p) {
            glowInside = true;
            this.glowX = p.x;
            this.glowY = p.y;
          }
        }
      }
    }

    this.influence += ((pointerInside ? 1 : 0) - this.influence) * REPEL_EASE;
    this.glowInfluence += ((glowInside ? 1 : 0) - this.glowInfluence) * GLOW_EASE;
  }

  private renderFrame(time: number) {
    this.updateInfluences();
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uRepel.value.set(
      this.repelX,
      this.repelY,
      this.influence > 0.001 ? REPEL_STRENGTH * this.influence : 0,
    );
    this.material.uniforms.uGlow.value.set(
      this.glowX,
      this.glowY,
      this.glowInfluence > 0.001 ? GLOW_STRENGTH * this.glowInfluence : 0,
    );

    this.renderer.render(this.scene, this.camera);
  }
}
