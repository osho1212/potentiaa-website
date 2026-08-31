/**
 * What the hero shows when the scan field cannot run.
 *
 * Reached when WebGL is unavailable, when the renderer throws, when the context
 * is lost twice, or when the reader has asked for reduced motion.
 *
 * Deliberately a bare div with no image request and no JavaScript. The whole
 * appearance is a CSS gradient stack (see .hero__scanner-fallback), because a
 * fallback that has to fetch something can fail the same way the thing it is
 * replacing did. It also cannot shift the layout: it occupies the same
 * absolutely-positioned, out-of-flow box the canvas would have, so the hero's
 * height never depended on either of them.
 */
export default function HeroScannerFallback() {
  return <div className="hero__scanner-fallback" aria-hidden="true" />;
}
