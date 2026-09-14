"use client";

import { useEffect, useRef } from "react";
import MultiParticleCardBackground, { CardRect } from "@/lib/multiParticleCardBackground";
import { onScrollFrame } from "@/lib/scrollState";

const FORM_START = 0.92;
const FORM_END = 0.25;

const CONTENT_STEPS = 6;
const CONTENT_START = 0.18;
const CONTENT_STAGGER = 0.12;
const CONTENT_FADE = 0.28;

const GLYPH_STRIDE = 1;
const MAX_GLYPH_POINTS = 24000;
const TEXT_HANDOFF_START = 0.78;
const TEXT_HANDOFF_END = 0.97;

export default function WorkCardParticles({
  sectionRef,
  gridRef,
  cardsRef,
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
  gridRef: React.RefObject<HTMLElement | null>;
  cardsRef: React.RefObject<(HTMLElement | null)[]>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    const grid = gridRef.current;
    if (!canvas || !section || !grid) return;

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let effect: MultiParticleCardBackground | null = null;
    let sizeObserver: ResizeObserver | null = null;
    let unsubscribeScroll: (() => void) | null = null;
    let disposed = false;
    let steps: HTMLElement[] = [];
    let headings: HTMLElement[] = [];

    /** Invert live parent transforms to find settled target box */
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

    const pushRects = () => {
      if (!effect) return;
      const canvasBox = canvas.getBoundingClientRect();
      if (canvasBox.width <= 0) return;

      const cardEls = cardsRef.current || [];
      const rects: CardRect[] = [];

      for (const card of cardEls) {
        if (!card) continue;
        const box = settledRect(card);
        if (box.width <= 0) continue;
        rects.push({
          centerX: box.left - canvasBox.left + box.width / 2,
          centerY: box.top - canvasBox.top + box.height / 2,
          halfWidth: box.width / 2,
          halfHeight: box.height / 2,
        });
      }

      if (rects.length > 0) {
        effect.setCardRects(rects);
      }
    };

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
        const eased = 1 - Math.pow(1 - t, 3);
        steps[i].style.opacity = String(eased);
        steps[i].style.transform = `translateY(${(1 - eased) * 14}px)`;
      }

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
      for (const el of headings) el.style.opacity = "";
    };

    const readProgress = () => {
      const rect = grid.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const top = rect.top / viewport;
      return Math.min(1, Math.max(0, (FORM_START - top) / (FORM_START - FORM_END)));
    };

    const update = () => {
      if (disposed || !effect) return;
      pushRects();
      const progress = readProgress();
      effect.setProgress(progress);
      applyContent(progress);

      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      if (!(rect.bottom > -viewport && rect.top < viewport * 2)) {
        stopTracking();
      }
    };

    const startTracking = () => {
      if (disposed || unsubscribeScroll || reducedMotion) return;
      unsubscribeScroll = onScrollFrame(update);
      update();
    };

    const stopTracking = () => {
      unsubscribeScroll?.();
      unsubscribeScroll = null;
    };

    const build = () => {
      if (disposed || effect) return false;

      try {
        effect = new MultiParticleCardBackground(canvas);
      } catch {
        return false;
      }

      steps = Array.from(section.querySelectorAll<HTMLElement>("[data-form-step]")).slice(
        0,
        CONTENT_STEPS
      );
      headings = Array.from(section.querySelectorAll<HTMLElement>("[data-form-heading]"));

      pushRects();
      pushHeadings();

      if (document.fonts && document.fonts.status !== "loaded") {
        document.fonts.ready.then(() => {
          if (!disposed) pushHeadings();
        });
      }

      if (reducedMotion) {
        effect.setProgress(1);
      }

      sizeObserver = new ResizeObserver(() => {
        pushRects();
        pushHeadings();
      });
      sizeObserver.observe(canvas);
      sizeObserver.observe(grid);
      const cardEls = cardsRef.current || [];
      for (const card of cardEls) {
        if (card) sizeObserver.observe(card);
      }
      return true;
    };

    const approach = new IntersectionObserver(
      (entries) => {
        if (!entries[entries.length - 1].isIntersecting) return;
        if (!effect) build();
        startTracking();
      },
      { rootMargin: "600px 0px" }
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
  }, [sectionRef, gridRef, cardsRef]);

  return <canvas ref={canvasRef} className="offering-particles" aria-hidden="true" />;
}
