"use client";

import { useEffect, useRef } from "react";
import {
  MODULE_A,
  MODULE_B,
  Mote,
  buildField,
  moduleGlow,
  strandWindow,
  streamPalette,
} from "@/lib/heroEnergy";

/**
 * The energy field around the hero artwork.
 *
 * TWO canvases, with the artwork between them. The field winds around the
 * module stack, so a strand that is in front of it has to be DRAWN in front of
 * it - see lib/heroEnergy for why the geometry is a helix and not a tangle.
 * Every sample knows its own depth, and each segment goes to exactly one of the
 * two layers, so the total amount of drawing is the same as it would be on one
 * canvas; what changes is that the object is now inside the field instead of
 * pasted over it.
 *
 * An earlier version of this file did it on one canvas, entirely behind the
 * picture, and the note here recorded that as settled. The owner's video
 * reference overturns it: strands cross the front faces of the cubes there,
 * repeatedly and obviously, and without that the object cannot read as
 * embedded.
 *
 * 2D canvas rather than WebGL, deliberately. The whole effect is thousands of
 * short additive strokes, which is what a 2D context with
 * globalCompositeOperation 'lighter' does natively; in WebGL every one of them
 * would have to become geometry first.
 *
 * WHAT THIS COSTS, AND WHERE
 *
 * Measured, because the intuition here is wrong twice over.
 *
 * First: building the paths is free. The twenty-odd thousand lineTo calls a
 * frame do not register at all against a frame with the strokes stubbed out.
 * Every millisecond is in stroke() and fill(), so the only numbers that move
 * this are how much area gets covered and how many times a shape has to be
 * tessellated before anything is covered at all.
 *
 * Second: the expensive passes are not the ones that look expensive. Profiled
 * per pass on the version this replaces, the dust cost more than every core
 * line put together - seven hundred dots covering a few thousand pixels, losing
 * to tessellation, not fill. Hence buildStamps. The widest stroke on the
 * canvas, meanwhile, costs almost nothing, because it is held to the two
 * brightest buckets.
 *
 * The rules that keep this affordable, all of them load-bearing:
 *
 *   - the skeleton is STATIC, so everything that does not depend on the clock
 *     is computed once into a table: the projection, the depth fade, the taper,
 *     the module lighting, the colour ramp, and which layer a sample belongs
 *     to. A frame reads that table and does almost no arithmetic;
 *   - the RESTING field - every strand at its own quiet brightness, plus the
 *     ambient haze between them and the light the modules throw - cannot change
 *     until the canvas resizes, so it is rendered once per layer and arrives as
 *     a single drawImage. The haze in particular is enormous fill that costs
 *     nothing per frame because of this;
 *   - dust and light heads are pre-rendered stamps, blitted rather than
 *     tessellated;
 *   - segments are binned by colour and brightness and drawn as a handful of
 *     batched paths, so density stops being the thing that costs;
 *   - contiguous segments in one bucket are a single polyline, so joints are
 *     not covered twice by overlapping round caps;
 *   - the light runs slowly enough that 60fps was redrawing near-identical
 *     frames. It is capped.
 */

/**
 * Samples per strand.
 *
 * Paired with STEP in lib/heroEnergy - see the note there. Sixty-seven coarse
 * steps of a streamline look the same as eighty-eight fine ones and cost a
 * quarter less, because the cost of this effect is stroked length and every
 * sample is a segment that has to be stroked.
 */
const STEPS = 58;

/**
 * How far the field reaches past the artwork, as a multiple of its box.
 *
 * The reference has strands running well off the edge of the frame, which is
 * most of why the object looks like it is inside a current rather than sitting
 * in front of a decoration. The canvases are correspondingly bigger than the
 * picture - see .hero__art-field.
 *
 * MUST AGREE WITH .hero__art-field's width and height. The component sizes its
 * strands in units of the artwork's half-width and works pixels out from the
 * canvas box, so if the two disagree the whole field is silently mis-scaled.
 *
 * Three was tried, to give the traced composition the room a wide reference
 * frame implies, and rejected: at that size the box reaches across the headline
 * and past the viewport edge, the backing store spreads to 0.73 device pixels
 * per CSS pixel so the filaments go soft, and the page picks up a horizontal
 * scrollbar. The field is better small and sharp than large and thin.
 */
const FIELD_SCALE = 5.0;

/**
 * Backing-store ceiling on the long side.
 */
const MAX_PIXELS = 3200;

/**
 * Redraws per second.
 *
 * Light travels a strand at `flow` lengths per second and lib/heroEnergy builds
 * those between 0.03 and 0.105 - ten to thirty seconds end to end. At 60fps a
 * head moves well under a pixel per frame, so half those frames were redrawing
 * an image identical to the one before it.
 *
 * This is a duty-cycle fix, not a per-frame one: it does not make a frame
 * cheaper, it stops the main thread being asked for one twice as often.
 */
const FPS = 30;
const FRAME_MS = 1000 / FPS;

/**
 * Brightness steps that segments are sorted into before drawing.
 *
 * THE reason this can be dense at all. Drawing hundreds of strands a segment at
 * a time is tens of thousands of stroke() calls a frame and a 2D context cannot
 * do that at 60fps. Segments are binned by colour and brightness into one
 * Path2D each instead, so a frame is a fixed handful of strokes however many
 * strands there are.
 */
const LEVELS = 7;

/** Alpha at the brightest step. */
const PEAK_ALPHA = 0.42;

/** Steps the resting strands are binned into. Coarser - they barely vary. */
const REST_LEVELS = 4;

/** Alpha the top resting bin sits at. */
const REST_PEAK = 0.22;

/**
 * How hard each layer is drawn: behind the artwork, then in front of it.
 *
 * The front layer is held well down, and this is a judgement rather than a
 * measurement. Physically the two halves of a strand are equally bright, but
 * the front half lands on a render that is already lit - and at parity it stops
 * reading as light passing over the modules and starts reading as a wireframe
 * drawn on top of them, which is what the first attempt at this looked like.
 * Half strength puts the strand on the object without taking the object away.
 */
const LAYER_GAIN = [1, 0.46];

/**
 * The dimmest brightness bucket allowed to cross in front of the artwork.
 *
 * Depth alone is not enough to decide the layer, and this is the rule that
 * finally made the modules read properly. A segment goes in front only if it is
 * near AND bright; anything dimmer is sent behind regardless of where it
 * actually is.
 *
 * That is a small lie about geometry and the truth about light. A filament at a
 * tenth of full brightness passing over a lit face contributes nothing an eye
 * would notice - but multiplied by the few hundred of them a frame it is a
 * milky veil that takes the edge off every cube, which is exactly what the
 * first two attempts at a front layer looked like. Behind the artwork the same
 * segments cost nothing and are occluded anyway.
 */
const FRONT_MIN_LEVEL = LEVELS - 3;

/** How bright a rider has to be to pass in front rather than behind. */
const FRONT_MIN_TONE = 1.05;

export default function HeroEnergy() {
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const backCanvas = backRef.current;
    const frontCanvas = frontRef.current;
    if (!backCanvas || !frontCanvas) return;
    const backCtx = backCanvas.getContext("2d");
    const frontCtx = frontCanvas.getContext("2d");
    if (!backCtx || !frontCtx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 900px)").matches;

    // High, and affordable only because of the binning and the static geometry.
    // The reference's texture comes from filaments overlapping, not from any
    // one of them.
    const SAMPLES = STEPS + 1;
    // All of them on desktop. These are not generated any more - each one is a
    // filament measured off the reference video - so the count is not a density
    // dial to be set to taste, it is how many the video turned out to have.
    const strands = buildField(narrow ? 201 : 620, SAMPLES);
    const palette = streamPalette();

    const TOTAL = strands.length * SAMPLES;

    /**
     * The two output layers. Index 0 is behind the artwork, index 1 in front.
     *
     * `rest` is that layer's resting field, rendered once - see paintRest.
     */
    const layers = [backCtx, frontCtx].map((ctx, i) => ({
      ctx,
      rest: document.createElement("canvas"),
      restCtx: null as CanvasRenderingContext2D | null,
      /** Only the back layer carries a resting surface - see paintRest. */
      hasRest: i === 0,
    }));
    layers.forEach((l) => (l.restCtx = l.rest.getContext("2d")));

    // ---- Geometry and everything else that does not move -----------------
    //
    // In the strands' own units, so a resize does not invalidate it, and with
    // no time term at all. Three floats per sample: x, y, depth.
    const shape = new Float32Array(TOTAL * 3);

    /**
     * The static brightness multiplier for each sample.
     *
     * The taper that turns a computed curve into a strand with no ends, times
     * the depth fade that makes near parts hotter than far ones, times the
     * light the modules throw on it. All three depend only on the strand's own
     * shape, so all three are folded out of the frame loop and into this table.
     */
    const tone = new Float32Array(TOTAL);

    /** Palette index at each sample - the colour ramp along the strand. */
    const hue = new Uint8Array(TOTAL);

    /** Which layer a sample belongs to: 1 in front of the artwork, 0 behind. */
    const layerOf = new Uint8Array(TOTAL);

    {
      for (let s = 0; s < strands.length; s += 1) {
        const strand = strands[s];
        const base = s * SAMPLES;
        const path = strand.path;

        // Depth is normalised per strand, because one strand rolls through a
        // far bigger range than another and a shared scale would flatten the
        // shallow ones to nothing.
        let deepest = 1e-6;
        for (let i = 0; i < SAMPLES; i += 1) {
          const mag = Math.abs(path[i * 3 + 2]);
          if (mag > deepest) deepest = mag;
        }

        for (let i = 0; i < SAMPLES; i += 1) {
          const at = (base + i) * 3;
          const x = path[i * 3];
          const y = path[i * 3 + 1];
          const depth = path[i * 3 + 2];
          shape[at] = x;
          shape[at + 1] = y;
          shape[at + 2] = depth;

          const t = i / STEPS;
          // Subtle Depth Luminosity: decreased background luminosity (0.15) and increased closer strand luminosity (1.12 max)
          const normZ = (depth / deepest) * 0.5 + 0.5;
          const fade = 0.15 + 0.97 * normZ;
          tone[base + i] = strandWindow(t) * fade * moduleGlow(x, y);
          hue[base + i] =
            Math.round(strand.colour + (strand.colourEnd - strand.colour) * t) | 0;

          // Well clear of zero, not merely positive.
          //
          // At `depth > 0` half of every strand crosses the artwork, and the
          // result is a wireframe laid over the render rather than a field the
          // render sits inside. Only the part of a strand that is genuinely
          // nearest the eye goes in front, which is also what the reference
          // shows: a filament ducks behind the cubes and reappears, and what
          // crosses the front faces is the closest quarter of its arc.
          layerOf[base + i] = depth > 0.55 * deepest ? 1 : 0;
        }
      }
    }

    /**
     * Every sample projected to canvas pixels: x, y per sample.
     *
     * The projection is the same two multiply-adds every frame for a table that
     * only changes on resize, so it is done on resize instead. Both layers and
     * the resting render read this one set of coordinates rather than each
     * computing their own and hoping they agree.
     */
    const screen = new Float32Array(TOTAL * 2);

    let width = 0;
    let height = 0;
    let scale = 1;
    let unit = 1;

    /** Where each light head on the current strand sits, this frame. */
    const headAt = new Float64Array(8);

    // ---- Stamps ----------------------------------------------------------
    //
    // Dust and light heads, tessellated once each and afterwards blitted. See
    // the cost note at the top: this is the pass that surprised the profiler.
    //
    // Three size classes rather than one, because the reference has them. Most
    // motes are pinpoints; a few are grains with a halo; a handful are frankly
    // out of focus, which is the detail that sells the field as something being
    // photographed rather than drawn.
    let moteStamps: HTMLCanvasElement[][] = [];
    const moteHalf = [0, 0, 0];
    let sparkStamps: HTMLCanvasElement[] = [];
    let sparkHalf = 0;

    const stamp = (
      reach: number,
      paint: (g: CanvasRenderingContext2D, mid: number) => void,
    ) => {
      const size = Math.max(2, Math.ceil(reach * 2));
      const layer = document.createElement("canvas");
      layer.width = size;
      layer.height = size;
      const g = layer.getContext("2d");
      if (g) {
        g.globalCompositeOperation = "lighter";
        paint(g, size / 2);
      }
      return layer;
    };

    const dot = (
      g: CanvasRenderingContext2D,
      mid: number,
      r: number,
      pen: number,
      rgb: readonly [number, number, number],
      core: number,
      halo: number,
    ) => {
      const [red, green, blue] = rgb;
      const path = new Path2D();
      path.moveTo(mid + r, mid);
      path.arc(mid, mid, r, 0, Math.PI * 2);
      // A wide faint outline standing in for a blur. No ctx.filter, and that is
      // not a shortcut: a canvas blur is a full-surface operation per call and
      // enough of them cost more than every stroke on the canvas put together.
      g.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${halo})`;
      g.lineWidth = pen;
      g.stroke(path);
      g.fillStyle = `rgba(${red}, ${green}, ${blue}, ${core})`;
      g.fill(path);
    };

    const buildStamps = () => {
      const fineR = 0.75 * unit;
      const grainR = 1.5 * unit;
      const bokehR = 4.6 * unit;

      moteHalf[Mote.Fine] = Math.max(2, Math.ceil((fineR + 1.2 * unit + 1) * 2)) / 2;
      moteHalf[Mote.Grain] = Math.max(2, Math.ceil((grainR + 2.4 * unit + 1) * 2)) / 2;
      moteHalf[Mote.Bokeh] = Math.max(2, Math.ceil((bokehR + 1) * 2)) / 2;

      moteStamps = palette.map((rgb) => [
        stamp(fineR + 1.2 * unit + 1, (g, mid) =>
          dot(g, mid, fineR, 2.4 * unit, rgb, 0.26, 0.05),
        ),
        stamp(grainR + 2.4 * unit + 1, (g, mid) =>
          dot(g, mid, grainR, 4.8 * unit, rgb, 0.32, 0.07),
        ),
        // OUT OF FOCUS. A soft disc with a slightly hotter rim, which is what a
        // real lens does to a point of light it cannot resolve - flat in the
        // middle, brightest at the edge. A plain gaussian blob reads as a smudge
        // instead.
        stamp(bokehR + 1, (g, mid) => {
          const [r, gg, b] = rgb;
          const grad = g.createRadialGradient(mid, mid, 0, mid, mid, bokehR);
          grad.addColorStop(0, `rgba(${r}, ${gg}, ${b}, 0.115)`);
          grad.addColorStop(0.62, `rgba(${r}, ${gg}, ${b}, 0.1)`);
          grad.addColorStop(0.86, `rgba(${r}, ${gg}, ${b}, 0.155)`);
          grad.addColorStop(1, `rgba(${r}, ${gg}, ${b}, 0)`);
          g.fillStyle = grad;
          g.beginPath();
          g.arc(mid, mid, bokehR, 0, Math.PI * 2);
          g.fill();
        }),
      ]);

      // THE HEAD. A hot core with a tinted halo and a faint anisotropic streak -
      // the reference's brightest points flare across rather than haloing
      // evenly, which is a lens artefact and reads as brightness the halo alone
      // does not.
      //
      // TINTED PER STRAND, not white. A single white stamp for every head put
      // two hundred and thirty identical specks across the field, and against
      // the artwork they read as dust on the lens rather than as light on a
      // filament - the one thing in an early build that most obviously did not
      // belong. In the reference a head is the colour of the strand carrying
      // it, with only the very centre hot enough to go white.
      const headR = 1.2 * unit;
      const reach = headR + 4.5 * unit + 1;
      sparkHalf = Math.max(2, Math.ceil(reach * 2)) / 2;
      sparkStamps = palette.map(([r, g, b]) =>
        stamp(reach, (c, mid) => {
          const path = new Path2D();
          path.moveTo(mid + headR, mid);
          path.arc(mid, mid, headR, 0, Math.PI * 2);
          c.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.05)`;
          c.lineWidth = 9 * unit;
          c.stroke(path);
          c.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.11)`;
          c.lineWidth = 3.6 * unit;
          c.stroke(path);

          const flare = c.createLinearGradient(mid - 4.5 * unit, mid, mid + 4.5 * unit, mid);
          const mix = `${(r + 510) / 3 | 0}, ${(g + 510) / 3 | 0}, ${(b + 510) / 3 | 0}`;
          flare.addColorStop(0, `rgba(${mix}, 0)`);
          flare.addColorStop(0.5, `rgba(${mix}, 0.2)`);
          flare.addColorStop(1, `rgba(${mix}, 0)`);
          c.fillStyle = flare;
          c.fillRect(mid - 4.5 * unit, mid - 0.3 * unit, 9 * unit, 0.6 * unit);

          c.fillStyle = `rgba(${mix}, 0.26)`;
          c.fill(path);
        }),
      );
    };

    // ---- The resting field, rendered once per layer -----------------------

    /**
     * Everything that is on the canvas when no light is running.
     *
     * Three things, and none of them can change until the canvas resizes: the
     * strands at their own quiet brightness; the AMBIENT HAZE, a very wide very
     * faint stroke along the same paths that fills the space between filaments;
     * and, behind the artwork only, the light the modules themselves throw.
     *
     * The haze is the reason this is worth caching rather than the strands.
     * Measured against the video, the reference's median pixel sits well above
     * black - there is air in it, lit air - and reproducing that with a stroke
     * fourteen units wide over two hundred strands is an enormous amount of
     * fill. Rendered once it is free; per frame it would be the most expensive
     * thing here by a wide margin.
     *
     * Caching is exact rather than approximate, which is why it is safe.
     * 'lighter' is addition, the layer starts transparent, and the output canvas
     * is cleared before this lands on it - so drawing into a surface and adding
     * that surface first gives what stroking straight onto the canvas gave, and
     * the light that follows still sums on top exactly as it did.
     */
    const paintRest = () => {
      // BEHIND ONLY, and whole - both halves of that matter.
      //
      // Behind, because the resting field is the quiet web every strand
      // contributes whether or not light is on it, and over the artwork that is
      // a veil: a hundred and fifty faint filaments across the cubes takes the
      // edge off every one of them and the render stops being the subject. In
      // the reference nothing dim ever crosses a front face. What you see over
      // the cubes is bright lit filament and the odd hot particle, and both of
      // those are drawn per frame, further down.
      //
      // Whole, because the web is not split by depth even though the light on
      // it is. Dropping the near samples from it would leave a gap in every
      // strand wherever it passes the artwork, and a web with holes in it reads
      // as broken rather than as occluded.
      const g = layers[0].restCtx;
      if (!g) return;

      layers[0].rest.width = width;
      layers[0].rest.height = height;

      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, width, height);
      g.globalCompositeOperation = "lighter";
      g.lineCap = "round";

      // The modules' own contribution to the air around them.
      for (const anchor of [MODULE_A, MODULE_B]) {
        const gx = width / 2 + anchor[0] * scale;
        const gy = height / 2 - anchor[1] * scale;
        const rad = 0.95 * scale;
        const grad = g.createRadialGradient(gx, gy, 0, gx, gy, rad);
        grad.addColorStop(0, "rgba(46, 84, 190, 0.14)");
        grad.addColorStop(0.45, "rgba(38, 66, 156, 0.065)");
        grad.addColorStop(1, "rgba(24, 40, 110, 0)");
        g.fillStyle = grad;
        g.beginPath();
        g.arc(gx, gy, rad, 0, Math.PI * 2);
        g.fill();
      }

      const bins: Array<Path2D | null> =
        new Array(palette.length * REST_LEVELS).fill(null);

      for (let s = 0; s < strands.length; s += 1) {
        const strand = strands[s];
        const base = s * SAMPLES;
        let run = -1;
        let px = screen[base * 2];
        let py = screen[base * 2 + 1];

        for (let i = 1; i < SAMPLES; i += 1) {
          const idx = base + i;
          const x = screen[idx * 2];
          const y = screen[idx * 2 + 1];
          const alpha = strand.base * tone[idx];
          if (alpha > 0.004) {
            const level = Math.min(
              REST_LEVELS - 1,
              ((alpha / REST_PEAK) * REST_LEVELS) | 0,
            );
            const slot = hue[idx] * REST_LEVELS + level;
            const path = bins[slot] ?? (bins[slot] = new Path2D());
            if (slot !== run) {
              path.moveTo(px, py);
              run = slot;
            }
            path.lineTo(x, y);
          } else {
            run = -1;
          }
          px = x;
          py = y;
        }
      }

      for (let c = 0; c < palette.length; c += 1) {
        const [r, gg, b] = palette[c];
        for (let level = 0; level < REST_LEVELS; level += 1) {
          const path = bins[c * REST_LEVELS + level];
          if (!path) continue;
          const alpha = ((level + 0.5) / REST_LEVELS) * REST_PEAK;

          // The haze (reduced glow by 10%)
          g.strokeStyle = `rgba(${r}, ${gg}, ${b}, ${(alpha * 0.144).toFixed(4)})`;
          g.lineWidth = 15 * unit;
          g.stroke(path);

          g.strokeStyle = `rgba(${r}, ${gg}, ${b}, ${(alpha * 0.36).toFixed(4)})`;
          g.lineWidth = 2.6 * unit;
          g.stroke(path);

          g.strokeStyle = `rgba(${r}, ${gg}, ${b}, ${alpha.toFixed(4)})`;
          g.lineWidth = 0.7 * unit;
          g.stroke(path);
        }
      }
    };

    /**
     * Nudges the whole field, in field units, before it is projected.
     *
     * The traced strands are warped onto the artwork's module anchors, but the
     * warp is only a two-point similarity - it does not know the artwork's
     * exact silhouette, and held against the actual render the wrap sits
     * slightly high and right of the cube edges it is meant to hug. Shifting
     * every sample the same amount down and left closes that gap without
     * touching the geometry: every strand keeps its shape, only where the
     * origin sits moves.
     */
    const OFFSET_X = 0.0;
    const OFFSET_Y = 0.0;

    /**
     * Turns the whole field about the artwork's own centre.
     */
    const ROTATE = 0.0;
    const ROT_COS = Math.cos(ROTATE);
    const ROT_SIN = Math.sin(ROTATE);

    /** Reprojects every sample and repaints the cached layers. Resize only. */
    const reproject = () => {
      const cx = width / 2 + OFFSET_X * scale;
      const cy = height / 2 - OFFSET_Y * scale;
      for (let i = 0; i < TOTAL; i += 1) {
        const sx = shape[i * 3];
        const sy = shape[i * 3 + 1];
        // Standard counter-clockwise rotation matrix in the field's own
        // frame; ROTATE is negative for clockwise, so this turns the field
        // clockwise on screen without touching the y-flip that follows.
        const rx = sx * ROT_COS - sy * ROT_SIN;
        const ry = sx * ROT_SIN + sy * ROT_COS;
        screen[i * 2] = cx + rx * scale;
        screen[i * 2 + 1] = cy - ry * scale;
      }
      buildStamps();
      paintRest();
    };

    const resize = () => {
      const box = backCanvas.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return false;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const fit = Math.min(1, MAX_PIXELS / (Math.max(box.width, box.height) * dpr));
      const w = Math.max(1, Math.round(box.width * dpr * fit));
      const h = Math.max(1, Math.round(box.height * dpr * fit));
      if (w === width && h === height) return false;

      width = w;
      height = h;
      // Strands are sized in units of the artwork's half-width, and the field
      // is FIELD_SCALE times the artwork - so one unit is this many pixels.
      scale = w / (2 * FIELD_SCALE);
      unit = (w / FIELD_SCALE) / 375;
      backCanvas.width = w;
      backCanvas.height = h;
      frontCanvas.width = w;
      frontCanvas.height = h;
      reproject();
      return true;
    };

    /**
     * Interpolated read of a rider's position between two samples.
     *
     * `hue` is read here rather than taken from the strand, and that is not a
     * detail. A strand's colour drifts along its length, so a mote two thirds of
     * the way down it is sitting on a different colour from the one the strand
     * started as - and in the reference every glowing orb is unmistakably the
     * colour of the filament it is riding. Stamping them all in the strand's
     * head colour put coral orbs on the blue end of coral strands.
     */
    const riding = { x: 0, y: 0, front: 0, tone: 0, hue: 0 };
    const rideAt = (base: number, where: number) => {
      const f = (where - Math.floor(where)) * STEPS;
      const i0 = Math.min(STEPS - 1, f | 0);
      const k = f - i0;
      const a = base + i0;
      const b = a + 1;
      riding.x = screen[a * 2] + (screen[b * 2] - screen[a * 2]) * k;
      riding.y = screen[a * 2 + 1] + (screen[b * 2 + 1] - screen[a * 2 + 1]) * k;
      riding.tone = tone[a] + (tone[b] - tone[a]) * k;
      riding.hue = hue[k < 0.5 ? a : b];
      // Same rule as the segments: near AND bright, or it passes behind.
      riding.front =
        layerOf[k < 0.5 ? a : b] === 1 && riding.tone >= FRONT_MIN_TONE ? 1 : 0;
    };

    const draw = (seconds: number) => {
      for (let which = 0; which < 2; which += 1) {
        const { ctx, rest, hasRest } = layers[which];
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);
        // Light adds. Anything else and overlapping filaments would occlude
        // each other instead of compounding into the brighter cores the
        // reference has wherever several strands cross.
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        // Only the back layer has a resting surface - see paintRest. Blitting
        // the front one anyway is a full-canvas composite of nothing.
        if (hasRest) ctx.drawImage(rest, 0, 0);
      }

      // Two sets of buckets, one per layer. A strand contributes to both,
      // segment by segment, as it winds past the artwork.
      const lines: Array<Path2D | null> =
        new Array(2 * palette.length * LEVELS).fill(null);

      for (let s = 0; s < strands.length; s += 1) {
        const strand = strands[s];
        const flow = seconds * strand.flow + strand.phase;
        const base = s * SAMPLES;

        // Where the heads are, once per strand rather than once per segment.
        // The wrap and the divide were being redone for every sample for an
        // answer that is fixed for the whole strand.
        const heads = strand.heads;
        for (let h = 0; h < heads; h += 1) headAt[h] = (flow + h / heads) % 1;

        // The bucket the run currently being extended belongs to, or -1 when
        // there is no open run. Contiguous segments in one bucket become a
        // single polyline, so joints are not covered twice by a pair of
        // overlapping round caps.
        let run = -1;
        let px = screen[base * 2];
        let py = screen[base * 2 + 1];

        for (let i = 1; i < SAMPLES; i += 1) {
          const idx = base + i;
          const x = screen[idx * 2];
          const y = screen[idx * 2 + 1];
          const t = i / STEPS;

          // How lit this segment is: the nearest light head running the strand.
          let lit = 0;
          for (let h = 0; h < heads; h += 1) {
            // Distance behind the head, wrapped. The taper takes both ends of a
            // strand to nothing, so the wrap is never visible - a head fades out
            // past the tail and fades in again at the head.
            const behind = (headAt[h] - t + 1) % 1;
            // Cubic rather than Math.pow. This runs about twenty thousand times
            // a frame and pow is the single most expensive thing in the loop;
            // three multiplies give the same long tail.
            const fall = 1 - behind * 1.9;
            if (fall > 0) {
              const cube = fall * fall * fall;
              if (cube > lit) lit = cube;
            }
          }

          // The resting layer already covers the quiet brightness, so this pass
          // adds only what the travelling light contributes. Including the base
          // again would double it everywhere and flatten the flow out.
          const alpha = lit * 0.85 * tone[idx];
          if (alpha > 0.02) {
            const level = Math.min(LEVELS - 1, ((alpha / PEAK_ALPHA) * LEVELS) | 0);
            // Near AND bright, or it goes behind. See FRONT_MIN_LEVEL.
            const front = layerOf[idx] === 1 && level >= FRONT_MIN_LEVEL ? 1 : 0;
            const slot = (front * palette.length + hue[idx]) * LEVELS + level;
            const path = lines[slot] ?? (lines[slot] = new Path2D());
            if (slot !== run) {
              path.moveTo(px, py);
              run = slot;
            }
            path.lineTo(x, y);
          } else {
            run = -1;
          }

          px = x;
          py = y;
        }

        // THE HEAD. Stamped at its exact position on every frame, so the bright
        // point at the front of each run of light is continuously lit rather
        // than appearing only on the frames a sample lands near it.
        //
        // Stamped here in the strand loop rather than gathered up and drawn at
        // the end. Nothing is lost by that: 'lighter' is a sum, and a sum does
        // not care what order it was accumulated in.
        //
        // Held to where the field is actually bright. A head on the thin end of
        // a strand out in the corner is a speck with nothing around it; in the
        // reference the hot points cluster where the flow does, around the
        // modules, and thin out to nothing at the edges. `tone` already encodes
        // exactly that, so it is also the gate.
        for (let h = 0; h < heads; h += 1) {
          rideAt(base, headAt[h]);
          if (riding.tone < 0.85) continue;
          const spark = sparkStamps[riding.hue];
          if (!spark) continue;
          layers[riding.front].ctx.drawImage(
            spark,
            riding.x - sparkHalf,
            riding.y - sparkHalf,
          );
        }

        // DUST. The reference is mostly this - fine points riding the strands,
        // carrying more of its texture than the lines do. Interpolated for the
        // same reason as the head: snapped to samples they jump a step at a
        // time instead of drifting.
        const motes = strand.motes;
        for (let m = 0; m < motes.length; m += 3) {
          rideAt(base, flow * 0.72 + motes[m]);
          if (riding.tone < 0.06) continue;
          const stamps = moteStamps[riding.hue];
          if (!stamps) continue;
          const kind = motes[m + 1] | 0;
          const half = moteHalf[kind];
          layers[riding.front].ctx.drawImage(
            stamps[kind],
            riding.x - half,
            riding.y - half,
          );
        }
      }

      // ---- Strokes, with the glow ---------------------------------------
      //
      // THREE passes per bucket, and the wide ones are the whole effect. A
      // single stroke gives a clean line and a clean line is not a glow; light
      // has a hot core and a soft shoulder that falls away over several times
      // the core's width. Drawn under 'lighter' the shoulders of neighbouring
      // filaments sum, which is where the haze between the strands comes from.
      //
      // Cheap because it is per BUCKET, not per segment - three strokes of a
      // batched path rather than three of every line in it.
      for (let which = 0; which < 2; which += 1) {
        const ctx = layers[which].ctx;
        for (let c = 0; c < palette.length; c += 1) {
          const [r, g, b] = palette[c];
          for (let level = 0; level < LEVELS; level += 1) {
            const path = lines[(which * palette.length + c) * LEVELS + level];
            if (!path) continue;

            const lit = (level + 0.5) / LEVELS;
            const alpha = lit * PEAK_ALPHA * LAYER_GAIN[which];
            // Finer than it was. The reference's filaments are hair - a great
            // many of them, each barely a pixel - and the density that gives is
            // not reachable with heavier lines at any count the frame can
            // afford. Thinner also buys back most of what the higher strand
            // count costs, since fill is width times length.
            const core = (0.36 + lit * 0.82) * unit;

            // Outer bloom, brightest TWO buckets only.
            //
            // A stroke six times the core width over paths this long covers an
            // enormous area, and running it on the lower buckets as well took
            // the frame rate to 23. It is also the pass that does the least
            // there: a halo on a filament that is barely visible is fog.
            if (level >= LEVELS - 2) {
              ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.0765).toFixed(3)})`;
              ctx.lineWidth = core * 6;
              ctx.stroke(path);
            }

            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.198).toFixed(3)})`;
            ctx.lineWidth = core * 3;
            ctx.stroke(path);

            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = core;
            ctx.stroke(path);
          }
        }
      }
    };

    let raf = 0;
    let running = false;
    const started = performance.now();
    let lastDrawn = -Infinity;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // Held to FPS. The rAF clock is whatever the display runs at - 120 and
      // 144Hz panels were being asked for two and a half times the work for
      // motion this slow. The slack allows a frame that lands fractionally
      // early rather than pushing it out a whole interval.
      if (now - lastDrawn < FRAME_MS - 2) return;
      lastDrawn = now;
      draw((now - started) / 1000);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    draw(0);

    // Only while the hero is on screen. The page scrolls forever, so a reader
    // three sections down would otherwise still be paying for this.
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: "100px" },
    );
    observer.observe(backCanvas);

    // A ResizeObserver rather than a resize listener plus a per-frame measure.
    //
    // The old loop called getBoundingClientRect at the top of every frame to
    // find out whether anything had changed. That is a forced layout, taken
    // sixty times a second, on a page whose scroller is transforming the
    // document underneath it - and the answer was no every time but the first.
    const sizeObserver = new ResizeObserver(() => {
      if (resize() && !running) draw(0);
    });
    sizeObserver.observe(backCanvas);

    return () => {
      observer.disconnect();
      sizeObserver.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <canvas ref={backRef} className="hero__art-field" aria-hidden="true" />
      <canvas
        ref={frontRef}
        className="hero__art-field hero__art-field--front"
        aria-hidden="true"
      />
    </>
  );
}
