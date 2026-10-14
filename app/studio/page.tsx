import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Studio from "./Studio";

export const metadata: Metadata = {
  title: "Frame studio",
  robots: { index: false, follow: false },
};

/**
 * /studio exists only under `next dev`.
 *
 * The studio is a build tool (see ./Studio): it renders hero frames and saves
 * them through /api/save-frame, which refuses to run outside development. On
 * the deployed site the page could do nothing but expose internals, so a
 * production build answers 404 here instead.
 */
export default function StudioPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Studio />;
}
