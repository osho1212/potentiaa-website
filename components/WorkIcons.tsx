/**
 * The Work section's card icons.
 *
 * Same drawing convention as FlowIcon in components/HeroLabels: a 24x24 box,
 * no fill, `currentColor` stroke at 2px with round caps and joins. Stroke
 * rather than fill is what lets one icon sit on the dark card and again on the
 * white hover state without a second asset - it inherits whatever colour the
 * badge is currently painting.
 *
 * Keyed by name rather than by index. The two tab panels are separate lists
 * that can be reordered independently, and a positional lookup would silently
 * hand the clinic card the truck the moment someone moves a line in site.ts.
 */

export type WorkIconName =
  | "network"
  | "database"
  | "wrench"
  | "cycle"
  | "chart"
  | "link"
  | "package"
  | "pulse"
  | "factory"
  | "headset"
  | "graduation"
  | "bell";

const PATHS: Record<WorkIconName, React.ReactNode> = {
  /* --- What we build --- */

  // Connected Operations: a hub with branches reaching two nodes.
  network: (
    <>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M12 7v4M12 11l-5.6 6M12 11l5.6 6" />
    </>
  ),

  // Digital Records: stacked storage, the register made structured.
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </>
  ),

  // Internal Tools: the thing you build when nothing off the shelf fits.
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),

  // Workflow Automation: the loop that runs without anyone pushing it.
  cycle: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </>
  ),

  // Management Visibility: the view an owner does not have to ask for.
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </>
  ),

  // System Integration: two links joined, tools that already exist.
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),

  /* --- Who we help --- */

  // Distribution: stock in a box, moving.
  package: (
    <>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
      <path d="m7.5 4.27 9 5.15" />
    </>
  ),

  // Clinics: the trace on the monitor.
  pulse: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,

  // Workshops: the shed floor, where the job card lives.
  factory: (
    <>
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h1M12 18h1M7 18h1" />
    </>
  ),

  /* Service businesses: the request coming in, and someone taking it.
     Sized to leave a 1-unit margin all round - a 2px stroke bleeds half its
     width past the path, so geometry drawn to the edge of the 24-unit box gets
     shaved by the viewBox. */
  headset: (
    <>
      <path d="M4 11a8 8 0 0 1 16 0" />
      <rect x="2" y="11" width="5" height="7" rx="1.5" />
      <rect x="17" y="11" width="5" height="7" rx="1.5" />
      <path d="M20 18v1a2 2 0 0 1-2 2h-5" />
    </>
  ),

  // Education and training: the cap, the plainest sign of the sector.
  graduation: (
    <>
      <path d="M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 2.5 9 2.5 12 0v-5" />
      <path d="M22 10v6" />
    </>
  ),

  // Hospitality and events: the counter bell, service on demand.
  bell: (
    <>
      <path d="M5 17a7 7 0 0 1 14 0" />
      <rect x="3" y="17" width="18" height="3" rx="1.5" />
      <path d="M12 7v3" />
      <path d="M10.5 7h3" />
    </>
  ),
};

export default function WorkIcon({ name }: { name: WorkIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
