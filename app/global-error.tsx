"use client";

/**
 * The last resort: an error thrown in the ROOT layout itself.
 *
 * `app/error.tsx` sits inside the layout, so it cannot catch a failure in the
 * layout that renders it. This one replaces the whole document, which is why it
 * has to supply its own <html> and <body> - by the time it renders, the real
 * ones never mounted.
 *
 * That also means none of the site's stylesheets are guaranteed to have been
 * applied, since they are imported by the layout that just failed. So this file
 * carries its own styles inline rather than referencing a class that may not
 * exist. It is the one place in this codebase where an inline style block is
 * the correct answer instead of a shortcut.
 *
 * Deliberately plain: no fonts to load, no images to fetch, nothing that could
 * itself fail. A fallback with dependencies is not a fallback.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#020A24",
          color: "#FFFFFF",
          fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
          lineHeight: 1.6,
        }}
      >
        <div style={{ maxWidth: "34rem", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Something went wrong
          </p>
          <h1
            style={{
              margin: "16px 0 0",
              fontSize: "clamp(28px, 5vw, 40px)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              fontWeight: 500,
            }}
          >
            The site failed to load.
          </h1>
          <p style={{ margin: "16px 0 0", color: "rgba(255,255,255,0.64)" }}>
            This one is on us. Reloading usually clears it.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "28px",
              minHeight: "44px",
              padding: "0 24px",
              borderRadius: "999px",
              border: "none",
              background: "#265DFF",
              color: "#FFFFFF",
              font: "inherit",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>

          {error.digest ? (
            <p
              style={{
                margin: "20px 0 0",
                fontSize: "12px",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
