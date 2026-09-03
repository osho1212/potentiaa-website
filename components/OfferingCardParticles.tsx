"use client";

import { useEffect, useRef } from "react";
import ParticleCardBackground from "@/lib/particleCardBackground";
import { onScrollFrame } from "@/lib/scrollState";

/**
 * The offerings section's background: particles scattered across the whole
 * section that converge into the card - and into the section's heading - as
 * the reader scrolls it into view.
 *
 * SCROLL DRIVES THE FORMATION, not a timer. Progress is read from where the
 * card sits in the viewport every frame, so the field assembles under the
 * reader's own scrolling and runs backwards if they scroll back up. That also
 * means there is no duration to tune - it takes exactly as long as they take.
 *
 * The canvas fills the section rather than the card, for two reasons: the
 * particles start scattered across the whole section and need the room, and a
 * canvas clips its own drawing, so sizing it to the section is what keeps the
 * scatter from spilling into the sections above and below. The effect is told
 * where the CARD is within that canvas - see setCardRect in
 * lib/particleCardBackground - so the field converges onto the element it is
 * standing in for, at any viewport size and through offering tab changes.
 *
 * CONSTRUCTION IS DEFERRED until the section is near the viewport. Building the
 * buffer is a ~260,000 iteration loop and a ~9MB allocation; small, but with no
 * business running during initial page load for a section three screens down.
 *
 * The content reveal and the heading handoff are driven from the same progress
 * value, so the copy arrives behind the formation front rather than on an
 * independent clock. Everything is fully visible by DEFAULT and is only ever
 * dimmed once this effect is running, so a WebGL failure, a blocked script or
 * reduced motion leaves the section completely readable - the reveal is
 * decoration over working content, never a gate in front of it.
 */

/**
 * The scroll window the formation is mapped onto. Both numbers are where the
 * CARD'S TOP EDGE sits, as a fraction of viewport height.
 *
 * Measuring against the section does not work, and it is worth recording why:
 * the card is vertically centred in a full-viewport section, so the section's
 * top edge crosses the viewport long before the card does. Mapping progress to
 * the section put the card at 0.91 formed by the time it had even appeared -
 * the whole convergence happened below the fold.
 *
 * The gap between 1.0 (the card level with the bottom of the screen) and
 * FORM_START is a HOLD: the reader scrolls the scattered field into view and
 * gets to see it drifting before anything begins to gather. Formation then
 * runs over the window down to FORM_END - and it is THIS window's width, not
 * the hold's, that sets how much physical scrolling it takes to watch the
 * card assemble, since the card moves through the viewport at a fixed rate
 * per pixel scrolled regardless of where the window sits.
 *
 * FORM_START was 0.6 originally (a 0.35 window - fast enough that a normal
 * scroll gesture could carry a reader past the assembly before they
 * registered it was happening), then 0.8 (0.55). Raised again to 0.92: the
 * window is now 0.67, essentially the whole approach, so the reader spends
 * nearly the entire time the card is on screen watching it gather rather
 * than scrolling past a mostly-inert hold. The hold is not zeroed - a small
 * one (0.08) is kept on purpose, so the scattered field still gets a
 * beat on screen before it starts moving with intent; at FORM_START 1.0 the
 * two would blur into each other and formation would seem to start the
 * instant the section appears, before the reader has registered the field
 * at all. Taken from the hold, not by moving FORM_END, so the card still
 * finishes forming at the same screen position - only the hold shrinks.
 *
 * FORM_END has to clear the card's resting position, which is about 0.22 on a
 * 900px viewport. Ending at 0.25 means the card is solid just before the
 * section settles, so the reader never arrives at a half-built card, and small
 * scroll jitter around the rest position cannot pull it back apart. Left
 * untouched here for exactly that reason - it is a floor, not a dial.
 */
const FORM_START = 0.92;
const FORM_END = 0.25;

/** Progress window each content block fades in over, as [start, end]. */
const CONTENT_STEPS = 5;
const CONTENT_START = 0.2;
const CONTENT_STAGGER = 0.13;
const CONTENT_FADE = 0.28;

/**
 * Sampling stride for the heading glyphs, in CSS pixels.
 *
 * ONE SAMPLE PER PIXEL, PAIRED WITH SMALLER DOTS - see TEXT_DOT_SCALE in
 * lib/particleCardBackground, which carries the measurements for both. The two
 * cannot be tuned apart: a dot grid needs dots of at least stride*sqrt(2) to
 * close without holes, so tightening the stride alone changes nothing and
 * shrinking the dots alone opens the strokes up.
 *
 * At stride 2 the eyebrow reached only 0.857 of its own glyph pixels, at 217
 * mean alpha - patchy and dimmer than the text it hands over to. Stride 1
 * doubles the sample density in each axis, which is what lets the dots come
 * down to 0.70 while still measuring full coverage at full brightness.
 *
 * Cost is bounded by MAX_GLYPH_POINTS below: one sample per ink pixel is about
 * 8,500 points for these two headings, well inside that ceiling.
 */
const GLYPH_STRIDE = 1;

/** Ceiling on heading particles, so a very large viewport cannot run away. */
const MAX_GLYPH_POINTS = 24000;

/** Progress window over which the particle lettering hands off to real text. */
const TEXT_HANDOFF_START = 0.78;
const TEXT_HANDOFF_END = 0.97;

export default function OfferingCardParticles({
  sectionRef,
  targetRef,
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
  targetRef: React.RefObject<HTMLElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    const target = targetRef.current;
    if (!canvas || !section || !target) return;

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let effect: ParticleCardBackground | null = null;
    let sizeObserver: ResizeObserver | null = null;
    let unsubscribeScroll: (() => void) | null = null;
    let disposed = false;
    let steps: HTMLElement[] = [];
    let headings: HTMLElement[] = [];

    /** The card's rect expressed against the canvas's own box. */
    const pushRect = () => {
      if (!effect) return;
      const canvasBox = canvas.getBoundingClientRect();
      const cardBox = target.getBoundingClientRect();
      if (canvasBox.width <= 0 || cardBox.width <= 0) return;

      effect.setCardRect({
        centerX: cardBox.left - canvasBox.left + cardBox.width / 2,
        centerY: cardBox.top - canvasBox.top + cardBox.height / 2,
        halfWidth: cardBox.width / 2,
        halfHeight: cardBox.height / 2,
      });
    };

    /**
     * Where an element will SIT ONCE IT HAS ARRIVED, not where an entrance
     * animation currently has it.
     *
     * getBoundingClientRect reports the post-transform box, and the headings
     * are wrapped in <Reveal>, which holds them at translate3d(0, 28px, 0)
     * until it plays. The two observers do not fire together and cannot be
     * made to: this effect builds at rootMargin 600px so the buffer is ready
     * before the section is near, while Reveal plays at rootMargin 80px on the
     * heading itself - about 650px of scrolling later. So the glyphs were
     * always rasterised while the heading was still held 28px low, and that
     * offset was baked into the particle destinations permanently. It showed
     * as particle lettering sitting below the real text it hands over to.
     *
     * Subtracting the live transform gives the settled box whatever state the
     * animation is in, which is what the destinations have to be measured
     * against. Translation only - every reveal variant a heading uses is a
     * pure translate; a scaling ancestor would need the full matrix inverted.
     */
    const settledRect = (el: HTMLElement): DOMRect => {
      const box = el.getBoundingClientRect();
      let dx = 0;
      let dy = 0;
      for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        const transform = getComputedStyle(node).transform;
        if (transform && transform !== "none") {
          const m = new DOMMatrixReadOnly(transform);
          dx += m.m41;
          dy += m.m42;
        }
        if (node === section) break;
      }
      return new DOMRect(box.left - dx, box.top - dy, box.width, box.height);
    };

    /**
     * Turn the section's heading elements into particle destinations.
     *
     * The text is drawn to an offscreen 2D canvas at the same place and size it
     * occupies on the page, then its opaque pixels are sampled on a grid.
     * Reading the computed font, weight, spacing and alignment off each element
     * is what keeps the particle lettering identical to the type it hands over
     * to - hard-coding any of it would drift the moment the design changed.
     */
    const sampleHeadings = (): Float32Array | null => {
      const canvasBox = canvas.getBoundingClientRect();
      if (canvasBox.width <= 0 || canvasBox.height <= 0 || headings.length === 0) return null;

      const off = document.createElement("canvas");
      off.width = Math.round(canvasBox.width);
      off.height = Math.round(canvasBox.height);
      const ctx = off.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;

      ctx.fillStyle = "#fff";
      for (const el of headings) {
        const box = settledRect(el);
        if (box.width <= 0) continue;
        const cs = getComputedStyle(el);
        const raw = el.textContent || "";
        const text = cs.textTransform === "uppercase" ? raw.toUpperCase() : raw;
        if (!text.trim()) continue;

        ctx.font = [cs.fontStyle, cs.fontWeight, cs.fontSize, cs.fontFamily].join(" ");
        /* letterSpacing is missing from the 2D context type in some lib.dom
           versions, but the eyebrow leans on it heavily: without it the sampled
           glyphs sit at the wrong pitch and the handoff visibly jumps. */
        (ctx as unknown as { letterSpacing: string }).letterSpacing = cs.letterSpacing;
        ctx.textBaseline = "middle";

        const align =
          cs.textAlign === "center" ? "center" : cs.textAlign === "right" ? "right" : "left";
        ctx.textAlign = align;
        const left = box.left - canvasBox.left;
        const x =
          align === "center" ? left + box.width / 2 : align === "right" ? left + box.width : left;
        ctx.fillText(text, x, box.top - canvasBox.top + box.height / 2);
      }

      const image = ctx.getImageData(0, 0, off.width, off.height).data;
      const out: number[] = [];
      const step = Math.max(1, Math.round(GLYPH_STRIDE));
      for (let y = 0; y < off.height && out.length < MAX_GLYPH_POINTS * 2; y += step) {
        for (let x = 0; x < off.width; x += step) {
          if (image[(y * off.width + x) * 4 + 3] > 128) {
            out.push(x, y);
            if (out.length >= MAX_GLYPH_POINTS * 2) break;
          }
        }
      }
      return out.length >= 2 ? new Float32Array(out) : null;
    };

    const pushHeadings = () => {
      if (!effect) return;
      effect.setTextTargets(sampleHeadings());
    };

    const applyContent = (progress: number) => {
      for (let i = 0; i < steps.length; i++) {
        const start = CONTENT_START + i * CONTENT_STAGGER;
        const t = Math.min(1, Math.max(0, (progress - start) / CONTENT_FADE));
        /* Cubic ease-out, so a block arrives softly rather than tracking the
           scroll linearly and feeling mechanical. */
        const eased = 1 - Math.pow(1 - t, 3);
        steps[i].style.opacity = String(eased);
        steps[i].style.transform = "translateY(" + (1 - eased) * 12 + "px)";
      }

      /* The real heading fades in exactly as the particle lettering fades out
         (see the handoff note in the fragment shader). Both are white glyphs in
         the same position, so the crossover is invisible - what it buys is that
         the reader ends up with selectable, accessible, properly hinted text
         rather than a permanent approximation of it.

         THE TWO CURVES HAVE TO BE THE SAME CURVE, and this one was linear while
         the shader's was a smoothstep. "Exactly as" was the intent and not what
         the code did: the pair only agreed at the two ends and at the midpoint,
         and in between their sum ran to 1.09 early and 0.89 late. A crossfade
         whose halves do not sum to 1 is a brightness ramp, so the heading
         swelled and then sagged on the way through - visible precisely because
         both layers are the same white glyphs, which is what was supposed to
         make it invisible. Same smoothstep here, so the sum is 1 throughout. */
      const t = Math.min(
        1,
        Math.max(0, (progress - TEXT_HANDOFF_START) / (TEXT_HANDOFF_END - TEXT_HANDOFF_START)),
      );
      const handoff = t * t * (3 - 2 * t);
      for (const el of headings) el.style.opacity = String(handoff);
    };

    const clearContent = () => {
      for (const el of steps) {
        el.style.opacity = "";
        el.style.transform = "";
      }
      /* Back to the stylesheet's value, so the heading is visible again if the
         effect is ever torn down. */
      for (const el of headings) el.style.opacity = "";
    };

    /**
     * How far the card has risen through the viewport, as 0..1. Read from the
     * live rect rather than from a scroll offset, because the page uses smooth
     * scrolling - the visual position keeps easing after the scroll events
     * have stopped, and sampling the rect follows that exactly.
     */
    const readProgress = () => {
      const rect = target.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const top = rect.top / viewport;
      return Math.min(1, Math.max(0, (FORM_START - top) / (FORM_START - FORM_END)));
    };

    /**
     * Driven by lib/scrollState's shared per-frame publisher rather than an
     * independent requestAnimationFrame loop of its own.
     *
     * The page's scrolling IS this callback's clock: SmoothScroll drives Lenis
     * inside its own rAF and calls emitScrollFrame() once the transform for
     * that frame has been applied, so subscribing here runs this section's
     * progress read in the same pass instead of racing it in a second,
     * uncoordinated rAF loop. That matters for more than tidiness - a second
     * loop meant this component's own WebGL draw (up to ~500,000 particles)
     * competed with Lenis for the same frame budget, and because Lenis's own
     * scroll-position update is just as rAF-gated, a frame this component made
     * late was a frame the SCROLL ITSELF arrived late, which read as stutter.
     * It also means this only runs while something is actually scrolling -
     * Lenis emits nothing while at rest - rather than unconditionally at 60fps
     * for as long as the section is merely near the viewport.
     */
    const update = () => {
      if (disposed || !effect) return;

      const progress = readProgress();
      effect.setProgress(progress);
      applyContent(progress);

      /* Stop listening once the section is nowhere near the viewport - the
         effect's own observer has already stopped it drawing, and there is
         nothing left to scrub. The approach observer below restarts this the
         next time the section comes back within range. */
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      if (!(rect.bottom > -viewport && rect.top < viewport * 2)) {
        stopTracking();
      }
    };

    const startTracking = () => {
      if (disposed || unsubscribeScroll || reducedMotion) return;
      unsubscribeScroll = onScrollFrame(update);
      /* Registers the section's current position immediately, rather than
         waiting for the next scroll movement - it may already be in view with
         nothing left to scroll. */
      update();
    };

    const stopTracking = () => {
      unsubscribeScroll?.();
      unsubscribeScroll = null;
    };

    const build = () => {
      /* React Strict Mode mounts, cleans up and mounts again in development,
         and the observer can fire after the cleanup has run. */
      if (disposed || effect) return false;

      try {
        effect = new ParticleCardBackground(canvas);
      } catch {
        /* No WebGL2. The card keeps its own styling, has no background field,
           and - because nothing ever touches the content's opacity - the whole
           section stays readable. */
        return false;
      }

      steps = Array.from(target.querySelectorAll<HTMLElement>("[data-form-step]")).slice(
        0,
        CONTENT_STEPS,
      );
      headings = Array.from(section.querySelectorAll<HTMLElement>("[data-form-heading]"));
      pushRect();
      pushHeadings();

      /* AND AGAIN ONCE THE FONTS LAND. Rasterising the heading against a
         fallback face samples the wrong glyph shapes, and the mismatch only
         shows at the handoff - when the particle lettering dissolves into real
         text of a different width. */
      if (document.fonts && document.fonts.status !== "loaded") {
        document.fonts.ready.then(() => {
          if (!disposed) pushHeadings();
        });
      }

      if (reducedMotion) {
        /* Formed, immediately, with no scrubbing and no reveal. */
        effect.setProgress(1);
      }

      /* Both boxes matter: the card changes height when offering tabs are
         switched, and the section changes with the viewport. */
      sizeObserver = new ResizeObserver(() => {
        pushRect();
        /* The heading's size and position are viewport-dependent, so its glyph
           samples are stale the moment the card's box changes. */
        pushHeadings();
      });
      sizeObserver.observe(target);
      sizeObserver.observe(canvas);
      return true;
    };

    const approach = new IntersectionObserver(
      (entries) => {
        if (!entries[entries.length - 1].isIntersecting) return;
        if (!effect) build();
        startTracking();
      },
      { rootMargin: "600px 0px" },
    );
    approach.observe(section);

    return () => {
      disposed = true;
      approach.disconnect();
      sizeObserver?.disconnect();
      stopTracking();
      clearContent();
      effect?.destroy();
      effect = null;
    };
  }, [sectionRef, targetRef]);

  return <canvas ref={canvasRef} className="offering-particles" aria-hidden="true" />;
}
