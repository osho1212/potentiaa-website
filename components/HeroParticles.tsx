"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { ParticlesSwarm } from "@/lib/heroParticles";
import { useMediaQuery } from "@/lib/useMediaQuery";

/** What HeroLabels gets through the ref - just enough to drive the hover glow. */
export interface HeroParticlesHandle {
  glow(active: boolean, clientX: number, clientY: number): void;
}

/**
 * The 3D formation around the hero artwork - replaced the traced 2D energy
 * field. See lib/heroParticles for the simulation itself; this owns only the
 * container, lifecycle and accessibility wiring, mirroring the old field's:
 * skipped under prefers-reduced-motion, paused off-screen, resized off a
 * ResizeObserver on its own container rather than the window.
 *
 * Exposes a ref handle so a sibling (HeroLabels) can reach into the running
 * swarm on hover - through a mutable ref to the instance rather than the
 * instance itself, since the swarm is created and disposed inside an effect
 * and can be re-created (React Strict Mode's mount/cleanup/mount in dev,
 * or the component unmounting under prefers-reduced-motion) while the
 * forwarded handle has to keep working across that.
 */
const HeroParticles = forwardRef<HeroParticlesHandle>(function HeroParticles(_props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const swarmRef = useRef<ParticlesSwarm | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      glow(active, clientX, clientY) {
        swarmRef.current?.setGlow(active, clientX, clientY);
      },
    }),
    [],
  );

  /* Both re-evaluated on change, not read once at mount - see lib/useMediaQuery.
     Crossing either boundary rebuilds the swarm at the right size, which is what
     the tiering was always meant to do. matchMedia fires only when the boundary
     is actually crossed, so dragging a window across it costs one rebuild. */
  const narrow = useMediaQuery("(max-width: 900px)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Neither answer is in yet; build nothing rather than build the wrong one.
    if (narrow === null || reduced === null) return;
    if (reduced) return;

    // Smaller sprites and more of them - finer sampling of the same shape,
    // which is what stops the formation reading as haze. The count is only
    // affordable because the frame loop is trig-free and there is no
    // post-processing chain; see lib/heroParticles.
    const swarm = new ParticlesSwarm(container, {
      count: narrow ? 13600 : 40800,
      particleSize: narrow ? 1.1 : 0.95,
    });
    swarmRef.current = swarm;

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
      swarmRef.current = null;
      swarm.dispose();
    };
  }, [narrow, reduced]);

  return <div ref={containerRef} className="hero__art-particles" aria-hidden="true" />;
});

export default HeroParticles;
