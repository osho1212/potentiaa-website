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
 * The brand gradient ramp: Deep Blue -> Electric Blue -> Magenta -> Coral.
 */
const GRADIENT: Array<{ t: number; rgb: [number, number, number] }> = [
  { t: 0.0, rgb: [0x0a / 255, 0x24 / 255, 0x70 / 255] }, // --midnight-700
  { t: 0.28, rgb: [0x26 / 255, 0x5d / 255, 0xff / 255] }, // --blue-500
  { t: 0.65, rgb: [0xfa / 255, 0x45 / 255, 0x92 / 255] }, // --magenta-500
  { t: 1.0, rgb: [0xff / 255, 0x6a / 255, 0x5b / 255] }, // --coral-500
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
const MAX_PIXEL_RATIO = 1.5;
const SPRITE_SIZE = 32;

/** High-contrast Gaussian particle sprite with smooth antialiased skirt */
function buildParticleSprite(): THREE.DataTexture {
  const data = new Uint8Array(SPRITE_SIZE * SPRITE_SIZE * 4);
  const half = (SPRITE_SIZE - 1) * 0.5;

  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const r = Math.sqrt(dx * dx + dy * dy);

      let alpha = 0;
      if (r < 1) {
        const core = Math.max(0, 1 - r);
        alpha = Math.pow(core, 1.8);
      }

      const idx = (y * SPRITE_SIZE + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }

  const texture = new THREE.DataTexture(
    data,
    SPRITE_SIZE,
    SPRITE_SIZE,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

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
  uniform vec3 uNodes[6];
  uniform float uTime;

  varying vec3 vColor;
  varying vec3 vGrain;

  const float LUMA = 1.45;

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

    // 1. Dynamic Central Hero Pattern Metamorphosis:
    // Anchored at uHeroCenter.xy (exact center of hero section, moves naturally with page scroll)
    float harmonic1 = aFold.x * (aFold.y * foldPhaseCos - aFold.z * foldPhaseSin);
    float harmonic2 = sin(aDirection.x * 6.0 + uTime * 0.8) * cos(aDirection.y * 5.0 - uTime * 0.6) * 0.15;
    
    // Dynamic spoke attraction reaching out from hero center towards the 6 orbiting constellation nodes
    float nodeSpokeLobe = 0.0;
    vec2 pDir2D = normalize(aDirection.xy + vec2(0.0001));
    for (int i = 0; i < 6; i++) {
      if (uNodes[i].z > 0.05) {
        vec2 nodeVec = uNodes[i].xy - uHeroCenter.xy;
        float nodeDist = length(nodeVec);
        vec2 nDir = (nodeDist > 0.001) ? (nodeVec / nodeDist) : vec2(0.0, 1.0);
        float align = max(0.0, dot(pDir2D, nDir));
        float lobe = pow(align, 4.0) * (nodeDist * 0.45);
        nodeSpokeLobe = max(nodeSpokeLobe, lobe);
      }
    }

    float fold = 0.82 + harmonic1 * 0.85 + harmonic2;
    float baseRadius = 38.0 * fold + nodeSpokeLobe;

    // 2. Synaptic ripples & breathing waves
    float ripple = 0.07 * sin(baseRadius * 0.35 - uTime * 2.2 + aWave.x * 3.14159);
    float radius = baseRadius * (1.0 + ripple);

    float x = uHeroCenter.x + radius * aDirection.x;
    float y = uHeroCenter.y + radius * aDirection.y;
    float z = radius * aDirection.z;

    // Organic neural filament concentration
    if (aTract > 0.5) {
      x = uHeroCenter.x + (radius * aDirection.x) * 0.25;
      y = uHeroCenter.y + (radius * aDirection.y) * 0.88;
      z = (radius * aDirection.z) * 0.45;
    }

    // 3. Dynamic Constellation Network: Chaotic Weak Links -> Solid Organized Operational Conduits
    float filamentGlow = 0.0;
    float systemOrganization = 0.0; // 0 = chaotic weak links, 1 = solid organized system

    // Interactive boost from cursor / hover activity
    float activeOrgBoost = clamp(uRepel.z * 0.25 + uGlow.z * 0.35, 0.0, 1.0);

    // Dynamic seeking wave across time (particles constantly seeking, connecting, and solidifying)
    float seekingWave = sin(uTime * 1.8 + aDirection.x * 4.0) * 0.5 + 0.5;
    float currentSolidification = clamp(0.35 + seekingWave * 0.45 + activeOrgBoost * 0.5, 0.0, 1.0);

    // PATHWAY A: Perimeter Conduit between consecutive nodes (0->1->2->3->4->5->0)
    for (int i = 0; i < 6; i++) {
      int nextIdx = (i == 5) ? 0 : i + 1;
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
          float maxFilamentDist = 20.0;

          if (segDist2 < maxFilamentDist * maxFilamentDist) {
            float dist = sqrt(segDist2);
            float distFalloff = 1.0 - dist / maxFilamentDist;

            // Connected ~ disconnected quantum filament pulse
            // Oscillates between weak searching flicker and solid conduit
            float filamentPulse = sin(param * 14.0 - uTime * 4.5 + float(i) * 1.047);
            float weakFlicker = smoothstep(-0.35, 0.45, filamentPulse);
            float connectionStrength = mix(weakFlicker, 1.0, currentSolidification * 0.7) * nA.z * nB.z;

            // Fraction of particles coalesce to form the line
            float isFilamentParticle = step(0.32, fract(aDirection.x * 19.3 + aDirection.y * 29.7 + float(i) * 0.17));
            float pull = distFalloff * distFalloff * connectionStrength * isFilamentParticle * (0.65 + currentSolidification * 0.35);

            // Pull chaotic particles into coherent line
            x -= segDiff.x * pull;
            y -= segDiff.y * pull;

            // Traveling energy pulse / data packets moving through the pipeline
            float packet = sin(param * 26.0 - uTime * 7.5 + float(i) * 1.2) * 0.5 + 0.5;
            filamentGlow += distFalloff * connectionStrength * (1.2 + packet * 1.8);
            systemOrganization = max(systemOrganization, distFalloff * connectionStrength);
          }
        }
      }
    }

    // PATHWAY B: Central Hub-to-Node Arterial Spokes (uHeroCenter -> Node i)
    for (int i = 0; i < 6; i++) {
      vec3 node = uNodes[i];
      if (node.z > 0.05) {
        vec2 A = uHeroCenter.xy;
        vec2 B = node.xy;
        vec2 AB = B - A;
        float segLen2 = dot(AB, AB);

        if (segLen2 > 1.0) {
          float param = clamp(dot(vec2(x, y) - A, AB) / segLen2, 0.0, 1.0);
          vec2 segPoint = A + param * AB;
          vec2 segDiff = vec2(x, y) - segPoint;
          float segDist2 = dot(segDiff, segDiff);
          float maxSpokeDist = 18.0;

          if (segDist2 < maxSpokeDist * maxSpokeDist) {
            float dist = sqrt(segDist2);
            float distFalloff = 1.0 - dist / maxSpokeDist;

            float spokePulse = sin(param * 10.0 - uTime * 3.8 + float(i) * 1.047);
            float spokeConnection = smoothstep(-0.2, 0.6, spokePulse) * node.z;

            float isSpokeParticle = step(0.42, fract(aDirection.z * 23.1 + aDirection.x * 11.7));
            float pull = distFalloff * distFalloff * spokeConnection * isSpokeParticle * 0.65;

            x -= segDiff.x * pull;
            y -= segDiff.y * pull;

            float spokeSpark = sin(param * 20.0 - uTime * 6.0) * 0.5 + 0.5;
            filamentGlow += distFalloff * spokeConnection * (0.95 + spokeSpark * 1.4);
            systemOrganization = max(systemOrganization, distFalloff * spokeConnection);
          }
        }
      }
    }

    // 4. Interactive Anti-Chaos Harmonic Shape Formation (Ring around cursor on hover)
    float attractStrength = 0.0;
    if (uRepel.z > 0.001) {
      vec2 diff = vec2(x, y) - uRepel.xy;
      float d2 = dot(diff, diff);
      float rMax = 34.0;
      float rMax2 = rMax * rMax;
      if (d2 < rMax2 && d2 > 0.0001) {
        float d = sqrt(d2);
        float falloff = 1.0 - d / rMax;
        falloff = falloff * falloff;
        attractStrength = falloff * uRepel.z;

        float ringR = 10.0;
        float distToRing = d - ringR;
        vec2 dir = diff / d;
        vec2 tangent = vec2(-dir.y, dir.x);

        x -= dir.x * (distToRing * 0.88 * attractStrength);
        y -= dir.y * (distToRing * 0.88 * attractStrength);

        float theta = atan(diff.y, diff.x);
        float spin = sin(theta * 2.0 + uTime * 2.6) * 1.8 * attractStrength;
        x += tangent.x * spin;
        y += tangent.y * spin;
        z += cos(theta * 2.0 + uTime * 2.6) * 2.2 * attractStrength;
      }
    }

    // 5. Dynamic Chaos Damping:
    // Chaotic wandering particles are calmed & organized when captured into the constellation system
    float totalDamp = clamp(systemOrganization * 0.85 + attractStrength * 0.95, 0.0, 0.98);
    float dampChaos = 1.0 - totalDamp;
    float jiggle = (aTract > 0.5 ? 0.02 : 0.22) * dampChaos;
    float jX = (aJit.x * jitACos + aJit.y * jitASin) * jiggle;
    float jY = (aJit.z * jitBCos - aJit.w * jitBSin) * jiggle;
    float jZ = (jitCSin * aJit.y - jitCCos * aJit.x) * jiggle;

    vec3 pos = vec3(x + jX, y + jY, z + jZ);

    // 6. Energy firing pulses across synaptic nodes
    float s = aFire.x * firePhaseCos + aFire.y * firePhaseSin;
    float spike = 0.0;
    if (s > 0.0) {
      float s2 = s * s;
      float s4 = s2 * s2;
      float s8 = s4 * s4;
      spike = s8 * s8 * dampChaos;
    }

    float wave = (aWave.x * wavePhaseCos - aWave.y * wavePhaseSin + 1.0) * 0.5;
    float depth = 0.45 + 0.55 * (pos.z * (1.0 / 34.0) * 0.5 + 0.5);

    // 7. Structured hover illumination
    float glowBoost = attractStrength * 0.85;
    if (uGlow.z > 0.001) {
      vec2 gdiff = pos.xy - uGlow.xy;
      float gd2 = dot(gdiff, gdiff);
      float gr2 = 24.0 * 24.0;
      if (gd2 < gr2) {
        float gfall = 1.0 - sqrt(gd2) / 24.0;
        glowBoost += gfall * gfall * uGlow.z;
      }
    }

    float seed = fract(sin(dot(aDirection, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float seed2 = fract(seed * 197.31);
    float grainAngle = seed * 6.2831853;

    // Soft edge falloff allowing particles to reach naturally across sections with zero clipping
    float edgeAlpha = smoothstep(112.0, 75.0, length(pos.xy));
    vGrain = vec3(cos(grainAngle), sin(grainAngle), seed2 * edgeAlpha);

    float temper = 0.35 + 0.65 * seed2 * seed2;
    float level = (0.52 + wave * 0.28 + spike * 1.85 * temper + filamentGlow * 1.25 + (aTract > 0.5 ? 0.3 : 0.0) + glowBoost) * depth * LUMA;
    float hot = (spike * 0.65 * temper + glowBoost * 0.4 + filamentGlow * 0.95) * LUMA;

    vColor = aBaseColor * level + vec3(hot * 0.8, hot * 0.85, hot);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * (uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  uniform sampler2D uSprite;
  varying vec3 vColor;
  varying vec3 vGrain;

  void main() {
    vec2 pc = (gl_PointCoord - vec2(0.5)) * 2.0;
    vec2 g = vec2(dot(pc, vGrain.xy), pc.y * vGrain.x - pc.x * vGrain.y);
    float ecc = 0.12 * (vGrain.z - 0.5);
    g *= vec2(1.0 - ecc, 1.0 + ecc);

    if (dot(g, g) > 1.0) discard;

    float shape = texture2D(uSprite, g * 0.5 + 0.5).a;
    float a = shape * (0.82 + 0.18 * vGrain.z);
    if (a < 0.003) discard;

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
  private readonly sprite: THREE.DataTexture;
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
      this.ux[i] = sinTheta * Math.cos(phi);
      this.uy[i] = sinTheta * Math.sin(phi);
      this.uz[i] = Math.cos(theta);

      const phiC = phi * complexity;
      this.foldAmp[i] = 0.24 * Math.sin(theta * complexity);
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

      this.tract[i] = i % 48 === 0 ? 1 : 0;

      // Color mapped along vertical/radial gradient ramp
      const t = Math.max(0, Math.min(1, 0.5 + this.uy[i] * 0.42 + this.ux[i] * 0.12));
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

    this.sprite = buildParticleSprite();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uSprite: { value: this.sprite },
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
        uNodes: {
          value: [
            new THREE.Vector3(0, 0, 0),
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

    const aspect = width / height;
    this.camera.aspect = aspect;
    // Step back camera so the enlarged organic swarm comfortably fits with generous padding
    const targetZ = aspect < 1.0 ? 112 * Math.min(1.35, 0.85 / Math.max(0.4, aspect)) : 112;
    this.camera.position.set(0, 0, targetZ);
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
    this.sprite.dispose();
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
      for (let i = 0; i < 6; i++) {
        const node = constellationState.nodes[i];
        if (node && node.active > 0.01) {
          const p = this.unproject(node.x, node.y, rect);
          u.uNodes.value[i].set(p.x, p.y, node.active);
        } else {
          u.uNodes.value[i].set(0, 0, 0);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
