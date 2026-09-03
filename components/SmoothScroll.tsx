"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { emitScrollFrame, scrollState } from "@/lib/scrollState";

/**
 * Smooth scrolling, and publishes the scroll position to lib/scrollState for
 * the animated layers.
 *
 * WHAT USED TO BE HERE. The page scrolled forever: app/page.tsx rendered the
 * section set twice, and whenever the reader drifted out of the middle band
 * this teleported them a whole lap back. Because the document repeated with a
 * fixed period, the destination looked exactly like the origin and the jump was
 * invisible.
 *
 * It is removed, along with everything it needed to work - the second copy of
 * the DOM, the `clone` flag threaded through every section, the tab-order sweep
 * over the hidden lap, and the load-time jump into the middle band. The
 * document now starts at the top, ends at the bottom, and scrolls once.
 *
 * The smoothing is NOT part of that and stays. So does the scrollState publish,
 * which is the only way the animated layers hear about movement: Lenis does not
 * emit a window `scroll` event, so a native listener would miss frames.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /**
     * How far the document can scroll - the distance that maps to progress
     * 0..1, and the number a layer needs to convert a real element's height
     * into the span of progress it occupies. ModuleStack does exactly that to
     * keep the module docked for as long as the hero is on screen.
     *
     * This was the lap length while the page looped. It is the scroll range
     * now, which is the same quantity for every purpose anything here uses it
     * for: pixels per unit of progress.
     */
    const measureSpan = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    if (reduced) {
      // No smoothing - an ordinary document. Still feed scrollState so the
      // hero picks up a position.
      const onScroll = () => {
        const span = measureSpan();
        scrollState.span = span;
        scrollState.progress = span > 0 ? Math.min(Math.max(window.scrollY / span, 0), 1) : 0;
        scrollState.distance = window.scrollY;
        scrollState.velocity = 0;
        emitScrollFrame();
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }

    /**
     * THE SCROLL FEEL. Three settings, and the third is the one that matters.
     *
     * `wheelMultiplier` is how far one notch travels: 1.15 put 115px under a
     * standard 100px wheel event, so the page moved further than the hand asked
     * it to. Under 1 it moves less, which is what makes a long page feel like it
     * has weight rather than sliding out from under the cursor.
     *
     * `duration` is how long the glide takes to settle. Longer reads as
     * momentum, up to a point - past about 1.5s the page stops feeling heavy and
     * starts feeling unresponsive, because the gap between the input and the
     * result is doing the talking.
     *
     * `easing` is the shape of that glide, and it was the real problem. The old
     * curve was an exponential-out so steep it spent 40% of its travel in the
     * first 48ms - measured - and the remaining 450ms creeping through the last
     * few pixels. That is a snap with a tail on it, not a glide, and lengthening
     * the duration alone would only have made the tail longer while leaving the
     * snap exactly as abrupt. A quartic-out puts 14% in the same opening instant
     * instead, so the movement starts as a push rather than a jump and carries
     * its speed through the middle, where the eye actually reads it.
     *
     * Measured on one wheel notch (deltaY 100), three runs, original -> first
     * pass -> second pass:
     *     travel per notch   115px  ->  75px  ->  60px
     *     time to settle     495ms  ->  890ms ->  890ms (unaffected: duration and easing set this, not distance)
     *     travel in first 50ms  40%  ->  14%  ->  14%  (same reason)
     *
     * Slowed again: duration 1.2 -> 1.4 (still under the ~1.5s line above
     * which glide reads as lag rather than weight) and wheelMultiplier
     * 0.6 -> 0.48, which by the same linear relationship the second pass
     * measured (0.6 -> 60px) puts a notch at ~48px. Together that is a
     * slower, longer glide per unit of input - intentionally, so the page
     * reads as heavier rather than snappier.
     *
     * Touch is damped far less on purpose. `syncTouch` means the content tracks
     * the finger, and a finger that the page refuses to keep up with does not
     * read as premium, it reads as broken.
     */
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      wheelMultiplier: 0.48,
      touchMultiplier: 1.2,
      syncTouch: true,
    });

    // Lenis knows its own limit and keeps it current; measureSpan is the
    // fallback for the frames before it has resolved one. Not seeded here -
    // onScroll() below assigns it before anything reads it.
    let span: number;

    const onScroll = () => {
      const current = lenis.scroll;
      span = lenis.limit || measureSpan();

      scrollState.distance = current;
      scrollState.velocity = lenis.velocity;
      scrollState.span = span;
      scrollState.progress = span > 0 ? Math.min(Math.max(current / span, 0), 1) : 0;

      // Anything scroll-reactive listens here, not on window's scroll event -
      // Lenis does not emit one for its own movement.
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

    /**
     * Fonts and images change section heights after first paint, which changes
     * the scroll range. Lenis has to be told to re-read it, and scrollState has
     * to be refreshed off the new number or every progress-driven layer stays
     * on the old scale until the reader next moves.
     */
    /* `disposed` because document.fonts.ready is a promise nothing can
       cancel. Under Strict Mode's develop-time double mount the first
       effect's cleanup runs before the fonts resolve, so this fired against a
       Lenis that had already been destroyed. onScroll() below reassigns
       `span` on its own, so the assignment that used to sit here was dead. */
    let disposed = false;
    const remeasure = () => {
      if (disposed) return;
      lenis.resize();
      onScroll();
    };

    const observer = new ResizeObserver(remeasure);
    observer.observe(document.body);
    window.addEventListener("resize", remeasure);
    if (document.fonts?.ready) void document.fonts.ready.then(remeasure);

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
    }

    return () => {
      disposed = true;
      document.removeEventListener("click", onAnchorClick);
      window.removeEventListener("resize", remeasure);
      observer.disconnect();
      cancelAnimationFrame(raf);
      lenis.destroy();

      /* Cleared with the instance it points at. ContactModal reads this
         global to stop the scroll engine while the dialog is open, and a
         stale handle here means it would be driving a destroyed Lenis. */
      const w = window as unknown as {
        __lenisInstance?: Lenis;
        __lenis?: Lenis;
        __scrollState?: unknown;
      };
      if (w.__lenisInstance === lenis) delete w.__lenisInstance;
      if (w.__lenis === lenis) delete w.__lenis;
      delete w.__scrollState;
    };
  }, []);

  return null;
}
