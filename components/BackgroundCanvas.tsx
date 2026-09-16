"use client";

import { useEffect, useRef } from "react";
import { onScrollFrame, scrollState } from "@/lib/scrollState";

const FRAME_COUNT = 240;

function framePath(index: number): string {
  return `/assets/space-frames/frame_${String(index).padStart(4, "0")}.webp`;
}

/**
 * Ultra-smooth 240-frame canvas player for the deep space sequence.
 *
 * Silky 60-120fps bi-directional scrubbing tied directly to scroll progress.
 * Frames advance as user scrolls down, and cleanly reverse when scrolling up.
 * Statically anchored in the viewport without vertical drift or parallax motion.
 */
export default function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(FRAME_COUNT).fill(null));
  const currentFrameRef = useRef(0);
  const targetFrameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const images = imagesRef.current;
    let isDisposed = false;

    // Helper to find the best available frame if target is still loading
    const getBestAvailableFrame = (index: number): HTMLImageElement | null => {
      const idx = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(index)));
      if (images[idx]?.complete && images[idx]?.naturalWidth) return images[idx];

      // Outward search for nearest loaded frame
      for (let offset = 1; offset < FRAME_COUNT; offset++) {
        const left = idx - offset;
        const right = idx + offset;
        if (left >= 0 && images[left]?.complete && images[left]?.naturalWidth) return images[left];
        if (right < FRAME_COUNT && images[right]?.complete && images[right]?.naturalWidth) return images[right];
      }
      return null;
    };

    // Draw frame onto canvas centered without vertical translation
    const draw = (frameIndex: number) => {
      const img = getBestAvailableFrame(frameIndex);
      if (!img) return;

      const cw = canvas.width;
      const ch = canvas.height;

      // Pure aspect-fill cover
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.drawImage(img, dx, dy, dw, dh);
    };

    // Handle canvas sizing with devicePixelRatio for sharp display
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      draw(currentFrameRef.current);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 1. Immediately preload the first batch of frames (0..24) for instant, seamless initial scroll
    const INITIAL_BATCH = 24;
    for (let i = 0; i < INITIAL_BATCH; i++) {
      const img = new Image();
      img.src = framePath(i);
      img.onload = () => {
        if (!isDisposed) {
          images[i] = img;
          if (i === 0 && currentFrameRef.current === 0) {
            draw(0);
          }
        }
      };
    }

    // 2. Progressively stream remaining frames in the background without blocking main thread
    let nextIdx = INITIAL_BATCH;
    const loadNextBatch = () => {
      if (isDisposed || nextIdx >= FRAME_COUNT) return;
      const end = Math.min(FRAME_COUNT, nextIdx + 12);
      for (let i = nextIdx; i < end; i++) {
        const img = new Image();
        img.src = framePath(i);
        img.onload = () => {
          if (!isDisposed) images[i] = img;
        };
      }
      nextIdx = end;
      if (nextIdx < FRAME_COUNT) {
        if ("requestIdleCallback" in window) {
          (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(loadNextBatch);
        } else {
          setTimeout(loadNextBatch, 60);
        }
      }
    };

    if ("requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(loadNextBatch);
    } else {
      setTimeout(loadNextBatch, 80);
    }

    if (reduced) {
      return () => {
        isDisposed = true;
        window.removeEventListener("resize", resizeCanvas);
      };
    }

    // Subscribe to Lenis scroll engine
    const unsubscribe = onScrollFrame(() => {
      const p = Math.max(0, Math.min(1, scrollState.progress));
      targetFrameRef.current = p * (FRAME_COUNT - 1);
    });

    let rafId = 0;
    let lastRenderedFrame = -1;

    const tick = () => {
      const frameDiff = targetFrameRef.current - currentFrameRef.current;

      // Smooth interpolation for 240 dense frames
      if (Math.abs(frameDiff) > 0.01) {
        currentFrameRef.current += frameDiff * 0.16;

        const rounded = Math.round(currentFrameRef.current);
        if (rounded !== lastRenderedFrame) {
          draw(currentFrameRef.current);
          lastRenderedFrame = rounded;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      unsubscribe();
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="site-background-canvas" aria-hidden="true">
      <canvas ref={canvasRef} className="site-background-canvas__media" />
      <div className="site-background-canvas__aurora" />
    </div>
  );
}
