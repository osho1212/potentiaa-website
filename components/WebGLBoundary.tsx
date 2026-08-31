"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * An error boundary around one decorative WebGL layer.
 *
 * WHY A CLASS. React still offers no hook equivalent - `getDerivedStateFromError`
 * and `componentDidCatch` are class-only in React 19. This is the single class
 * component in the codebase and it exists for that reason alone.
 *
 * WHY A BOUNDARY AND NOT A try/catch. The failure being caught here does not
 * happen where you would put a try/catch. A WebGL renderer is constructed inside
 * a `useEffect`, and a context that cannot be created throws there - during the
 * commit phase, after render has already succeeded. React treats a commit-phase
 * throw as unrecoverable and unwinds to the nearest boundary; with none in the
 * tree it unwinds to the root, which is how a background effect ended up
 * replacing the entire homepage with Next's application-error screen.
 *
 * A try/catch inside the effect would catch a synchronous constructor throw, but
 * not a throw from a later frame of the animation loop, and not one from a child
 * that renders as a result. The boundary catches all three.
 *
 * SCOPE IS THE POINT. This wraps the canvas and nothing else. When it trips, the
 * hero's copy, buttons, and the six flow cards are all untouched - they are
 * siblings, not children. The reader loses an ambient background and keeps the
 * entire page.
 */

export interface WebGLBoundaryProps {
  children: ReactNode;
  /** Rendered in place of `children` once a throw has been caught. */
  fallback: ReactNode;
  /**
   * Change this to clear the failed state and remount the child.
   *
   * Used for context loss, which is recoverable: the parent bumps a generation
   * counter, this boundary forgets the failure, and a fresh renderer is built on
   * a fresh canvas. Without it a recovered context would still show the
   * fallback, because a boundary that has caught stays caught.
   */
  resetKey?: number;
  /** Notified once per catch. For diagnostics; not required. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface WebGLBoundaryState {
  failed: boolean;
}

export default class WebGLBoundary extends Component<
  WebGLBoundaryProps,
  WebGLBoundaryState
> {
  state: WebGLBoundaryState = { failed: false };

  static getDerivedStateFromError(): WebGLBoundaryState {
    return { failed: true };
  }

  componentDidUpdate(prev: WebGLBoundaryProps) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    /**
     * `console.warn`, not `console.error`.
     *
     * Losing an ambient background is not an error condition for the reader -
     * the page is fully usable without it - and logging it at error level
     * trains everyone to ignore the console on a site where a real error would
     * matter. It is still logged, because a machine that cannot create a WebGL
     * context is worth knowing about.
     */
    console.warn("WebGL layer failed; showing the static fallback.", error);
    this.props.onError?.(error, info);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
