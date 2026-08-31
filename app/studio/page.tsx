import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StudioClient from "./StudioClient";

/**
 * /studio - a local build tool, gated so it never reaches production.
 *
 * WHY THIS SPLIT EXISTS. The studio bakes the module's frame sequence with
 * three.js and a marching-cubes model. It was a plain client route, which meant
 * three, RoomEnvironment and lib/heroModel were compiled into the production
 * build and the page was publicly routable on the live site - a developer tool
 * with a "Bake frames" button, reachable by anyone who guessed the URL. Its own
 * API dependency already refused to run outside development, so the button was
 * inert, but the route and its payload shipped regardless.
 *
 * Making this file a SERVER component is what does the work: `notFound()` runs
 * before any client code is referenced, so in a production build the three.js
 * chunk is not reachable from any rendered route and never enters the graph.
 * A `NODE_ENV` check inside the client component would have gated the UI while
 * still shipping the engine behind it.
 *
 * `NODE_ENV` is set to "production" by `next build`/`next start` and is not
 * attacker-controllable, so this is a real boundary rather than a soft flag.
 */

export const metadata: Metadata = {
  title: "Frame studio",
  robots: { index: false, follow: false },
};

export default function StudioPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <StudioClient />;
}
