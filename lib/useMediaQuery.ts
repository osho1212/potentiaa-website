"use client";

import { useEffect, useState } from "react";

/**
 * A media query, as reactive state.
 *
 * The components that tier their own cost by viewport were each reading
 * `window.matchMedia(...).matches` once, inside a `useEffect` with an empty
 * dependency array, and never listening for it to change. That is correct
 * exactly once - at mount - and wrong from the first rotation onwards: a phone
 * turned on its side, or a window dragged wider, kept whatever tier it happened
 * to load at. Load the page on a desktop, narrow it to phone width, and the
 * 40,800-particle swarm stayed.
 *
 * RETURNS `null` UNTIL THE ANSWER IS KNOWN, which is the point of the hook
 * rather than an awkwardness in it. There is no `window` during the server
 * render, so a hook that returned a boolean would have to guess one, and every
 * caller here uses the value to size expensive work. Guessing means building
 * the wrong tier and then tearing it down - on mobile, allocating the full
 * desktop swarm before replacing it, which is the exact cost the tiering exists
 * to avoid. `null` lets a caller wait one render instead, and build once.
 */
export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
