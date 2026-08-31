"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import WebGLBoundary from "./WebGLBoundary";
import HeroScannerFallback from "./HeroScannerFallback";
import { detectWebGL } from "@/lib/webglSupport";
import type { ScannerProps } from "./Scanner";

/**
 * Everything that stands between the hero's shader and the rest of the page.
 *
 * The Scanner itself knows how to draw; it does not know whether it should, or
 * what to do when it cannot. That is this component's job, and there are four
 * separate reasons the shader may not run:
 *
 *   1. the machine has no usable WebGL context     -> detectWebGL()
 *   2. the renderer throws while constructing      -> WebGLBoundary
 *   3. the GPU takes the context away              -> onContextLost + remount
 *   4. the reader has asked for reduced motion     -> the media query
 *
 * All four land on the same static fallback, so the hero has exactly one
 * degraded appearance rather than four.
 */

/**
 * Loaded on the client only.
 *
 * The component's entire output is a canvas appended in an effect, so there is
 * nothing for the server to render - and `ssr: false` means the server HTML
 * matches the client's first render (the fallback, before detection has run),
 * which removes a whole class of hydration mismatch. It also keeps ogl out of
 * the server bundle.
 */
const Scanner = dynamic(() => import("./Scanner"), {
  ssr: false,
  loading: () => null,
});

/**
 * How many times a lost context is worth rebuilding before giving up.
 *
 * A machine that loses the context repeatedly - a failing driver, a GPU under
 * sustained pressure - will keep losing it, and remounting forever is worse
 * than showing the fallback. Two attempts covers the transient case (a driver
 * reset, a tab restored from the background) without looping.
 */
const MAX_CONTEXT_RECOVERIES = 2;

export default function ScannerMount(props: ScannerProps) {
  /**
   * `undefined` until detection has run, which matters: rendering the fallback
   * during that first tick and the shader after is a crossfade, whereas
   * assuming support and being wrong is a flash of a broken canvas.
   */
  const [tier, setTier] = useState<ReturnType<typeof detectWebGL> | undefined>(
    undefined,
  );
  const [reduced, setReduced] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [givenUp, setGivenUp] = useState(false);

  useEffect(() => {
    setTier(detectWebGL());
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const show = tier != null && !reduced && !givenUp;
  if (!show) return <HeroScannerFallback />;

  return (
    <WebGLBoundary resetKey={generation} fallback={<HeroScannerFallback />}>
      <Scanner
        // Changing the key discards the old canvas and its dead context and
        // builds a fresh one, which is the recovery. See onContextLost.
        key={generation}
        {...props}
        onContextLost={() => {
          setGeneration((g) => {
            if (g + 1 > MAX_CONTEXT_RECOVERIES) {
              setGivenUp(true);
              return g;
            }
            return g + 1;
          });
        }}
      />
    </WebGLBoundary>
  );
}
