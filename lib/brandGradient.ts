/**
 * The brand colour ramp, and the one function that samples it for CSS.
 *
 * WHY THIS FILE EXISTS. This code used to live in lib/heroParticles.ts, next to
 * the WebGL swarm it was written for. That module opened with a static
 * `import * as THREE from "three"`, so every consumer of the ramp pulled the
 * whole of three into its bundle - and two of the consumers are plain DOM
 * components that never touch WebGL at all (HeroFlowStream draws on a 2D
 * canvas, HeroLabels writes CSS custom properties). The homepage was shipping a
 * 3D engine to tint six cards.
 *
 * Split out so the colour system has no dependencies whatsoever. This file is
 * pure arithmetic: no imports, no DOM, no GPU.
 *
 * `buildGradientLut()` did not come with it. Its only caller was the swarm's
 * frame loop, which has been removed, so carrying it across would have moved
 * dead code rather than shared code.
 *
 * Values are from styles/tokens.css and must stay in step with them.
 */

/**
 * The four stops, mapped low-to-high: deep blue at the bottom of the range,
 * through electric blue and the logo magenta, to coral at the top.
 *
 * Kept as unit rgb (0..1) rather than hex because every consumer interpolates
 * before it renders, and converting once at the edge is cheaper and less
 * lossy than converting on every sample.
 */
const GRADIENT: Array<{ t: number; rgb: [number, number, number] }> = [
  { t: 0.0, rgb: [0x0a / 255, 0x24 / 255, 0x70 / 255] }, // --midnight-700
  { t: 0.3, rgb: [0x26 / 255, 0x5d / 255, 0xff / 255] }, // --blue-500
  { t: 0.66, rgb: [0xfa / 255, 0x45 / 255, 0x92 / 255] }, // --magenta-500
  { t: 1.0, rgb: [0xff / 255, 0x6a / 255, 0x5b / 255] }, // --coral-500
];

/** The ramp at `t`, 0..1, as unit rgb. The one place the stops interpolate. */
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
 * The ramp at `t`, as a CSS colour.
 *
 * Exported so everything tinted by position along the flow is tinted from one
 * source: a card at position `t` and the stream segment beside it resolve from
 * the identical stops, rather than from hand-matched hex that would need
 * re-matching every time the palette moves.
 *
 * `alpha` below 1 returns `rgba()` - card borders want the hue at a fraction of
 * its strength, not a washed-out approximation of it.
 *
 * `lighten` mixes toward white, and TEXT NEEDS IT. The ramp opens on
 * --midnight-700, which is chosen to work as light summed additively against
 * its neighbours; set as a foreground colour on a --midnight-950 page it is very
 * nearly the background. The first card's note measured rgb(10, 36, 112) on
 * rgb(2, 10, 36) - present, but not readable. Mixing toward white keeps the hue
 * progression legible across the whole ramp instead of only its warm half.
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
