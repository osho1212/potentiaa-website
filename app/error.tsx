"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary.
 *
 * WHY THIS FILE EXISTS. Until now the repository had no error boundary of any
 * kind - no `error.tsx`, no `global-error.tsx`, no class component with
 * `componentDidCatch` anywhere. The homepage builds a WebGL renderer inside a
 * `useEffect`, and React propagates a commit-phase throw up to the nearest
 * boundary; with none present, that unwound the entire root and left the reader
 * on Next's stock application-error screen. A decorative background could take
 * the whole page down.
 *
 * This is the floor under that: whatever throws, the reader still gets a
 * branded page, an explanation in plain language, and two ways out. The
 * specific WebGL remedy lives in components/WebGLBoundary.tsx and catches the
 * failure much closer to its source - this file is what catches everything
 * nobody predicted.
 *
 * `reset()` re-renders the segment without a full document load, which is worth
 * offering first: most transient failures (a lost GPU context, a chunk that
 * failed to fetch on a flaky connection) clear on a second attempt.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Console only. There is no error-reporting service configured, and adding
    // one would be a data-collection decision the site owner has not made.
    console.error("Route error:", error);
  }, [error]);

  return (
    <main className="fallback-page">
      <div className="fallback-page__inner">
        <p className="fallback-page__eyebrow">Something went wrong</p>
        <h1 className="fallback-page__title">This page didn&rsquo;t load properly.</h1>
        <p className="fallback-page__body">
          The problem is on our side, not yours. Trying again usually clears it.
        </p>

        <div className="fallback-page__actions">
          <button type="button" className="btn btn--primary" onClick={reset}>
            Try again
          </button>
          <a className="btn btn--ghost" href="/">
            Back to home
          </a>
        </div>

        {error.digest ? (
          <p className="fallback-page__digest">
            Reference: <code>{error.digest}</code>
          </p>
        ) : null}
      </div>
    </main>
  );
}
