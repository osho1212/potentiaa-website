/**
 * Shared scroll state, written once per frame by SmoothScroll and read by the
 * animated layers (ModuleStack, DepthField).
 *
 * Deliberately a plain mutable object rather than React state: these layers read
 * it inside their own requestAnimationFrame loops, and pushing scroll values
 * through React would re-render the tree 60 times a second.
 *
 * Why not GSAP ScrollTrigger, as this site used before? Partly history - the
 * page used to scroll forever, wrapping back on itself at a loop seam, and
 * ScrollTrigger assumes a monotonic 0..1 document progress and broke on that
 * wrap. The loop is gone, so that objection is gone with it; what remains is
 * that these values already exist, already update once a frame, and cost one
 * shared rAF for every layer instead of one apiece.
 *
 *   progress   0..1 down the document. Drives the hero's waypoints.
 *   span       how far the document can scroll, in px.
 */

export type ScrollState = {
  /** 0..1 position down the document, clamped. */
  progress: number;
  /**
   * The scrollable range in px - scrollHeight minus one viewport - and 0 until
   * it has been measured.
   *
   * Published because it is the conversion factor between pixels and
   * `progress`, which is what a layer needs to express a real element's height
   * as a span of progress. ModuleStack needs exactly that: it has to stay
   * docked in the header for as long as the HERO is on screen, and the hero is
   * 100svh of a document whose other sections do not scale with the viewport -
   * so that span is 0.10 on a short laptop and 0.15 on a tall monitor.
   * Hard-coding the middle of that range would let the module lift out over the
   * hero on the tall end.
   */
  span: number;
  /** Current scroll offset in px. */
  distance: number;
  /** Current scroll velocity in px/frame. */
  velocity: number;
};

export const scrollState: ScrollState = {
  progress: 0,
  span: 0,
  distance: 0,
  velocity: 0,
};

/**
 * Subscribers notified once per scroll frame.
 *
 * Anything that needs to react to scrolling must subscribe HERE rather than
 * listening for the native `scroll` event. Lenis drives the page, and it does
 * not emit a native scroll event for every movement - notably not for
 * programmatic `scrollTo({ immediate: true })`, which anchor links still use.
 * The explainer originally used a window listener and appeared to work only
 * because real wheel input happens to produce native events too; any movement
 * Lenis made on its own left it frozen.
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
