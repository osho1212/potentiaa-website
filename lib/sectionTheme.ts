/**
 * The colour journey down the page.
 *
 * The page was monotone: one near-black ground from top to bottom, with two
 * static glows parked off-canvas and six shards pinned in the corners. Nothing
 * changed as you scrolled, so nothing built.
 *
 * Each section now owns an accent. The depth field reads whichever section is
 * nearest the sightline and LERPS toward its accent rather than switching, so
 * the falling cubes and the ambient wash change colour continuously as you move
 * between sections instead of stepping at the boundary. That is what makes it
 * read as one graded environment rather than seven painted rooms.
 *
 * THE LAST ENTRY MUST RESOLVE BACK TO THE FIRST. The page loops: the CTA's
 * bottom edge is the hero's top edge, so if the two ends of this list did not
 * meet you would see the colour snap at the seam - the exact defect the
 * waypoint list has its own warning about.
 */

export type SectionTheme = {
  /** Matches the section's own class or id, in document order within a lap. */
  key: string;
  /** rgb triple - kept numeric because these are interpolated every frame. */
  accent: [number, number, number];
  /**
   * How much room this section leaves the floating module, 0..1.
   *
   * Not a style preference - it is a measurement of what is free. The hero
   * reserves a full-width empty band for the module, so it can be at full size
   * there. The explainer sections give their left column to Zeal and their
   * right to a grid of cards, so the module has only the outer margins to
   * thread through and has to come down or it cannot pass without covering
   * something.
   */
  room: number;
  /**
   * Which plane the module occupies while this section is on screen.
   *
   * +1 = in front of the content, -1 = behind it. They ALTERNATE down the page
   * on the owner's call: hero in front, the next section behind, the next in
   * front, and so on, so the object reads as circling the text in a space
   * rather than weaving on a fixed cycle that has nothing to do with what you
   * are reading.
   *
   * There are SIX sections now that `services` is gone, and six is even, so the
   * list alternates the whole way round and the last entry meets the first on
   * the opposite plane by construction. It used to be seven: `cta` had to
   * repeat `process`'s plane to avoid the loop closing on a matching pair, and
   * the flip was hidden across the seam into `hero`. That workaround is no
   * longer needed - if a seventh section is ever added back, it returns.
   */
  plane: 1 | -1;
};

/* Sampled from tokens.css so the journey stays inside the brand palette:
   midnight-500, blue-500, blue-300, coral-500, coral-600, and back to midnight
   to close the loop. (magenta-500 left with `services`; the ramp still runs
   cool to warm and home again without it.) */
export const SECTION_THEMES: SectionTheme[] = [
  { key: "hero", accent: [46, 76, 166], room: 1.0, plane: 1 },
  { key: "intro", accent: [38, 93, 255], room: 0.86, plane: -1 },
  { key: "work", accent: [126, 155, 255], room: 0.78, plane: 1 },
  { key: "method", accent: [255, 106, 91], room: 0.82, plane: -1 },
  { key: "process", accent: [242, 91, 78], room: 0.9, plane: 1 },
  { key: "cta", accent: [46, 76, 166], room: 0.95, plane: -1 },
];

export function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): string {
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)}, ${Math.round(
    a[1] + (b[1] - a[1]) * k,
  )}, ${Math.round(a[2] + (b[2] - a[2]) * k)})`;
}

/**
 * Which theme applies right now, and how far it has blended into the next one.
 *
 * Resolved from real section geometry rather than from lap progress. Sections
 * are not equal heights, so progress would drift out of step with what is
 * actually on screen - and the two laps make any progress-based lookup
 * ambiguous at the seam anyway.
 */
export function themeAt(sightline: number): { from: SectionTheme; to: SectionTheme; t: number } {
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>("[data-theme-key]"),
  );

  let current = SECTION_THEMES[0];
  let next = SECTION_THEMES[1] ?? SECTION_THEMES[0];
  let t = 0;

  for (const el of sections) {
    const box = el.getBoundingClientRect();
    if (box.height === 0) continue;
    if (sightline < box.top || sightline > box.bottom) continue;

    const key = el.dataset.themeKey ?? "";
    const index = SECTION_THEMES.findIndex((s) => s.key === key);
    if (index < 0) continue;

    current = SECTION_THEMES[index];
    next = SECTION_THEMES[(index + 1) % SECTION_THEMES.length];

    // Blend across the whole section so the colour is always moving, and is
    // fully arrived exactly as the next section takes over.
    t = Math.max(0, Math.min(1, (sightline - box.top) / box.height));
    break;
  }

  return { from: current, to: next, t };
}
