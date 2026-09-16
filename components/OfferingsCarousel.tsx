"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useContact } from "./ContactContext";

export interface OfferingModule {
  id: string;
  title: string;
  bottleneck: string;
  capabilities: readonly string[];
  whoUsesIt: string;
  howItConnects: string;
}

/**
 * How long a card holds before the carousel moves on. The progress fill on the
 * active dot runs for exactly this long and its animationend IS the timer, so
 * the bar and the slide can never drift apart - and pausing the animation
 * pauses the clock with it.
 */
const AUTOPLAY_MS = 5000;
/** Settle time constant in ms: a slide is ~95% of the way there after 3x this. */
const SETTLE_TAU = 90;
/** How long the details take to close. The equal-height layout holds until then. */
const COLLAPSE_MS = 280;
/** Pointer travel before a press counts as a drag rather than a tap. */
const DRAG_SLOP = 6;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The offerings, one card per module, in a looping carousel inside the
 * particle-formed showcase card (see sections/Work).
 *
 * THE CARDS STACK IN ONE GRID CELL and are placed by transform, like the
 * coverflow in Our Work: no cloned slides, the loop is just each card's offset
 * folded the short way round. Stacked, the row is as tall as the tallest card
 * and every card stretches to it, so the cards are equal heights at any width
 * with nothing measured. While a card is open the others stop stretching and
 * hold that collapsed height instead (--offer-card-h), so opening one card
 * never stretches its neighbours.
 *
 * The three blocks carry data-form-step: the particle formation reveals them in
 * order as the section scrolls in. They are stable elements for that reason -
 * CardFormationParticles collects them once.
 */
export default function OfferingsCarousel({
  modules,
  intro,
  hint,
}: {
  modules: readonly OfferingModule[];
  intro: string;
  hint: string;
}) {
  const count = modules.length;
  const { open: openContact } = useContact();
  const uid = useId().replace(/:/g, "");
  const detailsId = (i: number) => `offer-details-${uid}-${i}`;

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  /** Fractional card index at the centre - the single source of truth for placement. */
  const posRef = useRef(0);
  /** Where the current settle is headed; unbounded, so the loop keeps direction. */
  const targetRef = useRef(0);
  /** One card width plus the gap, in px. */
  const pitchRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(0);
  const reducedRef = useRef(false);
  const layoutOpenRef = useRef(false);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    pos: number;
    v: number;
    t: number;
    dragging: boolean;
  } | null>(null);

  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  /** True from opening until the close animation has finished. */
  const [layoutOpen, setLayoutOpen] = useState(false);
  /** Bumped to restart the autoplay clock from zero. */
  const [cycle, setCycle] = useState(0);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);

  const autoplay = !reducedMotion;
  const paused =
    userPaused || expanded || hovered || keyboardFocus || dragging || !inView || pageHidden;

  const indexOf = useCallback(
    (pos: number) => ((Math.round(pos) % count) + count) % count,
    [count],
  );

  // Written straight to the DOM: sixty state updates a second would re-render
  // every card for numbers React never needs.
  const paint = useCallback(() => {
    const pitch = pitchRef.current;
    if (!pitch) return;
    const pos = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      let offset = (((index - pos) % count) + count) % count;
      if (offset > count / 2) offset -= count;

      const distance = Math.abs(offset);
      const near = Math.min(distance, 1);
      // Gone by two cards out, so the wrap across the ring (at half a turn)
      // always happens out of sight, at any viewport width.
      const far = Math.min(Math.max(distance - 1, 0), 1);

      card.style.transform = `translate3d(${(offset * pitch).toFixed(2)}px, 0, 0) scale(${(1 - 0.05 * near).toFixed(4)})`;
      card.style.opacity = ((1 - 0.5 * near) * (1 - far)).toFixed(3);
      card.style.visibility = distance >= 2 ? "hidden" : "";
      card.style.zIndex = String(count - Math.round(distance));
    });
  }, [count]);

  const settle = useCallback(
    (target: number) => {
      targetRef.current = target;
      const next = indexOf(target);
      if (next !== activeRef.current) {
        activeRef.current = next;
        setActive(next);
        setExpanded(false);
      }

      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      if (reducedRef.current) {
        posRef.current = target;
        paint();
        return;
      }

      let last = performance.now();
      const step = (now: number) => {
        const dt = Math.min(64, Math.max(0, now - last));
        last = now;
        const remaining = target - posRef.current;
        if (Math.abs(remaining) < 0.0005) {
          posRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        // Time-based ease-out, so it settles at the same speed at 60Hz and 120Hz.
        posRef.current += remaining * (1 - Math.exp(-dt / SETTLE_TAU));
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [indexOf, paint],
  );

  /** To a card, the short way round the loop. */
  const goTo = useCallback(
    (index: number) => {
      const base = targetRef.current;
      settle(index + Math.round((base - index) / count) * count);
    },
    [count, settle],
  );

  const stepBy = useCallback(
    (by: number) => settle(Math.round(targetRef.current) + by),
    [settle],
  );

  // Card width is the only measurement placement needs, and the collapsed row
  // height is the only one the open layout needs.
  useIsoLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const measure = () => {
      const card = cardRefs.current[0];
      if (card) {
        const gap = parseFloat(getComputedStyle(track).getPropertyValue("--offer-gap")) || 0;
        pitchRef.current = card.offsetWidth + gap;
        paint();
      }
      if (!layoutOpenRef.current) {
        track.style.setProperty("--offer-card-h", `${track.offsetHeight}px`);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(track);
    return () => observer.disconnect();
  }, [paint]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedRef.current = query.matches;
      setReducedMotion(query.matches);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Only advance while the reader can actually see it.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.5,
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setPageHidden(document.visibilityState === "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // Keep the open layout until the details have finished closing, so the
  // neighbours don't snap to the tall row and shrink back down with it.
  useEffect(() => {
    if (expanded || !layoutOpen) return;
    const timer = window.setTimeout(
      () => {
        layoutOpenRef.current = false;
        setLayoutOpen(false);
      },
      reducedMotion ? 0 : COLLAPSE_MS + 40,
    );
    return () => window.clearTimeout(timer);
  }, [expanded, layoutOpen, reducedMotion]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const toggleDetails = () => {
    if (expanded) {
      setExpanded(false);
      // The reader has finished with this card: give the next one a full turn.
      setCycle((c) => c + 1);
      return;
    }
    layoutOpenRef.current = true;
    setLayoutOpen(true);
    setExpanded(true);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pos: posRef.current,
      v: 0,
      t: performance.now(),
      dragging: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    if (!drag.dragging) {
      const dx = event.clientX - drag.x;
      if (Math.abs(dx) < DRAG_SLOP) return;
      // Mostly vertical: the reader is scrolling the page, not the carousel.
      if (Math.abs(event.clientY - drag.y) > Math.abs(dx)) {
        dragRef.current = null;
        return;
      }
      // Captured only now, once it is a drag: capturing on press would retarget
      // the click away from the buttons inside the card.
      event.currentTarget.setPointerCapture(event.pointerId);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.getSelection()?.removeAllRanges();
      drag.dragging = true;
      drag.x = event.clientX;
      drag.pos = posRef.current;
      drag.t = performance.now();
      setDragging(true);
      return;
    }

    const pitch = pitchRef.current;
    if (!pitch) return;
    const now = performance.now();
    const previous = posRef.current;
    posRef.current = drag.pos - (event.clientX - drag.x) / pitch;
    // Cards per second, for the throw.
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;
    paint();
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;

    if (!drag.dragging) {
      // A tap. The side cards are inert, so a tap on one lands here rather than
      // on the card: bring it to the centre, which is what reaching for it means.
      const viewport = viewportRef.current;
      const pitch = pitchRef.current;
      if (event.type !== "pointerup" || !viewport || !pitch) return;
      const box = viewport.getBoundingClientRect();
      const by = Math.round((event.clientX - (box.left + box.width / 2)) / pitch);
      if (by !== 0) stepBy(Math.max(-1, Math.min(1, by)));
      return;
    }

    setDragging(false);
    // A flick carries on to the next card - but only to the next one: however
    // hard the throw, it can't land further than the drag itself reached,
    // rounded up to a whole card.
    const carried = Math.max(-1, Math.min(1, drag.v * 0.12));
    const from = Math.round(drag.pos);
    const reach = Math.max(1, Math.round(Math.abs(posRef.current - drag.pos)));
    const target = Math.round(posRef.current + carried);
    settle(Math.max(from - reach, Math.min(from + reach, target)));
    setCycle((c) => c + 1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepBy(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      stepBy(1);
    }
  };

  const onFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    // Keyboard focus pauses; a mouse click that leaves focus on a button doesn't.
    try {
      if ((event.target as HTMLElement).matches(":focus-visible")) setKeyboardFocus(true);
    } catch {
      /* No :focus-visible support - never pause on focus rather than always. */
    }
  };

  const onBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboardFocus(false);
  };

  return (
    <div
      className="offer-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Our offerings"
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setHovered(false)}
    >
      <div className="offer-intro" data-form-step={0}>
        <p className="offer-intro__title">{intro}</p>
        <p className="offer-intro__hint">{hint}</p>
      </div>

      <div
        ref={viewportRef}
        className="offer-viewport"
        data-form-step={1}
        data-dragging={dragging || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragStart={(event) => event.preventDefault()}
      >
        <div
          ref={trackRef}
          className="offer-track"
          data-open={layoutOpen || undefined}
          aria-live={autoplay && !paused ? "off" : "polite"}
        >
          {modules.map((module, index) => {
            const isActive = index === active;
            const open = isActive && expanded;
            return (
              <article
                key={module.id}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                className="offer-card"
                data-active={isActive || undefined}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}: ${module.title}`}
                inert={!isActive}
              >
                <div className="offer-card__top">
                  <span className="offer-card__icon" aria-hidden="true">
                    <ModuleIcon id={module.id} />
                  </span>
                  <span className="offer-card__index" aria-hidden="true">
                    {pad(index + 1)} / {pad(count)}
                  </span>
                </div>

                <h3 className="offer-card__title">{module.title}</h3>

                <p className="offer-card__label offer-card__label--problem">The problem it solves</p>
                <p className="offer-card__text">{module.bottleneck}</p>

                <p className="offer-card__for">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>
                    <span className="offer-card__for-label">Built for </span>
                    {module.whoUsesIt}
                  </span>
                </p>

                <button
                  type="button"
                  className="offer-toggle"
                  aria-expanded={open}
                  aria-controls={detailsId(index)}
                  onClick={toggleDetails}
                >
                  <span>{open ? "Show less" : "What's included"}</span>
                  <span className="offer-toggle__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>

                <div className="offer-more" id={detailsId(index)} data-open={open || undefined}>
                  <div className="offer-more__inner" inert={!open}>
                    <div className="offer-more__content">
                      <p className="offer-card__label">Key capabilities</p>
                      <ul className="offer-list">
                        {module.capabilities.map((capability) => (
                          <li key={capability} className="offer-list__item">
                            <span className="offer-list__check" aria-hidden="true">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </span>
                            <span>{capability}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="offer-connect">
                        <p className="offer-card__label">How it connects</p>
                        <p className="offer-connect__text">{module.howItConnects}</p>
                      </div>

                      <button
                        type="button"
                        className="offer-cta"
                        onClick={openContact}
                        aria-label={`Discuss the ${module.title} module`}
                      >
                        Discuss this module
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="offer-controls" data-form-step={2}>
        <button type="button" className="offer-arrow" aria-label="Previous module" onClick={() => stepBy(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="offer-dots" role="group" aria-label="Choose a module">
          {modules.map((module, index) => {
            const isActive = index === active;
            return (
              <button
                key={module.id}
                type="button"
                className="offer-dot"
                aria-label={`Show ${module.title}`}
                aria-current={isActive ? "true" : undefined}
                onClick={() => {
                  goTo(index);
                  setCycle((c) => c + 1);
                }}
              >
                <span className="offer-dot__track">
                  {isActive && (
                    <span
                      key={`${active}-${cycle}`}
                      className={`offer-dot__fill${autoplay ? "" : " offer-dot__fill--static"}`}
                      style={
                        autoplay
                          ? {
                              animationDuration: `${AUTOPLAY_MS}ms`,
                              animationPlayState: paused ? "paused" : "running",
                            }
                          : undefined
                      }
                      onAnimationEnd={() => stepBy(1)}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <button type="button" className="offer-arrow" aria-label="Next module" onClick={() => stepBy(1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {autoplay && (
          <button
            type="button"
            className="offer-pause"
            aria-label={userPaused ? "Resume auto-advance" : "Pause auto-advance"}
            aria-pressed={userPaused}
            onClick={() => setUserPaused((p) => !p)}
          >
            {userPaused ? (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 4.5v15l13-7.5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4.5" width="4" height="15" rx="1" />
                <rect x="14" y="4.5" width="4" height="15" rx="1" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function ModuleIcon({ id }: { id: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (id) {
    case "billing":
      return (
        <svg {...common}>
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M16 8H8M16 12H8M13 16H8" />
        </svg>
      );
    case "inventory":
      return (
        <svg {...common}>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
        </svg>
      );
    case "workflows":
      return (
        <svg {...common}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "dashboards":
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="M8 17v-5M13 17V8M18 17v-9" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
  }
}
