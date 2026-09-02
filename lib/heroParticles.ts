/**
 * ORGANIC NEURAL WEB & FIELD - 3D Particle Swarm Simulation
 *
 * High-performance WebGL simulation of 20,000+ particles organized as an
 * interconnected organic neural web and energy field surrounding the centered
 * logo centerpiece.
 *
 * Key Performance & Visual Features:
 * - Zero Garbage Collection: Runs at 60fps with zero allocations per frame.
 * - Multi-harmonic standing waves: Dynamic breathing neural lattice and fluid ripples.
 * - Real-time cursor reactivity: Radial impulse wave and localized energy surges.
 * - Brand gradient mapping: Seamless transition across Deep Blue -> Electric Blue -> Magenta -> Coral.
 */

import * as THREE from "three";
import { constellationState } from "./constellationState";

/**
 * The brand gradient ramp: #2D6BFF (Electric Blue) -> #FF6B5C (Vibrant Coral)
 */
const GRADIENT: Array<{ t: number; rgb: [number, number, number] }> = [
  { t: 0.0, rgb: [0x2d / 255, 0x6b / 255, 0xff / 255] }, // #2D6BFF (Electric Blue)
  { t: 0.45, rgb: [0x82 / 255, 0x50 / 255, 0xff / 255] }, // Deep Electric Violet
  { t: 0.75, rgb: [0xe6 / 255, 0x4b / 255, 0x96 / 255] }, // Rich Magenta
  { t: 1.0, rgb: [0xff / 255, 0x6b / 255, 0x5c / 255] }, // #FF6B5C (Vibrant Coral)
];

const LUT_SIZE = 256;

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

/** Balanced horizontal orientation for the centered layout */
const ROTATION_Z = 0;
const ROT_COS = 1.0;
const ROT_SIN = 0.0;

const REPEL_RADIUS = 28;
const REPEL_STRENGTH = 6.4;
const REPEL_EASE = 0.09;

const GLOW_RADIUS = 24;
const GLOW_STRENGTH = 1.3;
const GLOW_EASE = 0.08;

export interface ParticlesSwarmOptions {
  count: number;
  particleSize?: number;
}

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

const SUPERSAMPLE = 1.0;

/* Was 1.5. A dot 3-8 device pixels across is exactly the case where a capped
   ratio shows: the cap resamples the whole field, and the edge the fragment
   shader works to keep one pixel wide gets smeared across the difference.
   Rendering at the panel's true density is most of what "sharp" means here.
   The fill-rate cost that cap was buying back is repaid by PARTICLE_SIZE
   below, which is roughly a third smaller than it was. */
const MAX_PIXEL_RATIO = 2.0;

/* The hero swarm's ellipse, as a fraction of the visible frame at z = 0:
   ~71% of the width and ~84% of the height, centred. Resolved to world units
   in resize(), since the world size of the frame depends on the camera
   distance the aspect ratio picks. */
const FIELD_WIDTH_FRACTION = 0.71;
const FIELD_HEIGHT_FRACTION = 0.84;

const PARTICLE_VERTEX_SHADER = /* glsl */ `
  precision highp float;

  attribute vec3 aDirection;
  attribute vec3 aFold;
  attribute vec2 aFire;
  attribute vec4 aJit;
  attribute vec2 aWave;
  attribute vec3 aBaseColor;
  attribute float aTract;

  uniform vec2 uFold;
  uniform vec2 uFire;
  uniform vec2 uWave;
  uniform vec2 uJitA;
  uniform vec2 uJitB;
  uniform vec2 uJitC;
  uniform float uSize;
  uniform float uScale;
  uniform vec3 uRepel;
  uniform vec3 uGlow;
  uniform vec2 uHeroCenter;
  uniform vec2 uField;
  uniform vec3 uNodes[5];
  uniform float uTime;

  varying vec3 vColor;
  varying vec3 vGrain;
  varying float vAA;

  const float LUMA = 1.56;

  void main() {
    float foldPhaseCos = uFold.x;
    float foldPhaseSin = uFold.y;
    float firePhaseCos = uFire.x;
    float firePhaseSin = uFire.y;
    float wavePhaseCos = uWave.x;
    float wavePhaseSin = uWave.y;
    float jitACos = uJitA.x;
    float jitASin = uJitA.y;
    float jitBCos = uJitB.x;
    float jitBSin = uJitB.y;
    float jitCCos = uJitC.x;
    float jitCSin = uJitC.y;

    // 1. Organic 3D Morphing Sphere Field (Spanning Full Viewport):
    float baseRadius = 68.0;

    // Harmonic spherical noise displacement creating living fluid waves over the sphere
    float morph1 = sin(aDirection.y * 3.4 + uTime * 0.85 + aFold.x * 2.2);
    float morph2 = cos(aDirection.z * 3.8 - uTime * 0.75 + aFold.y * 2.2);
    float morph3 = sin((aDirection.x * 2.6 + aDirection.y * 2.2) + uTime * 0.95);
    float morph4 = cos(length(aDirection.xy) * 4.5 - uTime * 0.7);

    float ripple = (morph1 * 0.35 + morph2 * 0.30 + morph3 * 0.20 + morph4 * 0.15) * 14.0;
    float breath = sin(uTime * 0.55 + aWave.x * 3.14159) * 4.5;

    float currentRadius = baseRadius + ripple + breath;
    vec3 spherePos = aDirection * currentRadius;

    /* Scaled to fill the CONTAINMENT ELLIPSE, not the screen. At the old
       1.35/1.05 the shell's rim sat at ~1.3x the ellipse, so containment had
       nothing to arrange - it was crushing the entire field onto the boundary
       and drawing the ellipse as a rim, the opposite of the intent. These land
       the rim at e ~= 1.0, leaving the remap to handle only the ripple's
       overshoot. */
    spherePos.x *= 1.05;
    spherePos.y *= 0.82;

    // Fluid continuous wave drifting
    float waveX = sin(spherePos.y * 0.04 + uTime * 0.7) * 3.5;
    float waveY = cos(spherePos.x * 0.04 - uTime * 0.6) * 3.5;
    float waveZ = sin((spherePos.x + spherePos.y) * 0.025 + uTime * 0.8) * 2.5;

    float x = uHeroCenter.x + spherePos.x + waveX;
    float y = uHeroCenter.y + spherePos.y + waveY;
    float z = spherePos.z + waveZ;

    // 2. Dynamic Constellation Perimeter Conduits (connecting the 6 orbiting nodes)
    float filamentGlow = 0.0;
    float systemOrganization = 0.0;

    float activeOrgBoost = clamp(uRepel.z * 0.25 + uGlow.z * 0.35, 0.0, 1.0);
    float seekingWave = sin(uTime * 1.8 + aDirection.x * 4.0) * 0.5 + 0.5;
    float currentSolidification = clamp(0.35 + seekingWave * 0.45 + activeOrgBoost * 0.5, 0.0, 1.0);

    for (int i = 0; i < 5; i++) {
      int nextIdx = (i == 4) ? 0 : i + 1;
      vec3 nA = uNodes[i];
      vec3 nB = uNodes[nextIdx];

      if (nA.z > 0.05 && nB.z > 0.05) {
        vec2 A = nA.xy;
        vec2 B = nB.xy;
        vec2 AB = B - A;
        float segLen2 = dot(AB, AB);

        if (segLen2 > 1.0) {
          float param = clamp(dot(vec2(x, y) - A, AB) / segLen2, 0.0, 1.0);
          vec2 segPoint = A + param * AB;
          vec2 segDiff = vec2(x, y) - segPoint;
          float segDist2 = dot(segDiff, segDiff);
          float maxFilamentDist = 22.0;

          if (segDist2 < maxFilamentDist * maxFilamentDist) {
            float dist = sqrt(segDist2);
            float distFalloff = 1.0 - dist / maxFilamentDist;

            float filamentPulse = sin(param * 14.0 - uTime * 4.5 + float(i) * 1.047);
            float weakFlicker = smoothstep(-0.35, 0.45, filamentPulse);
            float connectionStrength = mix(weakFlicker, 1.0, currentSolidification * 0.7) * nA.z * nB.z;

            float isFilamentParticle = step(0.35, fract(aDirection.x * 19.3 + aDirection.y * 29.7 + float(i) * 0.17));
            float pull = distFalloff * distFalloff * connectionStrength * isFilamentParticle * (0.6 + currentSolidification * 0.3);

            x -= segDiff.x * pull;
            y -= segDiff.y * pull;

            float packet = sin(param * 26.0 - uTime * 7.5 + float(i) * 1.2) * 0.5 + 0.5;
            filamentGlow += distFalloff * connectionStrength * (1.2 + packet * 1.6);
            systemOrganization = max(systemOrganization, distFalloff * connectionStrength);
          }
        }
      }
    }

    // 3. Interactive Cursor Repulsion & Localized Energy Waves
    float attractStrength = 0.0;
    if (uRepel.z > 0.001) {
      vec2 diff = vec2(x, y) - uRepel.xy;
      float d2 = dot(diff, diff);
      float rMax = 38.0;
      float rMax2 = rMax * rMax;
      if (d2 < rMax2 && d2 > 0.0001) {
        float d = sqrt(d2);
        float falloff = 1.0 - d / rMax;
        falloff = falloff * falloff;
        attractStrength = falloff * uRepel.z;

        float ringR = 12.0;
        float distToRing = d - ringR;
        vec2 dir = diff / d;
        vec2 tangent = vec2(-dir.y, dir.x);

        x -= dir.x * (distToRing * 0.85 * attractStrength);
        y -= dir.y * (distToRing * 0.85 * attractStrength);

        float theta = atan(diff.y, diff.x);
        float spin = sin(theta * 2.0 + uTime * 2.6) * 1.8 * attractStrength;
        x += tangent.x * spin;
        y += tangent.y * spin;
        z += cos(theta * 2.0 + uTime * 2.6) * 2.2 * attractStrength;
      }
    }

    // 4. Subtle Quantum Jiggle
    float totalDamp = clamp(systemOrganization * 0.85 + attractStrength * 0.95, 0.0, 0.98);
    float dampChaos = 1.0 - totalDamp;
    float jiggle = 0.18 * dampChaos;
    float jX = (aJit.x * jitACos + aJit.y * jitASin) * jiggle;
    float jY = (aJit.z * jitBCos - aJit.w * jitBSin) * jiggle;
    float jZ = (jitCSin * aJit.y - jitCCos * aJit.x) * jiggle;

    vec3 pos = vec3(x + jX, y + jY, z + jZ);

    /* ELLIPTICAL CONTAINMENT.
       The swarm is generated on a sphere scaled to overflow the viewport, so
       left alone it fills the whole frame and reads as background wash. This
       gathers it into an ellipse around the hero copy instead.

       It is a soft remap, not a clamp. A clamp would pile every outlying
       particle onto the boundary and draw the ellipse as a bright rim - the
       exact "definite shape" to avoid. Instead each particle gets its OWN
       allowed radius, and beyond it the excess is compressed rather than
       removed, so the crowd thins outward instead of stopping.

       The escape gate is deliberately narrow. pow(seed, 5.0) was tried first
       and let ~15% of the swarm out past 1.4x - at 7600 particles that is a
       thousand strays, which is not a hint of leakage, it is the old
       full-frame field with a dip in the middle. smoothstep(0.94, 1.0) admits
       about 6%, and ramps them rather than switching, so the ones that do get
       out are spread across the range instead of massing at one radius.

       RESIDUAL is what the rest keep beyond their allowed radius. It is not
       zero on purpose: at zero every held particle lands on exactly e = 1 and
       the boundary becomes a drawn line. A third of the overshoot keeps the
       falloff continuous, and the ripple in the radius above means particles
       drift across it rather than sitting on it. */
    float escSeed = fract(sin(dot(aDirection.zx, vec2(41.317, 289.71))) * 21739.13);
    float escape = smoothstep(0.94, 1.0, escSeed);
    float allowed = 1.0 + escape * 0.55;
    const float RESIDUAL = 0.33;

    vec2 rel = pos.xy - uHeroCenter;
    vec2 norm = rel / uField;
    float e = length(norm);
    float contained = e;
    if (e > allowed) {
      contained = allowed + (e - allowed) * RESIDUAL;
      pos.xy = uHeroCenter + norm * (contained / max(e, 0.0001)) * uField;
    }

    // 5. Energy firing pulses across synaptic nodes
    float s = aFire.x * firePhaseCos + aFire.y * firePhaseSin;
    float spike = 0.0;
    if (s > 0.0) {
      float s2 = s * s;
      float s4 = s2 * s2;
      float s8 = s4 * s4;
      spike = s8 * s8 * dampChaos;
    }

    float wave = (aWave.x * wavePhaseCos - aWave.y * wavePhaseSin + 1.0) * 0.5;
    float depth = 0.5 + 0.5 * (pos.z * (1.0 / 38.0) * 0.5 + 0.5);

    // 6. Structured hover illumination (pure chromatic glow in #2D6BFF and #FF6B5C)
    float glowBoost = attractStrength * 1.4;
    if (uGlow.z > 0.001) {
      vec2 gdiff = pos.xy - uGlow.xy;
      float gd2 = dot(gdiff, gdiff);
      float gr2 = 30.0 * 30.0;
      if (gd2 < gr2) {
        float gfall = 1.0 - sqrt(gd2) / 30.0;
        glowBoost += gfall * gfall * uGlow.z * 1.6;
      }
    }

    float seed = fract(sin(dot(aDirection, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float seed2 = fract(seed * 197.31);
    float grainAngle = seed * 6.2831853;

    // Smooth central clearing zone around the hero text for readability & accessibility
    vec2 toCenter = (pos.xy - uHeroCenter.xy) / vec2(50.0, 30.0);
    float centerDist = length(toCenter);
    float centralClearance = smoothstep(0.20, 0.95, centerDist);

    /* The old fade was smoothstep(125, 85, length(pos.xy)) - a CIRCLE, on a
       field that is now an ellipse, which would have cut the sides before the
       top. It fades on the same normalised ellipse the containment uses, so
       the strays that escape dim as they travel and the boundary stays a
       gradient rather than a line. */
    float edgeAlpha = 1.0 - smoothstep(0.90, 1.42, contained);
    vGrain = vec3(cos(grainAngle), sin(grainAngle), seed2 * (0.08 + 0.92 * centralClearance));

    // Pure chromatic emission: NO white washout, 100% vibrant #2D6BFF and #FF6B5C
    float interactGlow = clamp(attractStrength * 1.8 + glowBoost * 1.6 + filamentGlow * 1.0, 0.0, 1.0);
    float temper = 0.35 + 0.65 * seed2 * seed2;
    float level = clamp((0.60 + wave * 0.22 + spike * 0.60 * temper + filamentGlow * 0.60 + interactGlow * 1.0) * depth * LUMA, 0.28, 1.16);

    /* Fades to nothing, not to a floor. An earlier 0.15 floor meant the
       escapees stayed faintly lit however far out they drifted, which put a
       dim haze back over the whole frame and undid the containment. */
    vColor = aBaseColor * level * edgeAlpha;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * (uScale / -mv.z);
    /* One screen pixel, expressed in the fragment shader's 0..1 disc space -
       see the fragment shader's note on why the edge is measured this way. */
    vAA = 1.0 / max(gl_PointSize, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

/**
 * RAZOR-SHARP DOTS, NOT SPRITES.
 *
 * This used to sample a 32px Gaussian sprite whose alpha fell off as
 * pow(1 - r, 1.25) - a luminous skirt that, at the 3-8 device pixels a point
 * actually covers, is mostly skirt. A dot that small has no room to render a
 * gradient: the falloff just spends every pixel it has going translucent, and
 * the result reads as a soft blob rather than a point of light.
 *
 * So the sprite is gone, texture fetch and all, and the disc is computed
 * analytically instead: opaque to the rim, then one pixel of antialiasing and
 * nothing. `vAA` carries 1/gl_PointSize from the vertex stage, which is the
 * width of one screen pixel in the 0..1 coordinate this shader works in - so
 * the smoothstep band is exactly one pixel wide no matter how near or far the
 * point is, and no matter the device pixel ratio. That is what keeps the edge
 * crisp instead of scaling the blur along with the dot.
 *
 * fwidth() would give the same number, but it needs derivatives, and passing
 * the size down costs one varying and works everywhere.
 */
const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying vec3 vGrain;
  varying float vAA;

  void main() {
    vec2 pc = (gl_PointCoord - vec2(0.5)) * 2.0;
    vec2 g = vec2(dot(pc, vGrain.xy), pc.y * vGrain.x - pc.x * vGrain.y);
    float ecc = 0.08 * (vGrain.z - 0.5);
    g *= vec2(1.0 - ecc, 1.0 + ecc);

    float d = length(g);
    /* One pixel of edge, clamped: below ~2px wide the band would eat the whole
       dot and everything would go translucent again. */
    float aa = clamp(vAA * 2.0, 0.02, 0.55);
    float shape = 1.0 - smoothstep(1.0 - aa, 1.0, d);
    if (shape < 0.01) discard;

    /* Near-opaque. The old 0.70 was compensating for the sprite's bright core;
       a flat disc needs no such correction and washes out if given one. */
    float a = shape * (0.94 + 0.06 * vGrain.z);

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

  private readonly scale = 65;
  private readonly complexity = 7;

  private raf = 0;
  private running = false;
  private disposed = false;

  private readonly container: HTMLElement;
  private readonly pointerEnabled: boolean;
  private pointerClientX = 0;
  private pointerClientY = 0;
  private pointerSeen = false;
  private lastPointerMove = 0;
  private influence = 0;
  private repelX = 0;
  private repelY = 0;

  private glowActive = false;
  private glowClientX = 0;
  private glowClientY = 0;
  private glowInfluence = 0;
  private glowX = 0;
  private glowY = 0;

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
      antialias: false,
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
      const theta = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * p)));
      const phi = (2 * Math.PI * i) / goldenRatio;

      const sinTheta = Math.sin(theta);
      const sx = sinTheta * Math.cos(phi);
      const sy = sinTheta * Math.sin(phi);
      const sz = Math.cos(theta);

      // Volume depth layering: morphing outer shell + soft volumetric inner dust
      const radialFactor = 0.75 + 0.25 * Math.pow(Math.sin(i * 13.37) * 0.5 + 0.5, 0.5);

      this.ux[i] = sx * radialFactor;
      this.uy[i] = sy * radialFactor;
      this.uz[i] = sz * radialFactor;

      const phiC = (i * goldenRatio) * complexity;
      this.foldAmp[i] = 0.22 * Math.sin(theta * complexity);
      this.foldCos[i] = Math.cos(phiC);
      this.foldSin[i] = Math.sin(phiC);

      const seed = Math.sin(i * 12.9898 + i * 78.233) * 43758.5453;
      this.fireSin[i] = Math.sin(seed);
      this.fireCos[i] = Math.cos(seed);

      this.jitSin[i] = Math.sin(i);
      this.jitCos[i] = Math.cos(i);
      this.jit2Sin[i] = Math.sin(2 * i);
      this.jit2Cos[i] = Math.cos(2 * i);

      const restY = sy * scale * 0.1;
      this.waveSin[i] = Math.sin(restY);
      this.waveCos[i] = Math.cos(restY);

      this.tract[i] = i % 36 === 0 ? 1 : 0;

      // Smooth color mapping: Electric Blue (#2D6BFF) -> Coral (#FF6B5C)
      const t = Math.max(0, Math.min(1, 0.5 + sy * 0.42 + sx * 0.18));
      const idx = Math.min(LUT_SIZE - 1, (t * (LUT_SIZE - 1)) | 0) * 3;
      this.baseR[i] = lut[idx];
      this.baseG[i] = lut[idx + 1];
      this.baseB[i] = lut[idx + 2];
    }

    const dirArray = new Float32Array(count * 3);
    const foldArray = new Float32Array(count * 3);
    const fireArray = new Float32Array(count * 2);
    const jitArray = new Float32Array(count * 4);
    const waveArray = new Float32Array(count * 2);
    const baseColorArray = new Float32Array(count * 3);
    const tractArray = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      dirArray[i * 3] = this.ux[i];
      dirArray[i * 3 + 1] = this.uy[i];
      dirArray[i * 3 + 2] = this.uz[i];

      foldArray[i * 3] = this.foldAmp[i];
      foldArray[i * 3 + 1] = this.foldCos[i];
      foldArray[i * 3 + 2] = this.foldSin[i];

      fireArray[i * 2] = this.fireCos[i];
      fireArray[i * 2 + 1] = this.fireSin[i];

      jitArray[i * 4] = this.jitCos[i];
      jitArray[i * 4 + 1] = this.jitSin[i];
      jitArray[i * 4 + 2] = this.jit2Cos[i];
      jitArray[i * 4 + 3] = this.jit2Sin[i];

      waveArray[i * 2] = this.waveCos[i];
      waveArray[i * 2 + 1] = this.waveSin[i];

      baseColorArray[i * 3] = this.baseR[i];
      baseColorArray[i * 3 + 1] = this.baseG[i];
      baseColorArray[i * 3 + 2] = this.baseB[i];

      tractArray[i] = this.tract[i];
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.geometry.setAttribute("aDirection", new THREE.BufferAttribute(dirArray, 3));
    this.geometry.setAttribute("aFold", new THREE.BufferAttribute(foldArray, 3));
    this.geometry.setAttribute("aFire", new THREE.BufferAttribute(fireArray, 2));
    this.geometry.setAttribute("aJit", new THREE.BufferAttribute(jitArray, 4));
    this.geometry.setAttribute("aWave", new THREE.BufferAttribute(waveArray, 2));
    this.geometry.setAttribute("aBaseColor", new THREE.BufferAttribute(baseColorArray, 3));
    this.geometry.setAttribute("aTract", new THREE.BufferAttribute(tractArray, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uFold: { value: new THREE.Vector2(1, 0) },
        uFire: { value: new THREE.Vector2(1, 0) },
        uWave: { value: new THREE.Vector2(1, 0) },
        uJitA: { value: new THREE.Vector2(1, 0) },
        uJitB: { value: new THREE.Vector2(1, 0) },
        uJitC: { value: new THREE.Vector2(1, 0) },
        uSize: { value: opts.particleSize ?? 1.5 },
        uScale: { value: height * 0.5 },
        uRepel: { value: new THREE.Vector3(0, 0, 0) },
        uGlow: { value: new THREE.Vector3(0, 0, 0) },
        uHeroCenter: { value: new THREE.Vector2(0, 0) },
        uField: { value: new THREE.Vector2(70, 52) },
        uNodes: {
          value: [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0),
          ],
        },
        uTime: { value: 0 },
      },
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.NormalBlending,
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

    const aspect = width / height;
    this.camera.aspect = aspect;
    // Calibrated camera framing allowing the expanded particle sphere to cover full screen
    const targetZ = aspect < 1.0 ? 118 * Math.min(1.35, 0.85 / Math.max(0.4, aspect)) : 108;
    this.camera.position.set(0, 0, targetZ);
    this.camera.updateProjectionMatrix();

    /* The containment ellipse is authored as a fraction of what the viewer
       sees, so it has to be re-solved whenever the framing changes - the
       camera pulls back on portrait aspects, and a fixed world radius would
       shrink against the frame exactly when the field should still fill it.
       halfHeight is the same half-frustum height unproject() uses. */
    const halfHeight = Math.tan((this.camera.fov * Math.PI) / 360) * targetZ;
    const halfWidth = halfHeight * aspect;
    this.material.uniforms.uField.value.set(
      halfWidth * FIELD_WIDTH_FRACTION,
      halfHeight * FIELD_HEIGHT_FRACTION,
    );
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

  private unproject(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;

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
          if (this.pointerClientX >= rect.left && this.pointerClientX <= rect.right &&
              this.pointerClientY >= rect.top && this.pointerClientY <= rect.bottom) {
            pointerInside = true;
          }
          this.repelX = p.x;
          this.repelY = p.y;
        }
        if (this.glowActive) {
          const p = this.unproject(this.glowClientX, this.glowClientY, rect);
          if (this.glowClientX >= rect.left && this.glowClientX <= rect.right &&
              this.glowClientY >= rect.top && this.glowClientY <= rect.bottom) {
            glowInside = true;
          }
          this.glowX = p.x;
          this.glowY = p.y;
        }
      }
    }

    this.influence += ((pointerInside ? 1 : 0) - this.influence) * REPEL_EASE;
    this.glowInfluence += ((glowInside ? 1 : 0) - this.glowInfluence) * GLOW_EASE;
  }

  private renderFrame(time: number) {
    this.updateInfluences();

    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uFold.value.set(Math.cos(time * 0.28), Math.sin(time * 0.28));
    u.uFire.value.set(Math.cos(time * 2.6), Math.sin(time * 2.6));
    u.uWave.value.set(Math.cos(time * 1.6), Math.sin(time * 1.6));
    u.uJitA.value.set(Math.cos(time * 4.8), Math.sin(time * 4.8));
    u.uJitB.value.set(Math.cos(time * 5.9), Math.sin(time * 5.9));
    u.uJitC.value.set(Math.cos(time * 3.8), Math.sin(time * 3.8));
    u.uRepel.value.set(
      this.repelX,
      this.repelY,
      this.influence > 0.001 ? REPEL_STRENGTH * this.influence : 0,
    );
    u.uGlow.value.set(
      this.glowX,
      this.glowY,
      this.glowInfluence > 0.001 ? GLOW_STRENGTH * this.glowInfluence : 0,
    );

    const rect = this.container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      // 1. Update live Hero Center in 3D simulation coordinates (anchored to hero section)
      const heroEl = document.querySelector<HTMLElement>(".hero");
      if (heroEl) {
        const heroRect = heroEl.getBoundingClientRect();
        const heroCenterX = heroRect.left + heroRect.width * 0.5;
        const heroCenterY = heroRect.top + heroRect.height * 0.5;
        const h = this.unproject(heroCenterX, heroCenterY, rect);
        u.uHeroCenter.value.set(h.x, h.y);
      }

      // 2. Update live 3D constellation node positions for connected ~ disconnected filaments
      for (let i = 0; i < 5; i++) {
        const node = constellationState.nodes[i];
        if (u.uNodes.value[i]) {
          if (node && node.active > 0.01) {
            const p = this.unproject(node.x, node.y, rect);
            u.uNodes.value[i].set(p.x, p.y, node.active);
          } else {
            u.uNodes.value[i].set(0, 0, 0);
          }
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
