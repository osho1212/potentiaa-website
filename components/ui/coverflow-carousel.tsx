"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export interface CoverflowSlide {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
}

export interface CoverflowCarouselProps {
  slides: CoverflowSlide[];
  /** Degrees the first neighbour tilts. */
  rotate?: number;
  /** How far the first neighbour recedes, as a fraction of card width. */
  depth?: number;
  /** Viewer distance as a multiple of card width — smaller is a wider lens. */
  perspective?: number;
  /** Exponent on distance. Below 1 the rake eases off as cards travel out. */
  falloff?: number;
  /** Opacity lost per step from the centre. */
  fade?: number;
  /** Any CSS length. Everything else is derived from it, so the rake scales. */
  cardWidth?: string;
  /** Space between cards, as a fraction of card width. */
  gap?: number;
  loop?: boolean;
  showCaption?: boolean;
  showPagination?: boolean;
  showNavigation?: boolean;
  /** Names the carousel for assistive tech. */
  label?: string;
  className?: string;
  cardClassName?: string;
  /**
   * Called when the centred card is clicked, or activated with Enter or Space.
   * A click on any other card brings that card to the centre instead.
   */
  onSlideClick?: (index: number) => void;
  /**
   * A pill on the centred card - e.g. an icon and "Click to View" - so it reads
   * as something to open rather than a picture. Only shown with onSlideClick.
   * Its children are laid out in a row with a small gap.
   */
  selectedLabel?: React.ReactNode;
}

export function CoverflowCarousel({
  slides,
  rotate = 44,
  depth = 0.6,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = "clamp(148px, 22vw, 260px)",
  gap = 0.05,
  loop = true,
  showCaption = false,
  showPagination = false,
  showNavigation = false,
  label = "Cover carousel",
  className,
  cardClassName,
  onSlideClick,
  selectedLabel,
}: CoverflowCarouselProps) {
  const count = slides.length;

  const frameRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  /** Fractional card index at the centre. The single source of truth. */
  const posRef = React.useRef(0);
  /** Where the current settle is headed. Stepping off `pos` instead would
      swallow a keypress that lands mid-flight, before the round-off moves. */
  const targetRef = React.useRef(0);
  const widthRef = React.useRef(0);
  const stageWidthRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  const dragRef = React.useRef<{
    id: number;
    x: number;
    pos: number;
    v: number;
    t: number;
    /** The card the pointer went down on, if any - for telling a tap from a drag. */
    index: number | null;
  } | null>(null);

  const [selected, setSelected] = React.useState(0);

  /** Nearest whole card, folded back into 0..count-1. */
  const indexAt = React.useCallback(
    (pos: number) => ((Math.round(pos) % count) + count) % count,
    [count],
  );

  // Paint straight to the DOM. Sixty state updates a second would re-render
  // every card for numbers React never needs to see.
  const paint = React.useCallback(() => {
    const width = widthRef.current;
    if (!width) return;
    const stageWidth = stageWidthRef.current || width * 4;
    const pos = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      // Fold the distance into the shorter way round the ring. This is the
      // whole looping mechanism — no cloned nodes, no shuffling the DOM.
      let offset = index - pos;
      if (loop) {
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
      }

      const distance = Math.abs(offset);
      const dClamped1 = Math.min(distance, 1);
      const dClamped2 = Math.max(0, Math.min(distance - 1, 1));

      // 1. Size hierarchy: Center is biggest (1.02), first neighbours smaller (0.83), outer two smallest (0.69)
      const scale = Math.max(0.65, 1.02 - 0.19 * dClamped1 - 0.14 * dClamped2);

      // 2. Adaptive stage-aware horizontal spacing:
      // Spans the 5 cards across the entire horizontal viewport width on desktop and tablet,
      // while keeping cozy card-relative spacing on mobile so center card stays prominent.
      const isWideStage = stageWidth >= 768;
      const targetX1 = isWideStage
        ? Math.max(width * 0.76, Math.min(width * 1.15, stageWidth * 0.20))
        : width * 0.72;
      const targetX2 = isWideStage
        ? Math.max(width * 1.42, Math.min(width * 2.15, stageWidth * 0.385))
        : width * 1.30;

      const xOffset =
        Math.sign(offset) *
        (targetX1 * dClamped1 +
          (targetX2 - targetX1) * dClamped2 +
          (targetX2 - targetX1) * Math.max(0, distance - 2));

      // 3. 3D Depth recession: Center forward at +24px, distance 1 at -110px, distance 2 at -240px
      const zOffset = 24 - 134 * dClamped1 - 130 * Math.max(0, distance - 1);

      // 4. 3D Rotation (yaw): Center 0deg, distance 1 at 38deg, distance 2 at 52deg
      const tilt = Math.sign(offset) * (38 * dClamped1 + 14 * dClamped2);

      card.style.transform =
        `translateX(calc(-50% + ${xOffset}px)) ` +
        `translateZ(${zOffset}px) ` +
        `rotateY(${-tilt}deg) ` +
        `scale(${scale})`;

      // 5. 3D Lighting & Shadows: Center card is fully illuminated and glowing; side cards dim realistically
      const brightness = Math.max(0.62, 1 - 0.16 * dClamped1 - 0.18 * dClamped2);
      card.style.filter = `brightness(${brightness})`;

      if (distance < 0.5) {
        card.style.boxShadow =
          "0 24px 60px -10px rgba(0, 0, 0, 0.9), 0 0 40px rgba(38, 93, 255, 0.3), inset 0 1px 1.5px rgba(255, 255, 255, 0.35)";
      } else {
        card.style.boxShadow =
          "0 16px 36px -6px rgba(0, 0, 0, 0.8), 0 0 15px rgba(0, 0, 0, 0.5)";
      }

      // 6. Smooth ring edge wrap
      const edge = loop ? Math.min(1, Math.max(0, (count / 2 - distance) * 2.5)) : 1;
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance * 10));
    });
  }, [count, fade, loop]);

  const settle = React.useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      setSelected(indexAt(target));

      const step = () => {
        const remaining = target - posRef.current;
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        // ponytail: exponential ease-out, not a spring. Swap in a spring only
        // if the settle needs overshoot.
        posRef.current += remaining * 0.16;
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [indexAt, paint],
  );

  const clamp = React.useCallback(
    (pos: number) => (loop ? pos : Math.max(0, Math.min(count - 1, pos))),
    [count, loop],
  );

  const goTo = React.useCallback(
    (index: number) => {
      // Take the shorter way round rather than unwinding the whole ring.
      const target = loop
        ? index + Math.round((targetRef.current - index) / count) * count
        : index;
      settle(clamp(target));
    },
    [clamp, count, loop, settle],
  );

  const nudge = React.useCallback(
    (by: number) => settle(clamp(Math.round(targetRef.current) + by)),
    [clamp, settle],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    targetRef.current = posRef.current;
    // Read from the event target, not the frame: pointer capture sends the
    // pointerup to the frame whatever card it started on.
    const hit = (event.target as HTMLElement).closest<HTMLElement>("[data-cf-index]");
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      pos: posRef.current,
      v: 0,
      t: performance.now(),
      index: hit ? Number(hit.dataset.cfIndex) : null,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    const pitch = widthRef.current * (1 + gap);
    if (!pitch) return;

    const now = performance.now();
    const previous = posRef.current;
    posRef.current = clamp(drag.pos - (event.clientX - drag.x) / pitch);
    // Cards per second, for the throw.
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;

    const index = indexAt(posRef.current);
    if (index !== selected) setSelected(index);
    paint();
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;

    // A TAP, NOT A DRAG: the pointer barely moved. On the centred card that is
    // a request for the slide itself; on any other card it brings that card to
    // the centre, which is what reaching for a side card means.
    if (
      event.type === "pointerup" &&
      drag.index !== null &&
      Math.abs(event.clientX - drag.x) < 6
    ) {
      if (drag.index === indexAt(drag.pos)) {
        settle(clamp(Math.round(drag.pos)));
        onSlideClick?.(drag.index);
      } else {
        goTo(drag.index);
      }
      return;
    }

    // Let a flick carry, but never more than two cards.
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18));
    settle(clamp(Math.round(posRef.current + carried)));
  };

  // Card width drives pitch, depth and perspective, so it is the only thing
  // worth measuring — and only when the box actually changes.
  useIsoLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const card = cardRefs.current[0];
      if (!card) return;
      widthRef.current = card.offsetWidth;
      stageWidthRef.current = frame.offsetWidth;
      paint();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [paint]);

  React.useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <div
      className={cn("w-full", className)}
      style={{ ["--cf-card" as string]: cardWidth }}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div className="relative">
        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              nudge(-1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              nudge(1);
            } else if (onSlideClick && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              onSlideClick(selected);
            }
          }}
          // Vertical padding keeps the drop shadows clear of the overflow clip.
          // A variable so a caller can trim it where the room is tight.
          className="cursor-grab overflow-hidden py-[var(--cf-pad-y,2.5rem)] outline-none ring-ring focus-visible:ring-2 active:cursor-grabbing"
          style={{
            perspective: `calc(var(--cf-card) * ${perspective})`,
            // Horizontal drag is ours; the page keeps vertical scrolling.
            touchAction: "pan-y",
          }}
        >
          <div
            className="relative select-none"
            style={{
              height: "var(--cf-card)",
              transformStyle: "preserve-3d",
            }}
          >
            {slides.map((slide, index) => (
              <div
                key={index}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                data-cf-index={index}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                className={cn(
                  "absolute left-1/2 top-0 aspect-square overflow-hidden rounded-2xl bg-muted shadow-xl will-change-transform",
                  onSlideClick && index === selected && "cursor-pointer",
                  cardClassName,
                )}
                style={{ width: "var(--cf-card)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.src}
                  alt={slide.alt}
                  draggable={false}
                  className="h-full w-full select-none object-cover"
                />
                {selectedLabel && onSlideClick && index === selected && (
                  // Mounts as a card arrives in the centre, so it fades in
                  // there. pointer-events-none: the tap belongs to the card.
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center duration-300 animate-in fade-in"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-[12px] font-semibold leading-none text-white shadow-lg ring-1 ring-white/25 backdrop-blur-md">
                      {selectedLabel}
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {showNavigation && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => nudge(-1)}
              className="absolute left-3 sm:left-6 lg:left-8 top-1/2 z-[200] -translate-y-1/2 flex items-center justify-center rounded-full bg-black/65 border border-white/15 p-2.5 sm:p-3 text-white backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-black/90 hover:border-white/30 hover:shadow-[0_0_24px_rgba(99,102,241,0.4)] active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="size-5 sm:size-6" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => nudge(1)}
              className="absolute right-3 sm:right-6 lg:right-8 top-1/2 z-[200] -translate-y-1/2 flex items-center justify-center rounded-full bg-black/65 border border-white/15 p-2.5 sm:p-3 text-white backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-black/90 hover:border-white/30 hover:shadow-[0_0_24px_rgba(99,102,241,0.4)] active:scale-95 cursor-pointer"
            >
              <ChevronRight className="size-5 sm:size-6" />
            </button>
          </>
        )}
      </div>

      {/* The dots sit straight under the cards they count, above the caption.
          Both gaps are variables so a page can tune them per viewport. */}
      {showPagination && (
        <div className="mt-[var(--cf-dots-gap,0px)] flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === selected}
              onClick={() => goTo(index)}
              className={cn(
                "size-2 rounded-full bg-foreground transition-opacity",
                index === selected ? "opacity-100" : "opacity-30",
              )}
            />
          ))}
        </div>
      )}

      {showCaption && (
        // EVERY caption is laid out, stacked in one grid cell, and only the
        // selected one is visible. The cell is therefore as tall as the
        // longest caption at the current width, so everything below stays put
        // when a two-line description gives way to a three-line one.
        <div className="mt-[var(--cf-caption-gap,1rem)] grid">
          {slides.map((slide, index) =>
            slide.title ? (
              <div
                key={index}
                aria-hidden={index !== selected}
                className={cn(
                  "col-start-1 row-start-1 flex flex-col items-center px-6 text-center",
                  index === selected ? "visible duration-300 animate-in fade-in" : "invisible",
                )}
              >
                {/* Caption sizes are variables so the page can size them to
                    the viewport; the fallbacks are the component's own. */}
                <p className="text-[length:var(--cf-caption-title,15px)] font-semibold tracking-tight text-foreground">
                  {slide.title}
                </p>
                {slide.subtitle && (
                  // Balanced as well as centred, so a two-line description
                  // splits into even lines rather than a full line over a stub.
                  <p className="mt-1 text-balance text-[length:var(--cf-caption-text,13px)] text-muted-foreground">
                    {slide.subtitle}
                  </p>
                )}
                {slide.meta && slide.meta.length > 0 && (
                  <dl className="mt-10 w-full max-w-[230px] text-[12px]">
                    {slide.meta.map((row) => (
                      <div key={row.label} className="flex justify-between py-[5px]">
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd className="font-medium text-foreground">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
