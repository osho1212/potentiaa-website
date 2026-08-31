"use client";

import { useEffect, useRef } from "react";
import Hero from "./Hero";
import FlowSection from "./FlowSection";

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
 * PROGRESS is measured from this element's own box rather than from page
 * progress. The page renders every section twice for the scroll loop, so a
 * page-relative number would have driven both copies of the looping page from
 * one position; an element-relative one was correct in both copies by
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
 * All four are fractions of the FLOW SECTION's own height, which is a viewport
 * and a half - one to carry the section in, a half of runway for the assembled
 * frame to hold still in. They were last derived when that height was TWO
 * viewports and have been re-derived here, because a fraction of the section is
 * a different distance on screen once the section changes length.
 *
 * ARRIVE is the snap, and it is timed to the FLOW rather than to itself: the
 * module is the logo, and it should land on the glass at the moment the six
 * cards finish assembling on it, not before. It was landing early - the snap
 * completed 568px into the approach against a flow that was not whole until
 * 672px, so the logo sat parked on the panel for another 103px of scrolling
 * while the staircase was still arriving underneath it.
 *
 * Solved rather than nudged. The cards finish at ASSEMBLE of the span, so the
 * snap has to end (ASSEMBLE - 1) of a span before the section lands, which as a
 * fraction of the section is (ASSEMBLE - 1) / R, where R is the section's
 * height in viewports. Both come from svh, so the ratio is exact at every
 * viewport - and it is now computed rather than written down; see berthEdges.
 *
 * ARRIVE_FROM is the start of the scroll, not a notch before the end. This used
 * to be a snap 0.06 of a viewport wide: the module rode the helix for the whole
 * hero and was then yanked onto the berth over the last 47px. Landing on the
 * right frame did not stop it reading as a jump, because 47px is about half a
 * wheel notch and everything happened inside it.
 *
 * It now leaves for the berth the moment the reader starts scrolling. In passed
 * terms scroll zero is -span/H, which is -1/R, so the module blends off the
 * helix and onto the glass across the entire approach and is simply there when
 * the flow completes. Same landing frame, same landing spot; the travel is the
 * whole hero instead of the last inch of it.
 *
 * Adjusted here rather than in ASSEMBLE deliberately. Making the flow faster
 * would have closed the original gap, but the flow finishing earlier means more
 * of the hero is still on screen when it completes - and the hero being gone by
 * then is a requirement of its own. Moving the arrival costs nothing.
 *
 * HOLD covers the standstill. The section lands at 0 and the runway runs out at
 * 0.5 / 1.5 = 0.333, and nothing - panel, copy, cards or module - moves by a
 * pixel in between.
 *
 * LEAVE starts after that, once the frame is genuinely leaving. The berth rides
 * the panel, so from 0.333 the module is carried upward at scroll speed; it
 * sits at 0.305 of the viewport down and stands 0.138 tall, so over a 1.5
 * viewport section it reaches the top edge at 0.537 and is clear by 0.629. The
 * two constants keep the same margins around those they had before - a little
 * early on the hold, a little late on the leave - so the module still holds its
 * place in the frame until the frame has taken it off screen, and only then
 * rejoins the helix.
 */

/**
 * How far the module travels after the frame starts leaving, in viewports,
 * before the berth hands it back to the helix. It sits 0.305 of a viewport
 * below the top edge and stands 0.138 tall, so it touches the top edge at 0.305
 * and is clear at 0.443; the handover starts a little before the first and ends
 * a little after the second, so the swap is never visible.
 */
const HANDOVER_START = 0.24;
const HANDOVER_END = 0.6;

/**
 * The four berth edges, solved from the geometry instead of written down.
 *
 * These were four hardcoded fractions of the section's height, and that made
 * the section's height impossible to change safely: every one of them means a
 * different distance on screen once the section is a different length, so
 * shortening the hold silently sent the module home early. They were
 * re-derived by hand twice for exactly that reason.
 *
 * R is the section's height in viewports - 1.15 at 115svh - and every edge
 * below is a distance in viewports divided by it. Change the min-height in
 * globals.css and these follow on their own.
 */
function berthEdges(sectionHeight: number, span: number) {
  const R = Math.max(1, sectionHeight / Math.max(1, span));

  // The snap ends exactly where the cards finish, so the logo lands on a flow
  // that is already whole. See the note on ASSEMBLE.
  const arriveTo = (ASSEMBLE - 1) / R;
  const release = (R - 1) / R;

  return {
    // Scroll zero, expressed in the section's own units: the module starts for
    // the berth on the reader's first wheel notch rather than near the end.
    arriveFrom: -1 / R,
    arriveTo,
    holdUntil: release + HANDOVER_START / R,
    leaveBy: release + HANDOVER_END / R,
  };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const c = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return c * c * (3 - 2 * c);
}

export default function FlowStage() {
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
     * style invalidation, and this is false for all but a fraction of the page.
     */
    let assembling: boolean | null = null;

    let span = 1;
    let sectionHeight = 0;
    let sectionOffsetTop = 0;
    let panelRect = { left: 0, top: 0, width: 0, height: 0 };
    const panel = stage.querySelector<HTMLElement>(".flow-stage__panel");

    const measureSpan = () => {
      const s = stage.getBoundingClientRect();
      if (!section) {
        span = Math.max(1, s.height - window.innerHeight);
        sectionHeight = 0;
        sectionOffsetTop = 0;
      } else {
        const f = section.getBoundingClientRect();
        span = Math.max(1, f.top - s.top);
        sectionHeight = section.offsetHeight || f.height;
        sectionOffsetTop = section.offsetTop || (f.top - s.top);
      }

      if (panel) {
        const p = panel.getBoundingClientRect();
        // Baseline panel box without release transform
        panelRect = {
          left: p.left,
          top: p.top - (flowRef.current?.releaseY || 0),
          width: p.width,
          height: p.height,
        };
      }
    };

    let prevFlowT = -1;
    let prevReleaseY = -99999;
    let prevCopyShift = -99999;

    /**
     * THE LENS COMES OFF WHILE THE PAGE MOVES, not only while the cards fly.
     *
     * `flow-stage--assembling` already drops the six SVG lenses for exactly
     * this reason, and the note in styles/glass-surface.css has the measurement
     * that justified it. But it is keyed on `t < 1` - the cards still
     * travelling - and the moment they seat it hands the real glass back. The
     * section then holds a further half-viewport of runway, and the reader
     * scrolls through all of it with six lenses on screen.
     *
     * That is the state the lag was reported in, and it is the same cost: a
     * `backdrop-filter` re-runs whenever what is behind it changes, and
     * scrolling changes what is behind everything. Each of these six is a
     * nine-primitive SVG chain - feImage, three feDisplacementMap passes, three
     * feColorMatrix, two feBlend, a blur - and an SVG filter graph in
     * backdrop-filter is not GPU-accelerated, so all six re-rasterise in
     * software every frame the page moves. Measured on the seated staircase,
     * swapping just these for a plain blur took dropped frames from 18.7% to
     * 8.2%; the flow-stage panel's own blur(18px), over twenty times the area,
     * measured as costing nothing.
     *
     * A timer rather than a velocity threshold. `update` is called from the
     * scroll dispatch, so being called at all IS the signal that the page is
     * moving; velocity would additionally have to pick a floor, and Lenis's
     * long tail spends its last frames below any floor worth setting while the
     * backdrop is still visibly changing. The class is written only on the
     * flip, matching how `assembling` is handled - a classList write is a style
     * invalidation and this would otherwise fire every frame.
     */
    let drifting = false;
    let settleTimer = 0;

    const markDrifting = () => {
      if (!drifting) {
        drifting = true;
        stage.classList.add("flow-stage--drifting");
      }
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        drifting = false;
        stage.classList.remove("flow-stage--drifting");
      }, 140);
    };

    const update = () => {
      if (!visible) return;
      const rect = stage.getBoundingClientRect();
      const scrolled = -rect.top;
      const fTop = rect.top + sectionOffsetTop;
      const fHeight = sectionHeight || Math.max(1, window.innerHeight * 1.5);

      const t = Math.min(1, Math.max(0, scrolled / (span * ASSEMBLE)));

      flowRef.current.t = t;
      flowRef.current.offsetY = Math.min(0, rect.top);
      const hold = Math.max(0, fHeight - window.innerHeight);
      const releaseY = Math.min(0, span + hold - scrolled);
      flowRef.current.releaseY = releaseY;

      // Batch CSS writes and skip if unchanged
      const tFixed = t.toFixed(4);
      if (tFixed !== prevFlowT.toString()) {
        prevFlowT = t as unknown as number;
        stage.style.setProperty("--flow-t", tFixed);
      }

      const flying = t < 1;
      if (flying !== assembling) {
        assembling = flying;
        stage.classList.toggle("flow-stage--assembling", flying);
      }

      // The lens also comes off while the page is simply MOVING, not only
      // while the cards are in flight - see markDrifting.
      markDrifting();

      const releaseFixed = releaseY.toFixed(1);
      if (releaseFixed !== prevReleaseY.toString()) {
        prevReleaseY = releaseY as unknown as number;
        stage.style.setProperty("--flow-release", `${releaseFixed}px`);
      }

      if (section) {
        const copyShift = (releaseY - fTop).toFixed(1);
        if (copyShift !== prevCopyShift.toString()) {
          prevCopyShift = copyShift as unknown as number;
          stage.style.setProperty("--flow-copy-shift", `${copyShift}px`);
        }
      }

      // Only consider passed once releaseY has carried the glass panel and cubes completely off the top of the viewport
      const passed = releaseY < -window.innerHeight * 1.15 || rect.bottom < -window.innerHeight;
      stage.classList.toggle("flow-stage--passed", passed);

      if (panel && section && panelRect.width > 0) {
        const passedFraction = -fTop / Math.max(1, fHeight);
        const edge = berthEdges(fHeight, span);
        moduleBerth.strength =
          smoothstep(edge.arriveFrom, edge.arriveTo, passedFraction) *
          (1 - smoothstep(edge.holdUntil, edge.leaveBy, passedFraction));
        moduleBerth.x = panelRect.left + panelRect.width * BERTH.x;
        moduleBerth.y = panelRect.top + releaseY + panelRect.height * BERTH.y;
        moduleBerth.size = Math.min(BERTH.size, panelRect.width * 0.26);
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

    // Keep updating until the stage has fully scrolled away
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          update();
        } else {
          moduleBerth.strength = 0;
        }
      },
      { rootMargin: "0px 0px 10% 0px" },
    );
    observer.observe(stage);

    update();

    return () => {
      unsubscribe();
      observer.disconnect();
      spanObserver.disconnect();
      // Or the pending settle fires against a stage that has been unmounted.
      clearTimeout(settleTimer);
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
          <HeroLabels flowRef={flowRef} liveCardsRef={liveCardsRef} />
        </div>
      </div>

      <Hero />
      <FlowSection />
    </div>
  );
}
