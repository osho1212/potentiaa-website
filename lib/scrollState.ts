/**
 * Shared scroll state, written once per frame by SmoothScroll and read by the
 * animated layers (ModuleStack, DepthField).
 *
 * Deliberately a plain mutable object rather than React state: these layers read
 * it inside their own requestAnimationFrame loops, and pushing scroll values
 * through React would re-render the tree 60 times a second.
 *
 * Why not GSAP ScrollTrigger, as this site used before? The page now scrolls
 * forever, so the scroll position wraps back on itself at the loop seam.
 * ScrollTrigger assumes a monotonic 0..1 document progress and breaks on that
 * wrap. Both values below are wrap-safe by construction:
 *
 *   progress   0..1, wrapped - where you are in one lap of the page. Drives the
 *              hero's waypoints, so the stack returns to where it started.
 *   distance   unbounded and signed, wrap jumps discounted - total scrolled
 *              length. Available for anything that must never snap.
 */

export type ScrollState = {
  /** 0..1 position within the current lap. */
  progress: number;
  /**
   * Length of one lap in px, 0 until it has been measured.
   *
   * Published so that layers driven by `progress` can convert a real element's
   * height into the progress span it occupies. ModuleStack needs exactly that:
   * it has to stay docked in the header for as long as the HERO is on screen,
   * and the hero is 100svh of a lap whose other sections do not scale with the
   * viewport - so that span is 0.10 on a short laptop and 0.15 on a tall
   * monitor. Hard-coding the middle of that range would let the module lift
   * out over the hero on the tall end.
   */
  lap: number;
  /** Unbounded accumulated scroll distance in px. Negative when scrolling up. */
  distance: number;
  /** Current scroll velocity in px/frame. */
  velocity: number;
};

export const scrollState: ScrollState = {
  progress: 0,
  lap: 0,
  distance: 0,
  velocity: 0,
};

/**
 * Subscribers notified once per scroll frame.
 *
 * Anything that needs to react to scrolling must subscribe HERE rather than
 * listening for the native `scroll` event. Lenis drives the page, and it does
 * not emit a native scroll event for every movement - notably not for
 * programmatic `scrollTo({ immediate: true })`. The explainer originally used a
 * window listener and appeared to work only because real wheel input happens to
 * produce native events too; any movement Lenis made on its own left it frozen.
 */
const listeners = new Set<() => void>();

export function onScrollFrame(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Called by SmoothScroll once per scroll frame, after scrollState is updated. */
export function emitScrollFrame(): void {
  listeners.forEach((fn) => fn());
}
