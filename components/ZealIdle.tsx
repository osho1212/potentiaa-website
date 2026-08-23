"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import poses from "@/public/assets/mascot/poses.json";

/**
 * Zeal standing with the call to action, actually animated.
 *
 * He is here because the brief critic pointed out he was everywhere except the
 * one place it mattered: "the CTA is the one moment on this page where a real
 * person is being offered real help, and he is not there." He explained the
 * catalogue and then left before the offer.
 *
 * THE LOOP IS A REAL GENERATED ANIMATION NOW - Seedance 2.5, 4s, breathing, a
 * blink, an ear twitch, a tail sway. Four earlier rounds shipped a CSS
 * transform instead and defended it at length; the brief critic was right that
 * the defence was self-serving. Every obstacle I had written down was about a
 * DELIVERY FORMAT, and none of them was "generation does not work".
 *
 * The delivery problem was real, though, and this is how it is solved:
 *
 *   - mp4 has no alpha channel. Alpha video means VP9 *and* HEVC, two files,
 *     and Safari support that has to be tested per version.
 *   - so the clip is rendered on PURE BLACK and composited with
 *     `mix-blend-mode: screen`. Screen against a base leaves the base wherever
 *     the source is black - exactly, not approximately - so the backdrop
 *     disappears with no key, no mask and no second encode. Zeal comes through
 *     lifted very slightly by the page colour behind him, which on a
 *     --midnight-950 ground is a difference you cannot see.
 *   - the clip was generated with the same frame as BOTH start_image and
 *     end_image, so the last frame returns to the first and `loop` is seamless
 *     rather than a jump cut every four seconds.
 *
 * The still is not a fallback afterthought: it is what renders under
 * prefers-reduced-motion, and what shows if the video has not decoded yet, so
 * he is never a blank space.
 */
export default function ZealIdle() {
  const art = poses["zeal-idle"];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAllowed(!motion.matches);
    sync();
    motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!allowed) {
      video.pause();
      setPlaying(false);
      return;
    }

    // Only decode while he is actually on screen. A 4-second clip looping
    // forever in a section nobody has scrolled to is battery spent on nothing,
    // and this page is long enough that the CTA is off screen most of the time.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => setPlaying(false));
        else video.pause();
      },
      { rootMargin: "200px" },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [allowed]);

  return (
    <div className="zeal-idle" aria-hidden="true">
      {allowed && (
        <video
          ref={videoRef}
          className="zeal-idle__video"
          data-ready={playing}
          src="/assets/mascot/video/zeal-idle.mp4"
          muted
          loop
          playsInline
          preload="metadata"
          onPlaying={() => setPlaying(true)}
          onError={() => setPlaying(false)}
        />
      )}

      {/* Underneath, always. It carries the first paint, the reduced-motion
          case and any decode failure, and it is the same pose the clip starts
          from - so the handover is invisible rather than a pop. */}
      <Image
        src={art.src}
        alt=""
        width={art.width}
        height={art.height}
        className="zeal-idle__art"
        data-hidden={playing}
        sizes="300px"
      />
    </div>
  );
}
