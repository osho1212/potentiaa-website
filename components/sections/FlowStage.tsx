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

/**
 * WHEN the module is on that berth, in fractions of the flow section's own
 * height scrolled past the top of the viewport. Negative is "still coming up",
 * 0 is "its top has just landed", 1 is "fully behind you".
 *
 * Measured against the section rather than against `t`, which is what this was
 * timed off before. `t` runs out the instant the section reaches the top of
 * the viewport, so it can describe the arrival and has nothing left to say
 * about the hold or the release - and those are most of what this berth is.
 * Timed on `t`, full strength existed at exactly one scroll position and was
 * gone again by the section's midpoint.
 *
 * ARRIVE is a SNAP, not a flight. It is six hundredths of a section wide -
 * under one wheel notch - so the module does not travel to the berth in any
 * way the reader can follow: it is in the navbar, and then it is parked, with
 * the panel already most of the way lit underneath it.
 *
 * It was a long ramp first, spread over a third of a screen, on the theory
 * that an object crossing most of the viewport and growing sevenfold needs
 * room to do it in. That theory is wrong here. A flight that plays out over
 * scrolling IS scroll-linked movement, so however well it eases, what the
 * reader sees is the thing sliding into position as they scroll - which is the
 * exact complaint the berth exists to answer. Landing it in one step means
 * every frame the reader spends on this screen has the module already still.
 *
 * HOLD is where the module does nothing of its own: it is welded to the panel,
 * so it holds its place in the composition rather than a place on screen. (The
 * idle bob is faded out against this same claim in ModuleStack, and the
 * damping is taken to exact tracking - a berth that breathes 20px, or that
 * trails the panel it is bolted to, is not a berth.)
 *
 * So on screen the module only ever does one of two things - sit still in its
 * frame, or leave with it. The exact windows are below.
 */

/**
 * Fraction of the hero's runway the flow takes to assemble.
 *
 * Under 1 so the cards are seated BEFORE the copy parks rather than at the
 * same instant - see `t` in the tick.
 */
const ASSEMBLE = 0.85;

/**
 * All four are fractions of the FLOW SECTION's own height, and that height is
 * now two viewports, not one - the second is the runway the frame holds still
 * in. So a given distance on screen is half the `passed` it used to be, and
 * these are halved with it.
 *
 * ARRIVE is still the snap, one wheel notch wide. HOLD now covers the whole
 * standstill: the section lands at 0, the hold runs out at 0.5, and nothing -
 * panel, copy, cards or module - moves by a pixel in between.
 *
 * LEAVE starts after that, once the frame is genuinely leaving. The berth
 * rides the panel, so from 0.5 the module is carried upward at scroll speed;
 * it sits at 0.305 of the viewport down and stands 0.138 tall, so it reaches
 * the top edge at 0.65 and is clear by 0.72. The handover is timed to that -
 * the module holds its place in the frame until the frame has taken it off
 * screen, and only then rejoins the helix.
 */
const ARRIVE_FROM = -0.17;
const ARRIVE_TO = -0.14;
const HOLD_UNTIL = 0.62;
const LEAVE_BY = 0.8;

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
    /**
     * Whether the cards are still flying, tracked so the class is written only
     * when it flips rather than on every scroll frame - a classList write is a
     * style invalidation, and this is false for all but a fraction of the lap.
     */
    let assembling: boolean | null = null;

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
      // One read, shared by the copy's shift and the berth's `passed` below.
      const f = section?.getBoundingClientRect();
      /**
       * ASSEMBLED BEFORE THE COPY LANDS, not at the same instant as it.
       *
       * `t` used to run to 1 exactly as the section's top reached the top of
       * the viewport - which is also the moment the copy parks. So the last of
       * the cards was still seating itself at the very frame the frame was
       * supposed to be settled, and the flow read as still hovering into place
       * under finished text.
       *
       * Finishing at ASSEMBLE of the runway leaves a gap between the two: the
       * cards land, and only then does the copy arrive on top of a flow that is
       * already whole.
       */
      const t = Math.min(1, Math.max(0, scrolled / (span * ASSEMBLE)));

      flowRef.current.t = t;
      // Zero until the pin engages, then how far the hero has slid under it.
      // The cards add this back to their orbit so they stay on the swarm as it
      // scrolls away, rather than detaching the moment the pin takes hold.
      flowRef.current.offsetY = Math.min(0, rect.top);
      /**
       * THE HOLD, then the release.
       *
       * Zero for the whole of the hold - the frame is assembled and completely
       * still - and then how far past it the reader has gone, which is what
       * hands the finished flow back to the page so it leaves with its own
       * section instead of hanging over the next one.
       *
       * The hold is measured off the section rather than declared here: it is
       * however much taller than one viewport the stylesheet made it. At
       * `min-height: 100svh` this is 0 and the release begins the instant the
       * section lands, which is what it used to do - the frame had no runway to
       * be still in, so panel, copy, cards and module all began leaving as soon
       * as they arrived. The stylesheet owns the number; this just reads it, so
       * the two cannot disagree.
       */
      const hold = Math.max(0, (section?.offsetHeight ?? 0) - window.innerHeight);
      flowRef.current.releaseY = Math.min(0, span + hold - scrolled);

      stage.style.setProperty("--flow-t", t.toFixed(4));

      /**
       * THE GLASS IS TOO EXPENSIVE TO WEAR IN FLIGHT.
       *
       * Each card's `backdrop-filter` is an SVG chain - a generated
       * displacement map, three feDisplacementMap passes for the per-channel
       * split, then a blur - and the browser can only cache that while neither
       * the card nor what is behind it moves. Through the assembly BOTH move
       * every frame: six cards travelling from orbit to seat over a swarm that
       * is animating, a panel that is fading up and a stream that is drawing.
       * So all six re-snapshot and re-filter their backdrop every frame, each
       * one reading the panel's already-blurred output beneath it.
       *
       * Measured across this exact window, that is 45.6% of frames over budget
       * against 6.9% with backdrop-filter gone - by far the largest cost left
       * in the transition, and much larger than the swarm or the trail.
       *
       * So the lens comes off for the flight and goes back on the moment the
       * cards are seated, which is also the moment it starts being worth
       * anything: a lens effect on an object crossing the screen at speed is
       * detail nobody can resolve, and the same effect on six cards sitting
       * still is the whole look of the section.
       *
       * NOT the panel, which was measured and is the opposite - dropping the
       * panel's blur made things WORSE (p90 58.1ms against 29.4), because the
       * cards' filter then samples the raw busy backdrop instead of a flat
       * pre-blurred one. The panel is partly paying for itself.
       */
      const flying = t < 1;
      if (flying !== assembling) {
        assembling = flying;
        stage.classList.toggle("flow-stage--assembling", flying);
      }
      // Published so the glass panel can ride the release from CSS alone,
      // rather than needing its own place in the frame loop.
      stage.style.setProperty("--flow-release", `${flowRef.current.releaseY.toFixed(1)}px`);
      /**
       * THE COPY IS PRINTED ON THE GLASS, so it is positioned FROM the glass.
       *
       * The panel lives in the pinned layer and the copy lives in the document,
       * which means that until the section lands they are moving at different
       * speeds: the panel is held at the top of the viewport, fading in, while
       * the copy is still climbing the page towards it. The reader watches the
       * text slide up through a stationary frame and settle - moving inside the
       * glass, which is exactly what it must never do.
       *
       * `position: sticky` cannot fix that. Sticky only ever holds an element
       * BACK from where the document would put it, so before the section
       * arrives the copy is always below its resting place, and the slide is
       * still there.
       *
       * So the copy is not positioned by the document at all. This shift is the
       * difference between where the document puts it and where the panel is,
       * which cancels the document exactly: `release` carries it out with the
       * glass, and subtracting the section's own top removes every other bit of
       * scrolling. What is left is one fixed spot on the panel, at every scroll
       * position, in both directions.
       */
      if (f) {
        stage.style.setProperty(
          "--flow-copy-shift",
          `${(flowRef.current.releaseY - f.top).toFixed(1)}px`,
        );
      }

      /**
       * Call the module stack out of the navbar and onto the glass: fast in,
       * parked for the length of the section, then handed back to the helix.
       *
       * Position is measured off the panel, not computed from the same
       * percentages the panel is laid out with: one source, so a change to
       * the panel's inset moves the berth with it.
       */
      const panel = stage.querySelector<HTMLElement>(".flow-stage__panel");
      if (panel && f) {
        const passed = -f.top / Math.max(1, f.height);

        const box = panel.getBoundingClientRect();

        /**
         * THE BERTH IS ON THE PANEL, so it travels with the panel.
         *
         * The raw rect, deliberately - it carries `--flow-release`, which is
         * how the finished flow leaves with its own section, and the module is
         * part of that flow now.
         *
         * A version of this pinned the berth in the VIEWPORT instead, by
         * undoing that transform, so the module held one fixed point on screen
         * for the whole section. It did hold - measured over 661 frames of real
         * scrolling, zero pixels of drift - and it was still wrong, because
         * holding still on screen while the panel and the six cards scroll up
         * past you is not staying put, it is descending through the staircase.
         * The module snapped in clear of the flow and ended up buried in the
         * Accounts card.
         *
         * Riding the panel is what "stay where it was snapped" actually means:
         * the cards move by `--flow-release` too, so the module keeps its exact
         * place in the composition and nothing ever crosses it. It leaves the
         * top of the frame with the flow it belongs to.
         */
        moduleBerth.strength =
          smoothstep(ARRIVE_FROM, ARRIVE_TO, passed) *
          (1 - smoothstep(HOLD_UNTIL, LEAVE_BY, passed));
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
