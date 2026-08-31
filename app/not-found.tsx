import type { Metadata } from "next";
import Link from "next/link";

/**
 * 404.
 *
 * Reached by an unknown URL, and - once /studio is gated - by anyone hitting
 * the design tool in production, which calls `notFound()` there.
 *
 * `robots: noindex` because a 404 that gets indexed is a 404 that shows up in
 * search results.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="fallback-page">
      <div className="fallback-page__inner">
        <p className="fallback-page__eyebrow">404</p>
        <h1 className="fallback-page__title">This page doesn&rsquo;t exist.</h1>
        <p className="fallback-page__body">
          The link may be out of date, or the address may have a typo in it.
        </p>

        <div className="fallback-page__actions">
          <Link className="btn btn--primary" href="/">
            Back to home
          </Link>
          <Link className="btn btn--ghost" href="/contact">
            Get in touch
          </Link>
        </div>
      </div>
    </main>
  );
}
