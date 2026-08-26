"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { emitScrollFrame, scrollState } from "@/lib/scrollState";

/**
 * Smooth scrolling plus the infinite loop, and publishes both to
 * lib/scrollState for the animated layers.
 *
 * HOW THE LOOP WORKS
 * app/page.tsx renders the section set twice. One copy is a "lap". Because the
 * document repeats with a fixed period, any two scroll positions exactly one lap
 * apart show identical pixels - so we let the reader scroll normally and
 * teleport them a lap back whenever they drift out of the middle band:
 *
 *   0            0.5*lap        1.5*lap          2*lap
 *   |---clone-A----|===working band===|----clone-B---|
 *
 * The jump is invisible because the destination looks exactly like the origin.
 * Half a lap of real content sits either side, so the wrap never happens near a
 * document edge where the browser would clamp the scroll and expose it.
 *
 * NOT Lenis's own `infinite: true`: on a window wrapper that leaves Lenis's
 * internal scroll unbounded while the browser clamps the real one, and the two
 * fight until the target runs away to +/- infinity.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /**
     * Distance between the two laps, which is what the wrap has to jump.
     *
     * Measured as the gap between the two wrappers' offsetTop rather than the
     * first one's height: those agree only while no margin collapses between
     * them, and being even a few pixels out makes the seam visible.
     */
    const measureLap = () => {
      const primary = document.querySelector<HTMLElement>('[data-lap="primary"]');
      const clone = document.querySelector<HTMLElement>('[data-lap="clone"]');
      if (!primary || !clone) return 0;
      return clone.offsetTop - primary.offsetTop;
    };

    if (reduced) {
      // No smoothing and no looping - an ordinary document. Still feed
      // scrollState so the hero picks up a position.
      const onScroll = () => {
        const lap = measureLap() || document.documentElement.scrollHeight;
        scrollState.lap = lap;
        scrollState.progress = lap > 0 ? (window.scrollY % lap) / lap : 0;
        scrollState.distance = window.scrollY;
        scrollState.velocity = 0;
        emitScrollFrame();
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    const lenis = new Lenis({
      duration: 0.65,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.15,
      touchMultiplier: 1.5,
      syncTouch: true,
    });

    let lap = measureLap();

    // Start in the middle band rather than at the top of the document
    if (lap > 0) lenis.scrollTo(lap, { immediate: true, force: true });

    let distance = lenis.scroll;
    let previous = lenis.scroll;

    const onScroll = () => {
      const current = lenis.scroll;
      let delta = current - previous;

      if (lap > 0) {
        // A wrap moved us a whole lap; that is not real travel, so discount it
        if (Math.abs(delta) > lap * 0.5) delta -= Math.sign(delta) * lap;

        if (current > lap * 1.5) {
          lenis.scrollTo(current - lap, { immediate: true, force: true });
          previous = current - lap;
        } else if (current < lap * 0.5) {
          lenis.scrollTo(current + lap, { immediate: true, force: true });
          previous = current + lap;
        } else {
          previous = current;
        }
      } else {
        previous = current;
      }

      distance += delta;

      scrollState.distance = distance;
      scrollState.velocity = lenis.velocity;
      scrollState.lap = lap;
      // One full lap of choreography per copy of the page
      scrollState.progress = lap > 0 ? (((current % lap) + lap) % lap) / lap : 0;

      // Anything scroll-reactive listens here, not on window's scroll event -
      // Lenis does not emit one for its own programmatic movement.
      emitScrollFrame();
    };

    lenis.on("scroll", onScroll);
    onScroll();

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Fonts and images change section heights after first paint, which changes
    // the lap length. A one-shot timeout races that; an observer does not.
    const remeasure = () => {
      const next = measureLap();
      if (next > 0) lap = next;
    };

    const observer = new ResizeObserver(remeasure);
    const primary = document.querySelector<HTMLElement>('[data-lap="primary"]');
    if (primary) observer.observe(primary);
    window.addEventListener("resize", remeasure);
    if (document.fonts?.ready) void document.fonts.ready.then(remeasure);

    /**
     * Take the clone lap out of the tab order, without taking it out of the
     * page.
     *
     * The clone used to carry `inert`, which removed it from the tab order AND
     * killed every pointer event inside it. That second effect was the bug: the
     * reader only ever sees the clone copies of the hero, intro, Work and
     * Method - measured, not assumed - so the hero's CTAs and the Work cards
     * were not clickable by anyone.
     *
     * `aria-hidden` on the wrapper handles the announcement. This handles the
     * tab stops, which is the other half `inert` was doing and the half that
     * has to stay: focusable elements inside an aria-hidden subtree are an
     * accessibility failure in their own right, because a keyboard user would
     * land on a control a screen reader insists is not there.
     *
     * Done here rather than on each control so it cannot be forgotten when a
     * section gains a button, and repeated on mutation because the sections
     * render client-side.
     */
    const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const cloneLap = document.querySelector<HTMLElement>('[data-lap="clone"]');

    const detabClone = () => {
      cloneLap?.querySelectorAll<HTMLElement>(FOCUSABLE).forEach((el) => {
        el.setAttribute("tabindex", "-1");
      });
    };

    detabClone();
    const cloneObserver = cloneLap ? new MutationObserver(detabClone) : null;
    cloneObserver?.observe(cloneLap as HTMLElement, { childList: true, subtree: true });

    // Anchor links have to go through Lenis, not native scroll
    const onAnchorClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement)?.closest?.('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -80 });
    };

    document.addEventListener("click", onAnchorClick);

    // Exposed in every build, not just development: ContactModal has to stop
    // the scroll engine while the dialog is open. `body { overflow: hidden }`
    // does nothing to Lenis, which scrolls a transform rather than the
    // document, so the page travelled a thousand pixels behind an open dialog.
    (window as unknown as { __lenisInstance?: Lenis }).__lenisInstance = lenis;

    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
      (window as unknown as { __scrollState?: unknown }).__scrollState = scrollState;
      (window as unknown as { __lap?: () => number }).__lap = () => lap;
    }

    return () => {
      document.removeEventListener("click", onAnchorClick);
      window.removeEventListener("resize", remeasure);
      observer.disconnect();
      cloneObserver?.disconnect();
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
