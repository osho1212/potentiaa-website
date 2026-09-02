"use client";

import { useEffect, useRef, useState } from "react";
import { FRAME_COUNT, FRAME_SIZE, framePath, WAYPOINTS } from "@/lib/frames";
import { scrollState } from "@/lib/scrollState";
import { moduleBerth } from "@/lib/moduleBerth";
import { themeAt } from "@/lib/sectionTheme";
import LogoMark from "./LogoMark";

/**
 * The hero element: Potentiaa's three welded modules (lib/heroModel),
 * pre-rendered as a tumble and played back on an HTML5 canvas.
 *
 * A frame sequence rather than live WebGL, so playback costs almost nothing on
 * the GPU and holds 60fps on cheap phones. Two things are driven off the scroll
 * progress in lib/scrollState:
 *
 *   1. the frame index, which turns the stack;
 *   2. the container's position/scale/rotation, eased through the waypoints in
 *      lib/frames.ts.
 *
 * Both were built to close cleanly, back when the page looped: the frame index
 * wraps modulo FRAME_COUNT, the tumble is built from sines over the full range
 * so its last frame is its first, and the waypoints are authored so the first
 * and last entries match. Nothing needs that symmetry now that there is no
 * seam to hide, but it is kept - it reads as the module coming home over the
 * closing sections rather than as a trick, and undoing it would mean
 * re-authoring the tumble for no gain.
 *
 * Driven from a plain rAF loop rather than GSAP ScrollTrigger. That started as
 * a hard requirement (ScrollTrigger assumes monotonic progress and broke on the
 * wrap) and is now simply the cheaper option - see lib/scrollState.
 *
 * If the sequence has not been generated yet (see /studio) the canvas is
 * swapped for the flat vector mark so the page is never broken.
 */

/** Smoothstep - eases each waypoint-to-waypoint move in and out. */
const ease = (t: number) => t * t * (3 - 2 * t);


/**
 * THE HELIX.
 *
 * The module orbits the reading column as you scroll: it crosses the screen
 * horizontally on a sine, and its DEPTH runs on the second harmonic of the same
 * angle, so the two are locked in a fixed relationship rather than drifting
 * against each other.
 *
 * That relationship is the whole design, and it is what makes "float in front
 * of the text, and behind it at other moments" safe to build:
 *
 *      x = sin(theta)          -1 = far left,  +1 = far right
 *      z = -cos(2 * theta)     -1 = behind,    +1 = in front
 *
 * Check the four quarter-turns and the rule falls out. At theta = 0 the module
 * is dead centre, over the reading column - and z is -1, its furthest BACK, so
 * the text sits on top of it. At theta = pi/2 it is out at the right margin,
 * clear of every word - and z is +1, its furthest FORWARD, so it passes over
 * the page in the one place there is nothing to cover.
 *
 * So it is in front only where the page is empty, and behind exactly where the
 * words are. The reader sees an object weaving through the text; the object
 * never obscures anything. That is not a collision system with rules and
 * exceptions - it cannot collide, because the geometry does not allow it.
 *
 * Everything else follows from z: scale (nearer is bigger), blur and opacity
 * (distance haze), and which side of the content it renders on.
 */

/** Whole helix turns per page. Three reads as deliberate; more reads as spin. */
const HELIX_TURNS = 3;

/**
 * How far off centre it swings, as a fraction of half the viewport width.
 *
 * Over 1, on purpose. The reading column is 1200px of a 1280px viewport, so
 * there is no margin to hide in - at 0.82 the module could never actually clear
 * the text and the front half of the helix collapsed to 10 frames out of 81.
 * Swinging past the edge means the forward pass happens half off-screen, which
 * is both the only place it is genuinely clear of copy and the more dramatic
 * read: the object swings out of frame and back through.
 */
const HELIX_REACH = 1.06;

/** Depth-driven scale range: 1 - DEPTH_SCALE at the back, 1 + it at the front. */
const DEPTH_SCALE = 0.34;

/**
 * THE DOCK.
 *
 * The page does not begin with the module already floating in the hero. It
 * begins with the module BEING THE LOGO: parked on the header's mark, at the
 * mark's size, next to the wordmark. It stays there for the whole hero, lifts
 * out into the helix once the hero has scrolled past, and at the end of the page
 * flies back and settles into the same spot.
 *
 * It holds through the hero rather than leaving immediately because the hero
 * has its own artwork now - a still of this same object, pinned to the right of
 * the fold (components/sections/Hero.tsx). Two copies of one object in one
 * section reads as a mistake however they are arranged, so the module does not
 * merely dodge the art: it is not in that section at all.
 *
 * Which costs nothing to close at the seam, because the seam is the dock. The
 * page loops, so progress 1 and progress 0 are the same instant on screen, and
 * both of them are "docked" - so the two ends of the page agree by construction
 * rather than by being tuned to agree. The turntable is already at frame 0
 * there, and the waypoints already match, so the whole object arrives home on
 * every axis at once.
 *
 * The flat SVG mark in the header is crossfaded against this (see
 * `--hero-dock` in globals.css) so there is exactly one mark in the navbar at
 * any moment, and the navbar is never empty.
 */

/**
 * Fraction of the page spent flying out of the navbar, and again flying back.
 *
 * Long enough that it lifts out rather than snaps out. It is the same span in
 * both directions, so the departure and the return are the same move.
 */
const DOCK_SPAN = 0.085;

/**
 * Sprite size when docked, as a multiple of the header logo's box.
 *
 * Over 1 because the sprite is not the artwork - the frames are rendered with
 * a margin around the model (FRUSTUM in /studio) and the body fills about 84%
 * of the square. Scaling the SPRITE to the logo's 30px would land a 25px mark
 * beside a 30px wordmark; scaling it to 1.2x puts the ARTWORK at 30px, which
 * is what the eye measures.
 */
const DOCK_FILL = 1.2;

type Flight = {
  /** Viewport px. */
  x: number;
  /** Viewport px. */
  y: number;
  scale: number;
  /** -1 fully behind the content, +1 fully in front. */
  depth: number;
  rotate: number;
  opacity: number;
  /** 1 parked on the header mark, 0 fully out on the helix. */
  dock: number;
};

/**
 * Fallback for how much of the page the hero occupies, used only until the real
 * measurement lands. The measured value is what actually drives the hold - see
 * `heroSpan` in the tick.
 */
const HERO_SPAN_FALLBACK = 0.135;

/**
 * How docked the module is at scroll progress `p`, given how much of the page the
 * hero occupies.
 *
 * Asymmetric, and deliberately so. The two ends of the page are not the same
 * situation any more:
 *
 *   OUT   holds at 1 for the whole hero, then eases to 0 over DOCK_SPAN. The
 *         module has to be gone from the hero, and "gone" means it has not
 *         started moving yet, not that it is on its way.
 *   BACK  eases 0 to 1 over the last DOCK_SPAN, landing exactly on p = 1.
 *
 * The seam still closes, which is the only thing that could not be traded
 * away: `back` is 1 at p = 1 and `out` is 1 at p = 0, so both sides of the wrap
 * read fully docked and the module is already home when the page loops.
 */
function dockAt(p: number, heroSpan: number): number {
  const out = (p - heroSpan) / DOCK_SPAN;
  const back = (1 - p) / DOCK_SPAN;
  const travel = Math.min(Math.max(Math.min(out, back), 0), 1);
  return 1 - travel * travel * (3 - 2 * travel);
}

/**
 * Where the module is right now, in viewport coordinates.
 *
 * Driven by scroll progress, so it travels the WHOLE page rather than living in
 * the hero's reserved band. `progress` is already wrapped to 0..1 per page and
 * the helix uses a whole number of turns, so the last frame of the page and the
 * first frame of the next are the same pose - the seam needs no special case,
 * exactly like the shard drift.
 */
function flightAt(
  progress: number,
  cubeSize: number,
  room: number,
  plane: number,
): Flight {
  const shape = shapeAt(progress);
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const theta = progress * HELIX_TURNS * Math.PI * 2;
  const swing = Math.sin(theta);

  // DEPTH COMES FROM THE SECTION, not from the second harmonic.
  //
  // The harmonic version tied the plane to the helix phase, which meant the
  // object could change sides three times inside one section for reasons that
  // had nothing to do with what the reader was looking at. Driving it from the
  // section instead - front, back, front, back down the page - is what makes it
  // read as circling the text: you get one clear pass per section, and the flip
  // lands on a boundary where a change of plane is legible as a change.
  //
  // `plane` is already interpolated across the section boundary by the caller,
  // so this is a smooth -1..+1 rather than a switch, and everything derived
  // from it - scale, blur, opacity - eases across the handover with it.
  const depth = plane;

  // Vertical drift is deliberately slow and shallow - a third of a cycle over
  // the page. The scroll itself supplies the vertical movement; adding a fast
  // vertical oscillation on top reads as bouncing rather than floating.
  const rise = Math.sin(theta / HELIX_TURNS + Math.PI / 2);

  const scale = (1 + depth * DEPTH_SCALE) * shape.scale * room;
  const width = cubeSize * scale;

  let x = vw / 2 + swing * (vw / 2) * HELIX_REACH * shape.reach;

  // No clearance clamp any more. It used to shove the module out of the
  // reading column whenever it came forward, on the assumption that covering
  // copy was always a defect. The owner's call is the opposite: the module is
  // the foreground object in the sections it fronts, and overlap is the point -
  // it is what makes the text sit in a space rather than on a page. So it flies
  // where the helix puts it.

  const y = vh / 2 + rise * vh * 0.12 + shape.rise * vh;

  return {
    x,
    y,
    scale,
    depth,
    rotate: swing * 26,
    // Haze with distance. The far pass is dimmer as well as smaller, which is
    // what sells it as depth rather than as a shrinking sprite.
    // Haze with distance, and the far end is genuinely faint. The reader is
    // meant to look THROUGH the back plane at the words in front of it, so a
    // module at full depth is atmosphere rather than an object competing for
    // attention.
    opacity: 0.36 + ((depth + 1) / 2) * 0.62,
    // The helix knows nothing about the navbar. The caller mixes the dock in
    // on top of this, so this is always the fully-departed pose.
    dock: 0,
  };
}

/** Interpolates the waypoint list at scroll progress `p` (0..1). */
function shapeAt(p: number): { reach: number; scale: number; rise: number } {
  const list = WAYPOINTS;
  let i = 0;
  while (i < list.length - 2 && p > list[i + 1].at) i += 1;

  const a = list[i];
  const b = list[i + 1];
  const span = b.at - a.at;
  const t = span <= 0 ? 0 : ease(Math.min(Math.max((p - a.at) / span, 0), 1));

  return {
    reach: a.reach + (b.reach - a.reach) * t,
    scale: a.scale + (b.scale - a.scale) * t,
    rise: a.rise + (b.rise - a.rise) * t,
  };
}

export default function ModuleStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const [framesMissing, setFramesMissing] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const shadow = shadowRef.current;
    if (!container || !canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = FRAME_SIZE * dpr;
    canvas.height = FRAME_SIZE * dpr;
    ctx.scale(dpr, dpr);

    // ---- Preload the sequence -------------------------------------------
    const images: (HTMLImageElement | null)[] = [];
    const ready: boolean[] = new Array(FRAME_COUNT).fill(false);
    let firstFrameFailed = false;
    let drawn = -1;

    const draw = (index: number) => {
      if (firstFrameFailed) return;
      const wanted = ((Math.round(index) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
      let pick = wanted;

      if (!ready[pick]) {
        // Walk backwards for the closest decoded frame so early scrolls during
        // preload still show something rather than blanking.
        for (let step = 1; step < FRAME_COUNT; step += 1) {
          const candidate = (wanted - step + FRAME_COUNT) % FRAME_COUNT;
          if (ready[candidate]) {
            pick = candidate;
            break;
          }
        }
      }

      if (pick === drawn) return;
      const img = images[pick];
      if (!img?.complete || img.naturalWidth === 0) return;

      ctx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
      ctx.drawImage(img, 0, 0, FRAME_SIZE, FRAME_SIZE);
      drawn = pick;
    };

    /**
     * How much of the turntable to download.
     *
     * All 90 frames is 2.1MB, and it was fetched unconditionally - on phones,
     * where the cube renders at 55% opacity behind the content, and under
     * prefers-reduced-motion, where it now holds a single frame and never
     * scrubs at all. Both cases paid for 89 frames they cannot show.
     *
     * Reduced motion needs exactly one. Narrow viewports take every third
     * frame, which is a 30-step turntable - still a rotation, at a third of the
     * bytes, on the connection least able to afford them. Everything else gets
     * the full sequence.
     *
     * `draw` already walks backwards to the nearest decoded frame, so a sparse
     * set needs no other change: it simply lands on the neighbour.
     */
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const step = reduced ? FRAME_COUNT : narrow ? 3 : 1;

    for (let i = 0; i < FRAME_COUNT; i += 1) {
      if (i % step !== 0) {
        images.push(null);
        continue;
      }

      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        ready[i] = true;
        if (i === 0) draw(0);
      };
      img.onerror = () => {
        if (i === 0) {
          firstFrameFailed = true;
          setFramesMissing(true);
        }
      };
      img.src = framePath(i);
      images.push(img);
    }

    // ---- Drive position and frame from scroll progress ----------------------
    let raf = 0;
    let last = performance.now();

    // Damped toward the target each frame. This is what the old GSAP
    // `scrub: 1.2` bought us - the stack trails the scroll instead of being
    // welded to it.
    let flight: Flight | null = null;

    /** Last `--hero-dock` written to the root, so we only write on change. */
    let dockWritten = -1;
    let landedWritten: boolean | null = null;

    /**
     * When the slow-cadence layout read last ran.
     *
     * It used to also collect the rect of every word on screen, for a clearance
     * test that decided whether the module was allowed to come forward. That
     * test went when the owner ruled that overlap is the point and the module
     * is simply the foreground object - but the sweep feeding it stayed, and
     * kept running against a function nobody called: 157 nodes, a
     * getBoundingClientRect each, sixteen times a second. Measured at 0.82ms a
     * sweep, that was 13.7ms of forced layout per second buying nothing.
     */
    let rectsAt = 0;

    /**
     * Where the header's mark is, in viewport pixels - the module's berth.
     *
     * Read rather than hard-coded, because the header is a centred pill of
     * `min(100% - space-8, container-max)` and the wordmark disappears under
     * 900px, so the mark's x moves with the viewport and its y moves with the
     * type scale. Measured on the same slow cadence as the text: the header is
     * fixed, so this only changes on resize.
     */
    let logoBox: DOMRect | null = null;

    /**
     * How much of the page the hero occupies - the length of the dock's hold.
     *
     * Measured rather than fixed. The hero is 100svh and the sections under it
     * are not, so this is about 0.10 on a short laptop and 0.15 on a tall
     * monitor; a constant would let the module lift out over the hero at one
     * end of that range and loiter in the header past it at the other. Both
     * numbers come from live layout, so a resize corrects it on the next read.
     */
    let heroSpan = HERO_SPAN_FALLBACK;

    /**
     * The sprite's CSS width - the one number everything else is scaled from.
     *
     * Cached, because it is a constant. The container is sized by the
     * stylesheet and only ever SCALED by a transform, which does not change the
     * layout box: measured live it read 511 on every frame of a scroll.
     *
     * It was read straight from the element four times a frame, and the last of
     * those sat in `apply`, immediately after writing left/top/transform. A
     * layout read after a style write forces the browser to flush layout then
     * and there: measured on this element, 0.292ms against 0.002ms for the
     * writes alone. Every frame, to re-learn 511.
     */
    let cubeSize = container.offsetWidth;

    const refreshLayout = (now: number) => {
      if (now - rectsAt < 60) return;
      rectsAt = now;

      // Before the styles for this frame are written, so it is a clean read
      // rather than a forced reflow. Resize is the only thing that moves it.
      cubeSize = container.offsetWidth || cubeSize;

      logoBox =
        document.querySelector<HTMLElement>(".header__logo")?.getBoundingClientRect() ??
        null;

      const heroHeight = document.querySelector<HTMLElement>("section.hero")?.offsetHeight;
      const span = scrollState.span;
      if (heroHeight && span > 0) {
        heroSpan = Math.min(heroHeight / span, 0.4);
      }

    };

    /**
     * One write per frame, in viewport pixels.
     *
     * `left`/`top` in vw/vh is gone: the helix is computed in real pixels
     * against the real viewport, and converting back into percentage units only
     * to have the browser convert them forward again loses precision on the
     * depth clamp, which is the one number that must not drift.
     */
    const apply = (flight: Flight, bob: number) => {
      container.style.transform = `translate3d(${flight.x.toFixed(1)}px, ${(flight.y + bob).toFixed(1)}px, 0) translate(-50%, -50%) scale(${flight.scale.toFixed(4)}) rotate(${flight.rotate.toFixed(2)}deg)`;

      const size = cubeSize * flight.scale;
      const box = new DOMRect(
        flight.x - size / 2,
        flight.y + bob - size / 2,
        size,
        size,
      );

      // FRONT OR BEHIND. The point of the depth axis: the module changes which
      // side of the content it renders on, so the text is genuinely BETWEEN the
      // falling cubes and the module rather than everything being layered under
      // one fixed order.
      const inFront = flight.depth > 0;

      // Docked, the module is standing in for the header's logo, so it has to
      // paint OVER the header's glass pill - which sits above everything the
      // helix ever uses. It takes that layer for the whole departure and the
      // whole return, not just at rest: sliding under the pill halfway out of
      // the navbar is exactly the moment the illusion would break.
      container.style.zIndex = flight.dock > 0.02
        ? "var(--z-docked)"
        : inFront
          ? "var(--z-stack)"
          : "var(--z-behind)";

      // Solid in front, full stop.
      //
      // An earlier version dropped the module to 42% wherever words sat under
      // it, on the reasoning that a foreground object must never cost
      // legibility. The owner ruled otherwise - "make it the foreground, even
      // if it covers text, I do not care about the overlaps" - and they are
      // right about what it costs: a foreground object that goes translucent
      // the moment it matters is not in the foreground, it is a watermark.
      //
      // So the only thing still modulating opacity is DISTANCE, which is the
      // one thing it should be: near is solid, far is hazy.
      container.style.opacity = String(flight.opacity);

      // Only the far plane is hazed. A forward pass stays in focus even when it
      // is translucent - blurring it as well would read as a smudge on the
      // screen rather than as an object between the reader and the page.
      // Dynamic directional shadow cast onto the page & text when floating in front
      if (shadow) {
        const shadowIntensity = inFront ? Math.max(0, Math.min(1, flight.depth)) : 0;
        shadow.style.opacity = String((shadowIntensity * 0.475).toFixed(3));
        const shadowOffX = (flight.x - window.innerWidth / 2) * 0.05;
        const shadowOffY = 32 + shadowIntensity * 28;
        shadow.style.transform = `translate3d(${shadowOffX.toFixed(1)}px, ${shadowOffY.toFixed(1)}px, 0) scale(${Math.max(0.65, 1.05 - shadowIntensity * 0.15).toFixed(3)})`;
      }

      container.style.visibility = flight.opacity < 0.02 ? "hidden" : "visible";

      // Hand the dock to CSS so the flat SVG mark in the header can fade
      // against it. Written only when it actually moves - it is a custom
      // property on the root, so every write is a style recalc of the document,
      // and it is pinned at 0 for most of the page.
      //
      // Gated on the sequence having painted at least once. The module docks
      // from the first frame, but the canvas is empty until frame 0 decodes,
      // and fading the flat mark out before then would leave the navbar with
      // no mark at all for as long as the fetch takes. This also covers the
      // missing-sequence case: `drawn` never advances, so the header simply
      // keeps its own logo.
      const rounded = drawn < 0 ? 0 : Math.round(flight.dock * 200) / 200;
      if (rounded !== dockWritten) {
        dockWritten = rounded;
        document.documentElement.style.setProperty("--hero-dock", String(rounded));
      }
    };

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;

      // Before anything reads a rect. The dock needs the header mark's box on
      // the very FIRST frame - that frame initialises `flight` directly from
      // the target rather than damping toward it, so measuring afterwards
      // would open the page with the module in the middle of the hero and then
      // jump it into the navbar.
      refreshLayout(now);

      const p = Math.min(Math.max(scrollState.progress, 0), 1);

      // How much room the section under the sightline leaves the module. Read
      // from the page rather than from a table of scroll offsets, because the
      // sections are not equal heights, so progress alone does not say which
      // one is under the sightline.
      const theme = themeAt(window.innerHeight * 0.5);
      const room = theme.from.room + (theme.to.room - theme.from.room) * theme.t;

      // HOLD, then cross. Not a linear blend across the section.
      //
      // A straight lerp on theme.t looked right in the code and was wrong on
      // screen: it put the module at full depth only at the very first pixel of
      // a section and had it passing through zero at the midpoint, so at the
      // top of the hero - the one place it is supposed to be unambiguously in
      // front - it measured 0.68 opacity and a depth of exactly 0. The object
      // was permanently in transit and never actually anywhere.
      //
      // It now holds its section's plane for the first 72% and crosses over the
      // last 28%, so each section gets a long unambiguous pass and the swap
      // happens where the boundary is. Smoothstepped across that window so the
      // handover still eases rather than snapping.
      const HOLD = 0.72;
      const cross =
        theme.t <= HOLD ? 0 : (theme.t - HOLD) / (1 - HOLD);
      const eased = cross * cross * (3 - 2 * cross);
      const plane =
        theme.from.plane + (theme.to.plane - theme.from.plane) * eased;

      const target = flightAt(p, cubeSize, room, plane);

      // MIX THE DOCK IN.
      //
      // On top of the helix pose, not instead of it: the two are interpolated,
      // so the module does not switch between "navbar object" and "hero
      // object" - it travels between them, growing out of the mark and
      // shrinking back into it. Everything the helix would have done at this
      // progress is still under there, which is why the hand-over has no seam
      // of its own to hide.
      //
      // Reduced motion keeps the old behaviour instead (one pose, centred,
      // handled below): a preference for less movement is not served by
      // pinning the hero art into a 30px slot in the navbar.
      const dock = reduced || !logoBox ? 0 : dockAt(p, heroSpan);

      if (dock > 0 && logoBox) {
        const berthX = logoBox.left + logoBox.width / 2;
        const berthY = logoBox.top + logoBox.height / 2;
        const berthScale = (logoBox.width * DOCK_FILL) / cubeSize;

        target.x += (berthX - target.x) * dock;
        target.y += (berthY - target.y) * dock;
        target.scale += (berthScale - target.scale) * dock;
        target.rotate += (0 - target.rotate) * dock;
        target.opacity += (1 - target.opacity) * dock;
        // Toward the front, so the docked module is never hazed or blurred.
        target.depth += (1 - target.depth) * dock;
        target.dock = dock;
      }

      // MIX THE FLOW BERTH IN, AFTER THE DOCK.
      //
      // The flow section calls the module out of the navbar and onto its glass
      // - see lib/moduleBerth. This has to come after the dock block rather
      // than instead of it, because by the time the section is on screen the
      // helix has long since handed over and `dock` is pinned at 1; mixing
      // over the docked pose is what makes the module GROW OUT of the mark in
      // the header rather than cut to a new position.
      //
      // `dock` is driven back toward 0 with it, which is what returns the flat
      // logo to the navbar - the header crossfades on exactly this value, so
      // leaving it at 1 would fly the module out and leave a hole behind it.
      const berth = reduced ? null : moduleBerth;
      const claim = berth ? berth.strength : 0;
      if (berth && claim > 0.001) {
        const b = claim;
        const berthScale = berth.size / cubeSize;
        const landedX = berth.x + 20;
        target.x += (landedX - target.x) * b;
        target.y += (berth.y - target.y) * b;
        target.scale += (berthScale - target.scale) * b;
        target.rotate += (0 - target.rotate) * b;
        target.opacity += (1 - target.opacity) * b;
        target.depth += (1 - target.depth) * b;
        target.dock += (0 - target.dock) * b;
      }

      const isLanded = claim > 0.05;
      if (isLanded !== landedWritten) {
        landedWritten = isLanded;
        container.classList.toggle("module-stack--landed", isLanded);
      }

      if (!flight || reduced) {
        flight = { ...target };
      } else {
        // Frame-rate independent damping. This is what the old GSAP `scrub`
        // bought us: the module trails the scroll instead of being welded to
        // it, which is most of why it reads as floating rather than sliding.
        //
        // This is the HELIX's rate, and it stays the helix's rate. The berth
        // does not ask for a faster trail, it asks for no trail at all - see
        // `follow` below.
        const k = 1 - Math.exp(-delta * 5);

        /**
         * A BERTH IS A PARK, NOT A PULL.
         *
         * Damping the module toward a berth the same way it is damped toward
         * the helix leaves it permanently chasing: measured mid-scroll, it was
         * still 128px left and 37px high of a berth it had supposedly been
         * sitting in since the top of the section, and it only closed that gap
         * around the halfway mark. What the reader sees is the object sliding
         * right and down for the first half of the screen - which is exactly
         * the "it moves with the scroll" this berth exists to stop. A merely
         * faster rate does not fix it, it only shortens the slide.
         *
         * So at full claim the module IS the target: `follow` reaches 1 and
         * the damping stops existing. It parks.
         *
         * That cannot snap, because `claim` also drives the target. The berth
         * is mixed into the pose by the same number, so as this tightens from
         * the trail toward exact tracking, the thing being tracked is easing
         * into place on the same curve - by the time follow is 1 the module is
         * already there. The motion is owned by the arrival curve rather than
         * by the frame rate, which is what makes it land in the same place at
         * any scroll speed.
         */
        const follow = k + (1 - k) * claim;

        flight.x += (target.x - flight.x) * follow;
        flight.y += (target.y - flight.y) * follow;
        flight.scale += (target.scale - flight.scale) * follow;
        flight.rotate += (target.rotate - flight.rotate) * follow;
        flight.opacity += (target.opacity - flight.opacity) * k;
        // Depth is NOT damped. It decides which side of the content the module
        // renders on, and easing a z-index swap produces a frame where the
        // object is scaled as if in front while still painted behind.
        flight.depth = target.depth;
        // Nor is the dock, for the same reason - it drives a z-index and the
        // header's crossfade. The damping on x/y/scale above is what makes the
        // arrival look eased; damping the dock as well would leave the module
        // still painting over the header's pill after it had visibly left, and
        // would hold the flat mark hidden past the hand-over.
        flight.dock = target.dock;
      }

      // Under reduced motion the whole flight stops: no helix, no drift, no
      // turntable. Previously only the bob was gated while the choreography
      // carried on, which is not honouring the preference - it is decorating
      // around it. It holds one pose, centred, at mid depth.
      if (reduced) {
        flight.x = window.innerWidth / 2;
        flight.y = window.innerHeight / 2;
        flight.rotate = 0;
        flight.depth = -1;
        flight.opacity = 0.9;
        flight.dock = 0;
      }

      // The bob is a floating object's idle. A mark sitting in a navbar is not
      // floating, so it is faded out with the dock - a 10px sine on a 30px
      // logo would read as a bug.
      //
      // Nor is an object PARKED ON A BERTH floating, so it fades out with the
      // claim too. The flow section's berth holds the module at one fixed
      // point in the frame for a whole screen of scrolling, and a 20px sine
      // running through that hold is not read as breathing - it is read as the
      // thing slowly sliding down while you scroll, which is precisely what
      // the berth exists to stop. It eases back in with the release, because
      // the claim it is scaled by is itself eased.
      const bob =
        reduced ? 0 : Math.sin(now / 2600) * 10 * (1 - flight.dock) * (1 - claim);
      apply(flight, bob);

      // One full turntable per page: progress 1 lands on frame 0 again.
      //
      // Except on a berth, where it holds the FRONT VIEW. The tumble in
      // /studio is `y = sin(turn) * 1.01, x = sin(2 * turn) * 0.17,
      // z = sin(turn) * 0.09`, so frame 0 is the one pose with all three
      // rotations at zero - the mark square to the camera. Every other frame
      // is the object caught mid-turn, which is right for something flying
      // past and wrong for something parked: a parked object that is still
      // scrubbing its own rotation is not parked, it is posing.
      //
      // Taken the short way round the turntable and scaled by the claim, so
      // the pose arrives with the snap and unwinds with the release rather
      // than cutting. `draw` wraps its argument, so the value may leave 0..90.
      const scrub = p * FRAME_COUNT;
      let toFront = (((0 - scrub) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
      if (toFront > FRAME_COUNT / 2) toFront -= FRAME_COUNT;
      draw(reduced ? 0 : scrub + toFront * claim);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={containerRef} className="module-stack" aria-hidden="true">
      {/* Real directional shadow cast onto the website and text when moving in front */}
      <div ref={shadowRef} className="module-stack__shadow" aria-hidden="true" />
      {framesMissing ? (
        <>
          <LogoMark className="module-stack__canvas" />
          <p className="module-stack__notice">
            Hero frame sequence not generated yet - open{" "}
            <a href="/studio">/studio</a> to render it.
          </p>
        </>
      ) : (
        <canvas ref={canvasRef} className="module-stack__canvas" />
      )}
    </div>
  );
}
