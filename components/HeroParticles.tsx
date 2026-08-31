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

    /* DENSITY, AT NO MEASURED COST. THESE NUMBERS WERE MEASURED, NOT REASONED.
       The first attempt reasoned it out and was wrong, so the method matters:
       a GPU timer query (EXT_disjoint_timer_query_webgl2) around this swarm's
       draw call, 120 samples a run, three runs a config. The noise band on the
       machine used was 0.055-0.062ms, which is wide enough that anything
       argued rather than measured here is guesswork.
           18000 @ 1.05   0.055 / 0.059 / 0.062     <- the band
           26000 @ 0.875  0.072                     <- same fill, still +22%
           26000 @ 0.60   0.059 / 0.062 / 0.056     <- inside the band
       The middle row is the one that killed the obvious theory. Holding
       count * size^2 constant did NOT hold cost constant, so fragments are not
       the whole story; but halving the fill at unchanged count brought it back
       to baseline, so they are most of it. Both rows fit
           cost ~ 1.6e-6 * count + 2.3e-8 * fragments
       which at the settings above splits the frame roughly evenly between the
       two terms. Per-point cost is why the count cannot simply be raised, and
       why shrinking below ~0.6 stops buying anything: the per-point term takes
       over and the dots just get fainter for nothing.
       Solving that for the most particles at the baseline's cost lands here -
       a third more of them, and predicted 0.053ms against a 0.055-0.062 band.
       WHAT IT COSTS INSTEAD IS LIGHT. Under additive blending the total light
       IS the fill rate, so a denser field at the same cost is necessarily a
       dimmer one - here about 60% of the previous light. That is a trade, not
       a free lunch, and the knob to trade it back is LUMA in lib/heroParticles,
       which is pure vertex ALU and costs nothing.
       Points land near 3-8 device pixels, still clear of the one-pixel floor
       where dots start dropping out and twinkling. */
    const swarm = new ParticlesSwarm(container, {
      count: narrow ? 5500 : 8500,
      particleSize: narrow ? 0.72 : 0.65,
    });
    swarmRef.current = swarm;

    const sizeObserver = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) swarm.resize(box.width, box.height);
    });
    sizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? swarm.start() : swarm.stop()),
      { rootMargin: "400px" },
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
