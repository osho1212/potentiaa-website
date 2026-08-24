"use client";

import { useEffect, useRef } from "react";
import { ParticlesSwarm } from "@/lib/heroParticles";

/**
 * The 3D formation around the hero artwork - replaced the traced 2D energy
 * field. See lib/heroParticles for the simulation itself; this owns only the
 * container, lifecycle and accessibility wiring, mirroring the old field's:
 * skipped under prefers-reduced-motion, paused off-screen, resized off a
 * ResizeObserver on its own container rather than the window.
 */
export default function HeroParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    // Affordable at this count only because the frame loop is trig-free and
    // there is no post-processing chain - see lib/heroParticles.
    // Smaller sprites and more of them - finer sampling of the same shape,
    // which is what stops the formation reading as haze. The count is only
    // affordable because the frame loop is trig-free and there is no
    // post-processing chain; see lib/heroParticles.
    const narrow = window.matchMedia("(max-width: 900px)").matches;
    const swarm = new ParticlesSwarm(container, {
      count: narrow ? 13600 : 40800,
      particleSize: narrow ? 1.1 : 0.95,
    });

    const sizeObserver = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) swarm.resize(box.width, box.height);
    });
    sizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? swarm.start() : swarm.stop()),
      { rootMargin: "100px" },
    );
    intersectionObserver.observe(container);

    return () => {
      sizeObserver.disconnect();
      intersectionObserver.disconnect();
      swarm.dispose();
    };
  }, []);

  return <div ref={containerRef} className="hero__art-particles" aria-hidden="true" />;
}
