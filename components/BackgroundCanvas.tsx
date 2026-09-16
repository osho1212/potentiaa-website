"use client";

import { useEffect, useRef } from "react";
import { onScrollFrame, scrollState } from "@/lib/scrollState";

const FRAME_COUNT = 120;

function framePath(index: number): string {
  return `/assets/space-frames/frame_${String(index).padStart(4, "0")}.webp`;
}

/**
 * High-performance canvas player for the deep space frame sequence.
 *
 * Silky 60-120fps bi-directional scrubbing tied directly to scroll progress.
 * Frames advance as user scrolls down, and cleanly reverse when scrolling up.
 * Includes smooth requestAnimationFrame lerp, parallax Y offset, and watermark crop.
 */
export default function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(FRAME_COUNT).fill(null));
  const currentFrameRef = useRef(0);
  const targetFrameRef = useRef(0);
  const currentParallaxRef = useRef(0);
  const targetParallaxRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Track loaded images
    const images = imagesRef.current;
    let isDisposed = false;

    // Helper to find the best available frame if target is still loading
    const getBestAvailableFrame = (index: number): HTMLImageElement | null => {
      const idx = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(index)));
      if (images[idx]?.complete && images[idx]?.naturalWidth) return images[idx];

      // Search outward for nearest loaded frame
      for (let offset = 1; offset < FRAME_COUNT; offset++) {
        const left = idx - offset;
        const right = idx + offset;
        if (left >= 0 && images[left]?.complete && images[left]?.naturalWidth) return images[left];
        if (right < FRAME_COUNT && images[right]?.complete && images[right]?.naturalWidth) return images[right];
      }
      return null;
    };

    // Draw frame onto canvas with aspect-fill and parallax buffer
    const draw = (frameIndex: number, parallaxOffset: number) => {
      const img = getBestAvailableFrame(frameIndex);
      if (!img) return;

      const cw = canvas.width;
      const ch = canvas.height;

      // 1.10 scale provides ample buffer so parallax translateY never reveals canvas edges
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * 1.10;
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const dx = (cw - dw) / 2;
      // Center Y plus clamped parallax offset
      const dy = (ch - dh) / 2 + parallaxOffset;

      ctx.drawImage(img, dx, dy, dw, dh);
    };

    // Handle canvas sizing with devicePixelRatio for sharp display
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      draw(currentFrameRef.current, currentParallaxRef.current);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 1. Immediately load frame 0 for instant first paint
    const img0 = new Image();
    img0.src = framePath(0);
    img0.onload = () => {
      images[0] = img0;
      draw(0, 0);
    };

    // 2. Preload remaining frames in background
    for (let i = 1; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = framePath(i);
      img.onload = () => {
        if (!isDisposed) images[i] = img;
      };
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
      // Gentle depth parallax: clamped so it never breaches the buffer
      targetParallaxRef.current = Math.max(-50, -scrollState.distance * 0.04);
    });

    let rafId = 0;
    let lastRenderedFrame = -1;
    let lastRenderedParallax = 0;

    const tick = () => {
      const frameDiff = targetFrameRef.current - currentFrameRef.current;
      const parallaxDiff = targetParallaxRef.current - currentParallaxRef.current;

      // Smooth interpolation
      if (Math.abs(frameDiff) > 0.02 || Math.abs(parallaxDiff) > 0.1) {
        currentFrameRef.current += frameDiff * 0.18;
        currentParallaxRef.current += parallaxDiff * 0.18;

        const rounded = Math.round(currentFrameRef.current * 10) / 10;
        if (rounded !== lastRenderedFrame || Math.abs(currentParallaxRef.current - lastRenderedParallax) > 0.5) {
          draw(currentFrameRef.current, currentParallaxRef.current);
          lastRenderedFrame = rounded;
          lastRenderedParallax = currentParallaxRef.current;
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
