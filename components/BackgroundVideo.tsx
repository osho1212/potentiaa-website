"use client";

import { useEffect, useRef } from "react";
import { onScrollFrame, scrollState } from "@/lib/scrollState";

/**
 * Site-wide starry cosmic background video layer.
 *
 * Sits at z-index 0 beneath all content and depth shards.
 * Subscribes to the shared `onScrollFrame` engine (Lenis) to translate smoothly
 * on the Y-axis, creating a realistic depth parallax as the user scrolls up or down.
 */
export default function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const wrap = wrapRef.current;
    if (!video || !wrap) return;

    // Ensure autoplay plays smoothly without user interaction
    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback: resume on first user interaction
        const handleInteraction = () => {
          video.play().catch(() => {});
          window.removeEventListener("pointerdown", handleInteraction);
          window.removeEventListener("scroll", handleInteraction);
        };
        window.addEventListener("pointerdown", handleInteraction, { once: true });
        window.addEventListener("scroll", handleInteraction, { once: true, passive: true });
      });
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      video.pause();
      return;
    }

    // Parallax factor: gentle drift rate relative to page scroll
    const PARALLAX_FACTOR = 0.12;
    let rafId = 0;
    let currentY = 0;
    let targetY = 0;

    const unsubscribe = onScrollFrame(() => {
      // Negative translation so content scrolls over it with depth
      targetY = -scrollState.distance * PARALLAX_FACTOR;
    });

    const tick = () => {
      // Smooth interpolation for silky rendering
      const diff = targetY - currentY;
      if (Math.abs(diff) > 0.05) {
        currentY += diff * 0.15;
        wrap.style.transform = `translate3d(0, ${currentY.toFixed(2)}px, 0)`;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      unsubscribe();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="site-background-video" aria-hidden="true">
      <div className="site-background-video__parallax" ref={wrapRef}>
        <video
          ref={videoRef}
          className="site-background-video__media"
          src="/assets/video/stars-background.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controls={false}
        />
      </div>
      {/* Aurora atmospheric glows layered over the starfield */}
      <div className="site-background-video__aurora" />
    </div>
  );
}
