"use client";

import { useEffect, useRef } from "react";
import Hero from "./Hero";
import FlowSection from "./FlowSection";

import type { HeroParticlesHandle } from "../HeroParticles";
import HeroLabels from "../HeroLabels";
import HeroFlowStream from "../HeroFlowStream";
import type { FlowProgress } from "../HeroLabels";
import type { LiveCardState } from "@/lib/flowLayout";
import { onScrollFrame } from "@/lib/scrollState";
import { moduleBerth } from "@/lib/moduleBerth";

/**
 * The hero and the flow section, wrapped so the swarm and the cards can travel
 * between them.
 *
 * WHY THEY ARE WRAPPED AT ALL. The cards used to live inside `.hero__art`,
 * which is `position: absolute` inside a section that ends at the fold - so
 * they could never visually reach the section below it. A `position: sticky`
 * layer spanning BOTH sections can, and it stays pinned for the whole
 * transition without any `position: fixed` fighting Lenis for the scroll.
 *
 * ONLY THE CARDS ARE PINNED. The swarm stays where it has always been, inside
 * `.hero__art`, and scrolls away with the hero - it is part of the hero, not
 * part of the transition. An earlier version pinned it too and it followed the
 * reader into the flow section, which is not what the effect is: the brief was
 * that SOME particles travel with the cards to draw the line between them,
 * which is a separate stream and not the formation itself.
 *
 * The swarm still has to be reachable from here, because the cards drive its
 * hover glow - hence the ref owned at this level and handed to Hero.
 *
 * PROGRESS is measured from this element's own box rather than from lap
 * progress. The page renders every section twice for the scroll loop, so a
 * lap-relative number would drive both copies from one position; an
 * element-relative one is correct in both laps and across the seam by
 * construction, with no wrap arithmetic to get wrong.
 */
/**
 * Where the module parks on the glass, as fractions of the PANEL's box, plus
 * the width it settles at.
 *
 * Upper right: the copy holds the upper left and the staircase runs beneath,
 * so this is the one quarter of the panel that is empty at every step of the
 * flow. Capped against the panel's own width so it cannot swell past a
 * quarter of it on a wide monitor.
 */
const BERTH = { x: 0.77, y: 0.25, size: 320 };

function smoothstep(edge0: number, edge1: number, x: number): number {
  const c = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return c * c * (3 - 2 * c);
}

export default function FlowStage({ clone }: { clone?: boolean }) {
  const particlesRef = useRef<HeroParticlesHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<FlowProgress>({ t: 0, offsetY: 0, releaseY: 0 });
  const liveCardsRef = useRef<LiveCardState[]>([]);

  /**
   * Park the pinned art on `.hero__art`'s box by measuring it.
   *
   * Not by restating its layout in CSS: that box is the product of a container
   * width, a grid column, `justify-self: end`, two negative margins and a
   * transform, all of which move at two breakpoints. A hand-copied version of
   * that arithmetic was written first and landed 221px left and 381px high of
   * the real element. Measuring cannot drift.
   *
   * Both boxes scroll together, so the difference between their rects is a
   * layout constant - it only changes on resize, never on scroll.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const heroArt = stage.querySelector<HTMLElement>(".hero__art");
    const artLayers = stage.querySelectorAll<HTMLElement>(".flow-stage__art");
    if (!heroArt || artLayers.length === 0) return;

    const place = () => {
      const s = stage.getBoundingClientRect();
      const a = heroArt.getBoundingClientRect();
      artLayers.forEach((layer) => {
        layer.style.left = `${a.left - s.left}px`;
        layer.style.top = `${a.top - s.top}px`;
        layer.style.width = `${a.width}px`;
        layer.style.height = `${a.height}px`;
      });
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(stage);
    observer.observe(heroArt);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const section = stage.querySelector<HTMLElement>(".flow-section");
    let visible = false;

    /**
     * The distance the transition plays out over: stage top to section top.
     *
     * Measured against the section rather than taken as `stageHeight -
     * viewport`, so that `t` reaches 1 at the exact moment the flow section
     * fills the viewport - the flow is meant to be fully formed by then, and
     * still assembling before it. The two agree only while the hero is exactly
     * one viewport tall, and it is not: it has `min-height: 100svh` plus
     * padding, so the arithmetic version finished slightly early.
     */
    let span = 1;
    const measureSpan = () => {
      if (!section) {
        span = Math.max(1, stage.getBoundingClientRect().height - window.innerHeight);
        return;
      }
      const s = stage.getBoundingClientRect();
      const f = section.getBoundingClientRect();
      span = Math.max(1, f.top - s.top);
    };

    const update = () => {
      if (!visible) return;
      const rect = stage.getBoundingClientRect();
      const scrolled = -rect.top;
      const t = Math.min(1, Math.max(0, scrolled / span));

      flowRef.current.t = t;
      // Zero until the pin engages, then how far the hero has slid under it.
      // The cards add this back to their orbit so they stay on the swarm as it
      // scrolls away, rather than detaching the moment the pin takes hold.
      flowRef.current.offsetY = Math.min(0, rect.top);
      // Zero until the flow has arrived, then how far past that the reader has
      // gone - what hands the finished flow back to the page so it leaves with
      // its own section instead of hanging over the next one.
      flowRef.current.releaseY = Math.min(0, span - scrolled);

      stage.style.setProperty("--flow-t", t.toFixed(4));
      // Published so the glass panel can ride the release from CSS alone,
      // rather than needing its own place in the frame loop.
      stage.style.setProperty("--flow-release", `${flowRef.current.releaseY.toFixed(1)}px`);

      /**
       * Call the module stack out of the navbar and onto the glass.
       *
       * RISE as the section lands - it is the section's object once the
       * section is the thing on screen, and there is nothing for it to sit on
       * before the panel is there. FALL again once the reader is half a
       * viewport past, so it goes home to the header rather than following
       * them down the page.
       *
       * Position is measured off the panel, not computed from the same
       * percentages the panel is laid out with: one source, so a change to
       * the panel's inset moves the berth with it.
       */
      const panel = stage.querySelector<HTMLElement>(".flow-stage__panel");
      if (panel) {
        const rise = smoothstep(0.72, 0.99, t);
        const fall = 1 - smoothstep(0, window.innerHeight * 0.5, -flowRef.current.releaseY);
        const box = panel.getBoundingClientRect();
        moduleBerth.strength = rise * fall;
        moduleBerth.x = box.left + box.width * BERTH.x;
        moduleBerth.y = box.top + box.height * BERTH.y;
        moduleBerth.size = Math.min(BERTH.size, box.width * 0.26);
      }
    };

    measureSpan();
    const spanObserver = new ResizeObserver(() => {
      measureSpan();
      update();
    });
    spanObserver.observe(stage);
    if (section) spanObserver.observe(section);

    // onScrollFrame, not a `scroll` listener: Lenis drives the page and does
    // not emit a native scroll event for every movement it makes - notably not
    // for the programmatic jump that closes the loop seam. See lib/scrollState.
    const unsubscribe = onScrollFrame(update);

    // The off-screen lap must not pay for the rect read.
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) update();
        // Let go of the module on the way out. There are two of these stages
        // and one module: a copy that scrolled away still holding a berth
        // would drag it off-screen after itself.
        else moduleBerth.strength = 0;
      },
      { rootMargin: "10%" },
    );
    observer.observe(stage);

    update();

    return () => {
      unsubscribe();
      observer.disconnect();
      spanObserver.disconnect();
    };
  }, []);

  return (
    <div className="flow-stage" ref={stageRef}>
      {/* The glass, in its own layer BENEATH the section's copy.
          It is a background, so everything in the section - the heading and
          the body as much as the cards - has to sit on top of it. A single
          pinned layer could not do that: the cards must be in front of the
          copy and the glass behind it, which is two sides of the same
          element. See .flow-stage__pin--under / --over. */}
      <div className="flow-stage__pin flow-stage__pin--under" aria-hidden="true">
        <div className="flow-stage__panel" />
      </div>

      <div className="flow-stage__pin flow-stage__pin--over">
        {/* Under the cards: the line runs THROUGH the stations, behind them. */}
        <HeroFlowStream flowRef={flowRef} liveCardsRef={liveCardsRef} />
        <div className="flow-stage__art">
          <HeroLabels particlesRef={particlesRef} flowRef={flowRef} liveCardsRef={liveCardsRef} />
        </div>
      </div>

      <Hero clone={clone} particlesRef={particlesRef} />
      <FlowSection clone={clone} />
    </div>
  );
}
