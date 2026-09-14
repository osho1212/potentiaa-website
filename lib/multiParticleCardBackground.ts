/**
 * MultiParticleCardBackground - Replicates the exact "Our Offerings"
 * WebGL2 particle formation effect across the 6 cards in "Our Work".
 *
 * Implements:
 * - Exact Stratified Grid lattice (1 particle per cell with h3/h4 micro-jitter)
 * - Top-to-bottom row-major delay ramp (3.0 * (1 - row/rows) + 1.1 * jitter)
 * - Hero fluid wave drift (heroDrift, ripple, breath, curl)
 * - 4-stop diagonal brand ramp (#2D6BFF -> #8250FF -> #E64B96 -> #FF6B5C)
 * - Exact Signed Distance Function (SDF) rounded-rect fragment clipping
 * - Heading text particle rasterization and smoothstep handoff
 * - Exact PARTICLES_PER_CARD_PIXEL = 0.322 density and size compensation
 */

export interface CardRect {
  centerX: number;
  centerY: number;
  halfWidth: number;
  halfHeight: number;
}

const PARTICLE_SIZE_CSS = 3.6;
const MAX_CANVAS_PIXELS = 1920 * 1200;
const PARTICLES_PER_CARD_PIXEL = 0.322;
const CARD_CORNER_CSS = 24;
const TEXT_DOT_SCALE = 0.7;
const SOURCE_FILL = 1.0;

const CARD_HALF_WIDTH = 58;
const CARD_HALF_HEIGHT = 36;
const CAMERA_DISTANCE = 188;
const MAX_DELAY = 4.65;
const SETTLE_TIME = 1;
const COMPLETION_TIME = MAX_DELAY + SETTLE_TIME;
const STRIDE_BYTES = 10 * 4;
const SCATTER_KEEP = 0.036;

function hash01(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const BRAND_RAMP_GLSL = /* glsl */ `
vec3 brandRamp(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.17647, 0.41961, 1.00000); // #2D6BFF electric blue
  vec3 c1 = vec3(0.50980, 0.31373, 1.00000); // #8250FF deep electric violet
  vec3 c2 = vec3(0.90196, 0.29412, 0.58824); // #E64B96 rich magenta
  vec3 c3 = vec3(1.00000, 0.41961, 0.36078); // #FF6B5C vibrant coral
  if (t < 0.45) return mix(c0, c1, t / 0.45);
  if (t < 0.75) return mix(c1, c2, (t - 0.45) / 0.30);
  return mix(c2, c3, (t - 0.75) / 0.25);
}
`;

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aEnd;
in vec3 aStart;
in vec2 aSeed;
in float aDelay;
in float aCardSlot;

uniform float uTime;
uniform float uProgress;
uniform float uRadius;
uniform float uSwirl;
uniform float uPixelRatio;
uniform float uParticleSize;

uniform vec4 uCardBounds[6];
uniform vec2 uCardScale[6];
uniform vec2 uCorner[6];
uniform vec2 uCardHalfPx[6];
uniform vec2 uSourceSpread;

out float vBuild;
out float vRand;
out float vIsText;
out vec2 vCardCssPos;
out float vSize;
out float vNdcY;
out vec3 vTint;
flat out int vCardIdx;

${BRAND_RAMP_GLSL}

void main() {
  float isText = step(0.5, aEnd.z);
  int cardIdx = int(clamp(aCardSlot, 0.0, 5.0));
  vCardIdx = cardIdx;

  vec4 bounds = isText > 0.5 ? uCardBounds[0] : uCardBounds[cardIdx];
  vec2 cardScale = isText > 0.5 ? uCardScale[0] : uCardScale[cardIdx];
  vec2 corner = isText > 0.5 ? uCorner[0] : uCorner[cardIdx];
  vec2 cardHalfPx = isText > 0.5 ? uCardHalfPx[0] : uCardHalfPx[cardIdx];

  float rawBuild = clamp(uProgress * ${COMPLETION_TIME.toFixed(2)} - aDelay, 0.0, 1.0);
  float build = rawBuild * rawBuild * (3.0 - 2.0 * rawBuild);
  float envelope = 4.0 * build * (1.0 - build);
  float phase = aSeed.x * 2.3 + uTime * (1.1 + 0.5 * aSeed.y);

  float ax = abs(aEnd.x);
  float limit = 1.0;
  if (isText < 0.5 && ax > 1.0 - corner.x) {
    float t = (ax - (1.0 - corner.x)) / max(corner.x, 0.0001);
    limit = (1.0 - corner.y) + corner.y * sqrt(max(0.0, 1.0 - t * t));
  }

  vec3 endPosition = vec3(
    aEnd.x * ${CARD_HALF_WIDTH.toFixed(1)},
    aEnd.y * limit * ${CARD_HALF_HEIGHT.toFixed(1)},
    0.0
  );

  vec2 canvasOffset = vec2(
    bounds.x * ${CAMERA_DISTANCE.toFixed(1)} / cardScale.x,
    bounds.y * ${CAMERA_DISTANCE.toFixed(1)} / cardScale.y
  );

  vec3 startPosition = vec3(
    aStart.xy * uSourceSpread * uRadius - canvasOffset,
    aStart.z * 26.0 * uRadius
  );

  vec3 curl = vec3(0.0);
  if (build < 0.999) {
    curl = vec3(
      cos(phase),
      sin(phase * 0.87),
      sin(phase * 1.31)
    ) * uSwirl * envelope;

    vec2 home = startPosition.xy + canvasOffset;
    vec3 heroDrift = vec3(
      sin(home.y * 0.04 + uTime * 0.7) * 3.5,
      cos(home.x * 0.04 - uTime * 0.6) * 3.5,
      sin((home.x + home.y) * 0.025 + uTime * 0.8) * 2.5
    );

    vec3 hdir = normalize(vec3(aStart.xy, aStart.z) + vec3(1e-5));
    float morph1 = sin(hdir.y * 3.4 + uTime * 0.85 + aSeed.x * 2.2);
    float morph2 = cos(hdir.z * 3.8 - uTime * 0.75 + aSeed.y * 2.2);
    float morph3 = sin((hdir.x * 2.6 + hdir.y * 2.2) + uTime * 0.95);
    float morph4 = cos(length(hdir.xy) * 4.5 - uTime * 0.7);
    float ripple = (morph1 * 0.35 + morph2 * 0.30 + morph3 * 0.20 + morph4 * 0.15) * 14.0;
    float breath = sin(uTime * 0.55 + aSeed.x * 3.14159) * 4.5;
    heroDrift.xy += hdir.xy * (ripple + breath);

    curl += heroDrift * (1.0 - build);
  }

  vec3 worldPosition = mix(startPosition, endPosition, build) + curl;
  vec3 viewPosition = worldPosition - vec3(0.0, 0.0, ${CAMERA_DISTANCE.toFixed(1)});
  float clipW = max(32.0, -viewPosition.z);

  gl_Position = vec4(
    viewPosition.x * cardScale.x + bounds.x * clipW,
    viewPosition.y * cardScale.y + bounds.y * clipW,
    0.0,
    clipW
  );

  gl_PointSize = uParticleSize * uPixelRatio * (${CAMERA_DISTANCE.toFixed(1)} / clipW);

  vBuild = build;
  vRand = aSeed.y;
  vIsText = isText;
  vCardCssPos = vec2(endPosition.x / ${CARD_HALF_WIDTH.toFixed(1)},
                     endPosition.y / ${CARD_HALF_HEIGHT.toFixed(1)}) * cardHalfPx;
  vSize = gl_PointSize;
  vNdcY = gl_Position.y / clipW;
  vTint = brandRamp(clamp(0.5 + aStart.y * 0.42 + aStart.x * 0.18, 0.0, 1.0));
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in float vBuild;
in float vRand;
in float vIsText;
in vec2 vCardCssPos;
in float vSize;
in float vNdcY;
in vec3 vTint;
flat in int vCardIdx;

uniform vec2 uCardHalfPx[6];
uniform float uCornerPx[6];
uniform float uPixelRatio;
uniform float uProgress;

out vec4 fragColor;

void main() {
  vec2 point = gl_PointCoord - 0.5;
  float radial = dot(point, point);
  if (radial > 0.25) discard;

  vec2 cardHalfPx = uCardHalfPx[vCardIdx];
  float cornerPx = uCornerPx[vCardIdx];

  float shape = 1.0;
  if (vBuild > 0.85 && vIsText < 0.5) {
    vec2 offsetCss = point * vSize / uPixelRatio;
    vec2 p = vCardCssPos + offsetCss;
    vec2 q = abs(p) - (cardHalfPx - cornerPx);
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - cornerPx;
    shape = mix(1.0, 1.0 - smoothstep(-0.5, 0.5, sd), smoothstep(0.85, 1.0, vBuild));
  }
  if (shape <= 0.0) discard;

  vec2 unit = point * 2.0;
  float dist = length(unit);
  float aa = clamp(2.0 / max(vSize, 1.0), 0.04, 0.6);
  float radiusScale = mix(1.0, ${TEXT_DOT_SCALE.toFixed(2)}, vIsText);
  float edge = (1.0 - smoothstep(radiusScale - aa, radiusScale, dist)) * shape;

  float edgeFade = 1.0 - smoothstep(0.55, 1.0, abs(vNdcY));
  float visible = step(vRand, mix(${SCATTER_KEEP.toFixed(3)} * edgeFade, 1.0, vBuild));
  if (visible <= 0.0) discard;

  float textFade = 1.0 - smoothstep(0.78, 0.97, uProgress);
  float alpha = edge * mix(1.0, textFade, vIsText);
  if (alpha <= 0.0) discard;

  float whiten = smoothstep(0.15, 0.75, vBuild);
  vec3 color = mix(vTint, vec3(1.0), whiten);

  fragColor = vec4(color, alpha);
}
`;

export default class MultiParticleCardBackground {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject | null = null;
  buffer: WebGLBuffer | null = null;
  uniforms: Record<string, WebGLUniformLocation> = {};

  rects: CardRect[] = [];
  textPoints: Float32Array | null = null;
  textDirty = false;
  particleCount = 0;
  progress = 0;
  time = 0;
  destroyed = false;
  animating = false;
  rafId: number | null = null;
  lastTime = 0;
  builtForArea = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: true });
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    this.bindUniforms();
  }

  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram {
    const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
    const prog = this.gl.createProgram()!;
    this.gl.attachShader(prog, vs);
    this.gl.attachShader(prog, fs);
    this.gl.linkProgram(prog);
    if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(prog);
      throw new Error(`Program link error: ${info}`);
    }
    return prog;
  }

  private bindUniforms() {
    const gl = this.gl;
    gl.useProgram(this.program);
    const names = [
      "uTime", "uProgress", "uRadius", "uSwirl", "uPixelRatio",
      "uParticleSize", "uSourceSpread"
    ];
    for (const name of names) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name)!;
    }

    for (let i = 0; i < 6; i++) {
      this.uniforms[`uCardBounds[${i}]`] = gl.getUniformLocation(this.program, `uCardBounds[${i}]`)!;
      this.uniforms[`uCardScale[${i}]`] = gl.getUniformLocation(this.program, `uCardScale[${i}]`)!;
      this.uniforms[`uCorner[${i}]`] = gl.getUniformLocation(this.program, `uCorner[${i}]`)!;
      this.uniforms[`uCardHalfPx[${i}]`] = gl.getUniformLocation(this.program, `uCardHalfPx[${i}]`)!;
      this.uniforms[`uCornerPx[${i}]`] = gl.getUniformLocation(this.program, `uCornerPx[${i}]`)!;
    }
  }

  setCardRects(rects: CardRect[]) {
    if (this.destroyed || rects.length === 0) return;
    this.rects = rects.slice(0, 6);
    this.resize();
  }

  setTextTargets(points: Float32Array | null) {
    if (this.destroyed) return;
    this.textPoints = points && points.length >= 2 ? points : null;
    this.textDirty = true;
    this.resize();
  }

  setProgress(p: number) {
    if (this.destroyed) return;
    const clamped = Math.min(1, Math.max(0, p));
    if (Math.abs(this.progress - clamped) < 0.0001) return;
    this.progress = clamped;
    this.draw();
    if (this.progress < 0.999 && !this.animating) {
      this.wake();
    }
  }

  resize() {
    if (this.destroyed || this.rects.length === 0) return;
    const gl = this.gl;
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    if (width <= 0 || height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelBudget = MAX_CANVAS_PIXELS;
    const rawPixels = width * height * dpr * dpr;
    const scale = rawPixels > pixelBudget ? Math.sqrt(pixelBudget / rawPixels) : 1;

    const displayWidth = Math.round(width * dpr * scale);
    const displayHeight = Math.round(height * dpr * scale);

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }

    gl.viewport(0, 0, displayWidth, displayHeight);
    gl.useProgram(this.program);

    const pixelRatio = displayWidth / width;
    gl.uniform1f(this.uniforms.pixelRatio, pixelRatio);

    const firstRect = this.rects[0];
    const halfWidthNdc0 = firstRect.halfWidth / (width / 2);
    const scaleX0 = (halfWidthNdc0 * CAMERA_DISTANCE) / CARD_HALF_WIDTH;
    const spreadX = (SOURCE_FILL * CAMERA_DISTANCE) / scaleX0;
    const spreadY = spreadX * (height / width);
    gl.uniform2f(this.uniforms.sourceSpread, spreadX, spreadY);

    for (let i = 0; i < 6; i++) {
      const r = this.rects[i] || firstRect;
      const cX_ndc = (r.centerX - width / 2) / (width / 2);
      const cY_ndc = -(r.centerY - height / 2) / (height / 2);
      const hWNdc = r.halfWidth / (width / 2);
      const hHNdc = r.halfHeight / (height / 2);
      const scX = (hWNdc * CAMERA_DISTANCE) / CARD_HALF_WIDTH;
      const scY = (hHNdc * CAMERA_DISTANCE) / CARD_HALF_HEIGHT;

      gl.uniform4f(this.uniforms[`uCardBounds[${i}]`], cX_ndc, cY_ndc, hWNdc, hHNdc);
      gl.uniform2f(this.uniforms[`uCardScale[${i}]`], scX, scY);
      gl.uniform2f(
        this.uniforms[`uCorner[${i}]`],
        Math.min(1, CARD_CORNER_CSS / r.halfWidth),
        Math.min(1, CARD_CORNER_CSS / r.halfHeight)
      );
      gl.uniform2f(this.uniforms[`uCardHalfPx[${i}]`], r.halfWidth, r.halfHeight);
      gl.uniform1f(
        this.uniforms[`uCornerPx[${i}]`],
        Math.min(CARD_CORNER_CSS, r.halfWidth, r.halfHeight)
      );
    }

    const { totalArea, cardLayouts } = this.calculateCardLayouts();
    gl.uniform1f(this.uniforms.particleSize, cardLayouts[0]?.size || PARTICLE_SIZE_CSS);

    const areaRatio = this.builtForArea > 0 ? totalArea / this.builtForArea : 1;
    if (!this.vao || this.textDirty || areaRatio > 1.35 || areaRatio < 0.65) {
      this.buildParticleBuffer(cardLayouts);
      this.builtForArea = totalArea;
      this.textDirty = false;
    }

    this.draw();
    this.wake();
  }

  private calculateCardLayouts() {
    let totalArea = 0;
    const cardLayouts = [];

    for (const r of this.rects) {
      const cardWidth = r.halfWidth * 2;
      const cardHeight = r.halfHeight * 2;
      const area = cardWidth * cardHeight;
      totalArea += area;

      const aspect = cardWidth / cardHeight;
      const ideal = Math.round(area * PARTICLES_PER_CARD_PIXEL);
      const target = Math.min(60000, Math.max(10000, ideal));
      const columns = Math.ceil(Math.sqrt(target * aspect));
      const rows = Math.ceil(target / columns);
      const scale = Math.sqrt(ideal / target);
      const size = PARTICLE_SIZE_CSS * Math.min(2.2, Math.max(0.6, scale));

      cardLayouts.push({ area, aspect, columns, rows, count: columns * rows, size });
    }

    return { totalArea, cardLayouts };
  }

  private buildParticleBuffer(cardLayouts: Array<{ columns: number; rows: number; count: number; size: number }>) {
    const gl = this.gl;
    let totalCardParticles = 0;
    for (const l of cardLayouts) totalCardParticles += l.count;

    const textCount = this.textPoints ? this.textPoints.length >> 1 : 0;
    const totalCount = totalCardParticles + textCount;
    this.particleCount = totalCount;

    const data = new Float32Array(totalCount * 10);
    const tau = Math.PI * 2;
    let globalIndex = 0;

    // 1. Stratified Grid Particle Placement for Each Card
    for (let cIdx = 0; cIdx < cardLayouts.length; cIdx++) {
      const layout = cardLayouts[cIdx];
      const isSecondRow = cIdx >= 3;
      const rowStagger = isSecondRow ? 0.35 : 0.0;

      for (let i = 0; i < layout.count; i++) {
        const col = i % layout.columns;
        const row = Math.floor(i / layout.columns);

        const h1 = hash01(globalIndex + 0x12d4a7);
        const h2 = hash01(globalIndex + 0x9e3779);
        const h3 = hash01(globalIndex + 0x51ed27);
        const h4 = hash01(globalIndex + 0x7f4a7c);
        const h5 = hash01(globalIndex + 0x2f1b3d);
        const h6 = hash01(globalIndex + 0xc2b2ae);

        // Stratified cell with subtle jitter
        const cardX =
          ((col + 0.5) / layout.columns) * 2 - 1 + ((h3 - 0.5) * 0.65) / layout.columns;
        const cardY =
          ((row + 0.5) / layout.rows) * 2 - 1 + ((h4 - 0.5) * 0.65) / layout.rows;

        const offset = globalIndex * 10;
        data[offset + 0] = cardX;
        data[offset + 1] = cardY;
        data[offset + 2] = 0.0; // card particle

        // Unstructured scatter across whole canvas
        data[offset + 3] = h5 * 2 - 1;
        data[offset + 4] = h6 * 2 - 1;
        data[offset + 5] = h2 * 2 - 1;

        data[offset + 6] = tau * h3;
        data[offset + 7] = h1;

        // Exact top-to-bottom delay ramp + row stagger
        const rowFraction = 1 - row / layout.rows;
        data[offset + 8] = 3.0 * rowFraction + 1.1 * h4 + rowStagger;
        data[offset + 9] = cIdx;

        globalIndex++;
      }
    }

    // 2. Heading Lettering Particles (lead the formation)
    if (this.textPoints && textCount > 0) {
      const firstRect = this.rects[0];
      const halfW = Math.max(1, firstRect.halfWidth);
      const halfH = Math.max(1, firstRect.halfHeight);

      for (let t = 0; t < textCount; t++) {
        const px = this.textPoints[t * 2];
        const py = this.textPoints[t * 2 + 1];

        const g1 = hash01(globalIndex + 0x3ab19f);
        const g2 = hash01(globalIndex + 0x5f2e11);
        const g3 = hash01(globalIndex + 0x91c7d3);
        const g4 = hash01(globalIndex + 0x1de3b7);

        const offset = globalIndex * 10;
        data[offset + 0] = (px - firstRect.centerX) / halfW;
        data[offset + 1] = -(py - firstRect.centerY) / halfH;
        data[offset + 2] = 1.0; // flag as heading text

        data[offset + 3] = g1 * 2 - 1;
        data[offset + 4] = g2 * 2 - 1;
        data[offset + 5] = g3 * 2 - 1;

        data[offset + 6] = tau * g4;
        data[offset + 7] = g1;

        // Heading letters form first with near-zero delay
        data[offset + 8] = 0.55 * g4;
        data[offset + 9] = 0.0;

        globalIndex++;
      }
    }

    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.buffer) gl.deleteBuffer(this.buffer);

    this.vao = gl.createVertexArray()!;
    this.buffer = gl.createBuffer()!;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    gl.useProgram(this.program);
    const locs = {
      aEnd: gl.getAttribLocation(this.program, "aEnd"),
      aStart: gl.getAttribLocation(this.program, "aStart"),
      aSeed: gl.getAttribLocation(this.program, "aSeed"),
      aDelay: gl.getAttribLocation(this.program, "aDelay"),
      aCardSlot: gl.getAttribLocation(this.program, "aCardSlot"),
    };

    gl.enableVertexAttribArray(locs.aEnd);
    gl.vertexAttribPointer(locs.aEnd, 3, gl.FLOAT, false, STRIDE_BYTES, 0);

    gl.enableVertexAttribArray(locs.aStart);
    gl.vertexAttribPointer(locs.aStart, 3, gl.FLOAT, false, STRIDE_BYTES, 3 * 4);

    gl.enableVertexAttribArray(locs.aSeed);
    gl.vertexAttribPointer(locs.aSeed, 2, gl.FLOAT, false, STRIDE_BYTES, 6 * 4);

    gl.enableVertexAttribArray(locs.aDelay);
    gl.vertexAttribPointer(locs.aDelay, 1, gl.FLOAT, false, STRIDE_BYTES, 8 * 4);

    gl.enableVertexAttribArray(locs.aCardSlot);
    gl.vertexAttribPointer(locs.aCardSlot, 1, gl.FLOAT, false, STRIDE_BYTES, 9 * 4);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  draw() {
    if (this.destroyed || !this.vao || this.particleCount === 0) return;
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.program);
    gl.uniform1f(this.uniforms.uTime, this.time);
    gl.uniform1f(this.uniforms.uProgress, this.progress);
    gl.uniform1f(this.uniforms.uRadius, 1.0);
    gl.uniform1f(this.uniforms.uSwirl, 1.0);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.POINTS, 0, this.particleCount);
    gl.bindVertexArray(null);
  }

  wake() {
    if (this.animating || this.destroyed) return;
    this.animating = true;
    this.lastTime = performance.now();
    const tick = (now: number) => {
      if (this.destroyed) return;
      const dt = (now - this.lastTime) * 0.001;
      this.lastTime = now;
      this.time += dt;
      this.draw();

      if (this.progress >= 0.999) {
        this.animating = false;
        this.rafId = null;
      } else {
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  destroy() {
    this.destroyed = true;
    this.animating = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.vao) this.gl.deleteVertexArray(this.vao);
    if (this.buffer) this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
  }
}
