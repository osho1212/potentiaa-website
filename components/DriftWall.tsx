"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/**
 * DRIFTWALL - columns of tiles drifting past a perspective plane.
 *
 * Ported from React Bits (JS + CSS) and changed in four places. Each change is
 * either a requirement of this codebase or a consequence of what is on the
 * tiles, and all four are listed because none of them are cosmetic.
 *
 * 1. IT RENDERS WHATEVER IT IS GIVEN, not <img>. The original hardcodes an
 *    image tile - { image, title, href } straight into an <img>. What goes on
 *    this wall is testimonials, which are text. So the item type is a generic
 *    and the caller supplies renderItem; the wall owns the geometry, the drift
 *    and the hover state, and nothing else.
 *
 * 2. HOVER IS PER TILE, not document.elementFromPoint. The original resolves
 *    the hovered tile by calling elementFromPoint on every pointermove. That
 *    forces a synchronous layout on every mouse event, against a wall that is
 *    already writing a transform to every column every frame - the one thing
 *    you do not want to do to an animating 3D subtree. onPointerEnter on the
 *    tile answers the same question for free, and the only reason the original
 *    could not use it is that it puts pointer-events: none on the tile inner.
 *
 * 3. THE TILE COUNT IS CAPPED. copies is derived from container height over
 *    column height, which is unbounded from the component point of view: a
 *    short item list in a tall container asks for a lot of copies, and every
 *    copy is a real element inside a preserve-3d subtree. MAX_COPIES keeps that
 *    honest. See the note in globals.css about what these tiles cost.
 *
 * 4. A TILE IS NOT A CONTROL. The original makes every tile without an href a
 *    focusable div with role="button" - announced as a button, does nothing on
 *    click, and puts one tab stop on screen per copy. Hovering lifts a tile;
 *    that is a hover affordance, not a control. So a tile is a plain div, and
 *    it enters the tab order only if the content the caller puts inside it has
 *    something focusable of its own.
 */

/** See note 3. A hard ceiling on elements inside the preserve-3d subtree. */
const MAX_COPIES = 4;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Per-column speed multiplier. The golden-ratio stride gives every column a
 * different factor without a random number, so the wall looks identical on
 * every load and renders the same on the server as on the client.
 */
const columnFactor = (index: number, variance: number) => {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1;
  return 1 + variance * pseudo;
};

export type DriftWallProps<T> = {
  items: readonly T[];
  /** The tile contents. The wall supplies no markup of its own inside this. */
  renderItem: (item: T, index: number) => ReactNode;
  columns?: number;
  tileWidth?: number;
  tileHeight?: number;
  gap?: number;
  radius?: number;
  /** Perspective pitch of the wall, degrees. */
  tilt?: number;
  /** Perspective yaw of the wall, degrees. */
  turn?: number;
  roll?: number;
  perspective?: number;
  depth?: number;
  /** Base drift speed, px per second. */
  speed?: number;
  direction?: "up" | "down";
  /** How much column speeds differ from each other, 0..1. */
  variance?: number;
  /** Pointer-follow tilt strength; 0 disables it. */
  parallax?: number;
  pauseOnHover?: boolean;
  /** How far a hovered tile lifts toward the viewer, px. */
  lift?: number;
  /** Strength of the edge dissolve, 0..1. */
  fade?: number;
  /** Resting opacity of unhovered tiles, 0..1. */
  dim?: number;
  /**
   * How far the plane is blown up past its own width.
   *
   * The source hardcodes 1.18, which is a bleed: it pushes the outer columns
   * past the edges so the mask has something to dissolve rather than ending on
   * empty space. That is free when a clipped tile is a photograph, and it is
   * not free when a clipped tile is a sentence - on a narrow viewport the bleed
   * is most of the card, and it reads as broken rather than as an edge.
   */
  planeScale?: number;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
};

export default function DriftWall<T>({
  items,
  renderItem,
  columns = 4,
  tileWidth = 300,
  tileHeight = 200,
  gap = 18,
  radius = 14,
  tilt = 16,
  turn = -14,
  roll = 0,
  perspective = 1200,
  depth = 120,
  speed = 42,
  direction = "up",
  variance = 0.45,
  parallax = 0.6,
  pauseOnHover = false,
  lift = 64,
  fade = 0.6,
  dim = 0.55,
  planeScale = 1.18,
  className = "",
  style,
  ariaLabel,
}: DriftWallProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef(0);

  const offsetsRef = useRef<number[]>([]);
  const velocitiesRef = useRef<number[]>([]);
  const hoveredColRef = useRef(-1);
  const wallHoveredRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const pointerDampedRef = useRef({ x: 0, y: 0 });
  const lastTsRef = useRef<number | null>(null);

  const [containerHeight, setContainerHeight] = useState(600);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /** Items dealt round-robin into columns; an empty column borrows the first. */
  const columnItems = useMemo(() => {
    const cols: T[][] = Array.from({ length: columns }, () => []);
    items.forEach((item, i) => cols[i % columns].push(item));
    return cols.map((col) => (col.length ? col : items.slice(0, 1)));
  }, [items, columns]);

  const columnMeta = useMemo(() => {
    const unit = tileHeight + gap;
    return columnItems.map((col) => {
      const copyHeight = Math.max(unit, col.length * unit);
      // Enough copies to cover the container with one in hand, and never more
      // than MAX_COPIES - see note 3 at the top.
      const needed = Math.ceil((containerHeight * 1.6) / copyHeight) + 1;
      return { copyHeight, copies: Math.min(MAX_COPIES, Math.max(2, needed)) };
    });
  }, [columnItems, tileHeight, gap, containerHeight]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height || 600);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseVelocities = useMemo(() => {
    const dirSign = direction === "up" ? 1 : -1;
    return columnItems.map((_, c) => {
      const altSign = c % 2 === 0 ? 1 : -1;
      return speed * columnFactor(c, variance) * dirSign * altSign;
    });
  }, [columnItems, speed, direction, variance]);

  // Staggered start, so the columns are not all aligned on the first frame.
  useEffect(() => {
    offsetsRef.current = columnMeta.map((meta, c) => meta.copyHeight * ((c * 0.37) % 1));
    velocitiesRef.current = columnItems.map(() => 0);
  }, [columnMeta, columnItems]);

  const applyPlaneTransform = useCallback(
    (px: number, py: number) => {
      const plane = planeRef.current;
      if (!plane) return;
      plane.style.transform =
        `translate(-50%, -50%) scale(${planeScale}) ` +
        `rotateX(${tilt + py}deg) rotateY(${turn + px}deg) rotateZ(${roll}deg) ` +
        `translateZ(${-depth}px)`;
    },
    [tilt, turn, roll, depth, planeScale],
  );

  useEffect(() => {
    const animate = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      // Clamped, so a tab returning from the background does not resume with
      // one enormous step and throw every column across the screen.
      const dt = Math.min(0.05, Math.max(0, ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      const maxTilt = parallax * 8;
      const targetX = pointerRef.current.x * maxTilt;
      const targetY = -pointerRef.current.y * maxTilt;
      // Frame-rate independent damping: an exponential approach rather than a
      // fixed fraction per frame, so it settles at the same rate at 60Hz and
      // at 144Hz. The rest of this page is on the same principle.
      const damp = 1 - Math.exp(-dt / 0.12);
      pointerDampedRef.current.x += (targetX - pointerDampedRef.current.x) * damp;
      pointerDampedRef.current.y += (targetY - pointerDampedRef.current.y) * damp;
      applyPlaneTransform(pointerDampedRef.current.x, pointerDampedRef.current.y);

      for (let c = 0; c < trackRefs.current.length; c++) {
        const meta = columnMeta[c];
        const el = trackRefs.current[c];
        if (!meta || !el) continue;

        if (!reduced) {
          const paused = wallHoveredRef.current && pauseOnHover;
          const factor = paused || hoveredColRef.current === c ? 0 : 1;
          const target = baseVelocities[c] * factor;
          const ease = 1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28));
          velocitiesRef.current[c] += (target - velocitiesRef.current[c]) * ease;

          let next = (offsetsRef.current[c] ?? 0) + velocitiesRef.current[c] * dt;
          next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight;
          offsetsRef.current[c] = next;
        }
        el.style.transform = `translate3d(0, ${-(offsetsRef.current[c] ?? 0)}px, 0)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      lastTsRef.current = null;
    };
  }, [baseVelocities, columnMeta, pauseOnHover, parallax, reduced, applyPlaneTransform]);

  const onTileEnter = useCallback((id: string, col: number) => {
    hoveredColRef.current = col;
    setActiveId(id);
  }, []);

  const onTileLeave = useCallback(() => {
    hoveredColRef.current = -1;
    setActiveId(null);
  }, []);

  /**
   * TOUCH. A phone has no hover, so without this the whole active state - the
   * lift, the colour turn, the rim - is desktop-only and a tile on mobile is
   * just a dim rectangle that never resolves.
   *
   * Press and hold activates, exactly like pointing at it. Deliberately NOT a
   * tap toggle: a tap that latches means a second tap somewhere to clear it,
   * and the wall is drifting, so whatever you latched has moved by then. Hold
   * to read, release to let go - the finger is doing the same job the cursor
   * does, and the column stops under it either way.
   *
   * Nothing is prevented here. preventDefault on a press would take the page
   * scroll with it, and the browser fires pointercancel the moment the gesture
   * turns into a scroll - which releases the tile, which is correct.
   */
  const onTilePress = useCallback(
    (id: string, col: number, e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse") return; // already handled by enter
      hoveredColRef.current = col;
      setActiveId(id);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (parallax <= 0 || reduced) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      pointerRef.current = {
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      };
    },
    [parallax, reduced],
  );

  const cssVars = useMemo(
    () =>
      ({
        "--dw-tile-w": `${tileWidth}px`,
        "--dw-tile-h": `${tileHeight}px`,
        "--dw-gap": `${gap}px`,
        "--dw-radius": `${radius}px`,
        "--dw-perspective": `${perspective}px`,
        "--dw-lift": `${lift}px`,
        "--dw-dim": dim,
        /* --dw-edge-BASE, not --dw-edge. An inline custom property outranks a
           class rule, so writing --dw-edge here would make .is-holding unable
           to pull the fade back. The stylesheet derives --dw-edge from this.
           The band is a fraction of the wall at EACH end now, not a single
           gradient stop across the whole of it, so the same 0..1 prop maps to
           a much smaller number than the source used. */
        "--dw-edge-base": `${Math.max(0, Math.min(30, fade * 22)).toFixed(1)}%`,
        ...style,
      }) as CSSProperties,
    [tileWidth, tileHeight, gap, radius, perspective, lift, dim, fade, style],
  );

  return (
    <div
      ref={containerRef}
      className={[
        "drift-wall",
        reduced ? "drift-wall--reduced" : "",
        // Retracts the edge fade while anything is held - see drift-wall.css.
        activeId !== null ? "is-holding" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={cssVars}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => {
        wallHoveredRef.current = true;
      }}
      onPointerLeave={() => {
        wallHoveredRef.current = false;
        pointerRef.current = { x: 0, y: 0 };
        onTileLeave();
      }}
      role="group"
      aria-label={ariaLabel}
    >
      <div ref={planeRef} className="drift-wall__plane">
        {columnItems.map((col, c) => (
          <div className="drift-wall__col" key={`col-${c}`}>
            <div
              className="drift-wall__track"
              ref={(el) => {
                trackRefs.current[c] = el;
              }}
            >
              {Array.from({ length: columnMeta[c].copies }).map((_, copyIndex) =>
                col.map((item, itemIndex) => {
                  const id = `${c}-${copyIndex}-${itemIndex}`;
                  return (
                    <div
                      key={id}
                      className={`drift-wall__tile${activeId === id ? " is-active" : ""}`}
                      onPointerEnter={(e) => {
                        if (e.pointerType === "mouse") onTileEnter(id, c);
                      }}
                      onPointerLeave={onTileLeave}
                      onPointerDown={(e) => onTilePress(id, c, e)}
                      onPointerUp={onTileLeave}
                      onPointerCancel={onTileLeave}
                      /* Only the first copy carries real content. The rest are
                         the same words again to make the loop seamless, so they
                         are hidden rather than read out three more times. */
                      aria-hidden={copyIndex > 0 || undefined}
                    >
                      <div className="drift-wall__inner">{renderItem(item, itemIndex)}</div>
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
