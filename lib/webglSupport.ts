/**
 * Does this machine actually have WebGL?
 *
 * Asked by probing, not by feature-sniffing the user agent. A browser can
 * expose the API and still fail to create a context: no GPU, a blocklisted
 * driver, a virtual desktop, a privacy build with WebGL switched off, or simply
 * a machine already at its context limit.
 *
 * WHY THIS IS NOT ENOUGH ON ITS OWN. A probe answers "could a context be made a
 * moment ago", which is not the same as "the renderer will construct without
 * throwing". It narrows the common case cheaply; components/WebGLBoundary.tsx
 * catches the rest. Detection and a boundary are complementary, and shipping
 * only one of them is how the crash in the audit happened.
 */

export type WebGLTier = "webgl2" | "webgl" | null;

let cached: WebGLTier | undefined;

/**
 * Memoised, and it releases what it takes.
 *
 * Browsers cap live WebGL contexts at somewhere around 16, and a probe context
 * left dangling is one the real renderer may not get - the exact failure this
 * function exists to predict. `WEBGL_lose_context` is the only way to hand one
 * back before garbage collection gets round to it.
 *
 * Returns null during SSR so it is inert if ever reached on the server.
 */
export function detectWebGL(): WebGLTier {
  if (cached !== undefined) return cached;
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  let probe: HTMLCanvasElement | null = null;
  try {
    probe = document.createElement("canvas");

    // The whole body is guarded because getContext does not merely return null
    // everywhere - Firefox with webgl.disabled=true throws outright.
    const gl2 = probe.getContext("webgl2");
    if (gl2) {
      gl2.getExtension("WEBGL_lose_context")?.loseContext();
      cached = "webgl2";
      return cached;
    }

    const gl1 =
      probe.getContext("webgl") ??
      (probe.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (gl1) {
      gl1.getExtension("WEBGL_lose_context")?.loseContext();
      cached = "webgl";
      return cached;
    }

    cached = null;
    return cached;
  } catch {
    cached = null;
    return cached;
  } finally {
    probe = null;
  }
}

export function isWebGLAvailable(): boolean {
  return detectWebGL() !== null;
}
