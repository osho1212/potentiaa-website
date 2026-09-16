"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { gsap } from "gsap";
import Reveal from "../Reveal";
import DriftWall from "../DriftWall";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { site } from "@/lib/site";

/** Indigo, the same rim colour the offering cards glow - see Work.tsx. */
const GLOW_RGB = "79, 70, 229";

type Item = {
  quote: string;
  name: string;
  role: string;
  avatar?: string;
  /** No real quote in this slot yet - styles itself as a placeholder. */
  pending?: boolean;
};

/** The initials badge takes one of the three brand colours. */
const MARK_TONES = ["midnight", "blue", "coral"] as const;
type MarkTone = (typeof MARK_TONES)[number];

/**
 * Which colour a card's badge gets, so no two cards stacked in a column match.
 *
 * Cycling in plain list order does not survive the round-robin deal: at three
 * columns, items 0, 3 and 6 share a column AND a colour. So the cycle runs down
 * each column instead, offset by the column so neighbouring columns start on
 * different colours. Columns loop, which puts the last card beside the first;
 * when the column's length would give those two the same colour, the last one
 * takes the third colour instead.
 */
function toneFor(index: number, columns: number, count: number): MarkTone {
  const n = MARK_TONES.length;
  const column = index % columns;
  const length = Math.ceil((count - column) / columns);
  const position = Math.floor(index / columns);
  let slot = (position + column) % n;
  if (length > 1 && position === length - 1 && length % n === 1) slot = (slot + 1) % n;
  return MARK_TONES[slot];
}

/** Words that say what kind of entity a name is rather than which one. */
const NOT_A_NAME = new Set(["dr", "mr", "mrs", "ms", "co", "pvt", "ltd", "llp", "inc"]);

/** "Madhav Dairy" -> "MD", "F-Quad" -> "FQ", "Dr. Rahul" -> "R". */
function initialsOf(name: string) {
  return name
    .split(/[\s-]+/)
    .filter((word) => word && !NOT_A_NAME.has(word.replace(/\./g, "").toLowerCase()))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

/**
 * One quote.
 *
 * The interaction is lifted wholesale from the offering cards in Work.tsx -
 * same tilt angles, same magnetism coefficient, same cursor-tracked rim - so
 * the two sections answer the pointer identically. What is NOT shared is the
 * markup, for the same reason Work does not reuse MagicBento's: a different
 * card shape does not need the same skeleton to feel the same.
 *
 * TRANSFORM HAS ONE OWNER, AND IT IS GSAP. The tilt animates transform, so the
 * card's CSS transition must not also list it - that is the same collision
 * Work.tsx documents between Reveal and GSAP, and the loser is whichever one
 * did not write last. The wall's own lift is applied to the tile's INNER, a
 * different element, so the two never touch.
 *
 * POINTER EVENTS, NOT MOUSE EVENTS. The rim glow has to light under a finger as
 * well as a cursor, and mousemove does not fire for touch.
 */
function QuoteCard({
  item,
  interactive,
  tone,
}: {
  item: Item;
  interactive: boolean;
  tone: MarkTone;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !interactive) return;

    const onEnter = () => {
      gsap.to(el, { rotateX: 4, rotateY: 4, duration: 0.3, ease: "power2.out", transformPerspective: 1000 });
    };

    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      gsap.to(el, {
        rotateX: ((y - cy) / cy) * -6,
        rotateY: ((x - cx) / cx) * 6,
        // Magnetism: the card leans toward the pointer rather than away.
        x: (x - cx) * 0.035,
        y: (y - cy) * 0.035,
        duration: 0.25,
        ease: "power2.out",
        transformPerspective: 1000,
      });
    };

    const onLeave = () => {
      gsap.to(el, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.35, ease: "power2.out" });
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      gsap.killTweensOf(el);
    };
  }, [interactive]);

  const lightRim = (event: PointerEvent<HTMLElement>) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--glow-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    card.style.setProperty("--glow-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
    card.style.setProperty("--glow-intensity", "1");
  };

  const clearRim = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--glow-intensity", "0");
  };

  return (
    <figure
      ref={ref}
      className={`quote ${item.pending ? "quote--pending" : ""}`.trim()}
      style={{ "--glow-color": GLOW_RGB } as CSSProperties}
      onPointerMove={lightRim}
      onPointerDown={lightRim}
      onPointerUp={clearRim}
      onPointerLeave={clearRim}
      onPointerCancel={clearRim}
    >
      <blockquote className="quote__body">{item.quote}</blockquote>
      <figcaption className="quote__by">
        {item.avatar && !item.pending ? (
          // Decorative: the name is right beside it in text, so alt="" keeps a
          // screen reader from reading the person twice.
          <img className="quote__avatar" src={item.avatar} alt="" width={44} height={44} loading="lazy" />
        ) : (
          <span className="quote__mark" data-tone={tone} aria-hidden="true">
            {item.pending ? "—" : initialsOf(item.name)}
          </span>
        )}
        <span className="quote__who">
          <span className="quote__name">{item.name}</span>
          <span className="quote__role">{item.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * Testimonials, as a drifting wall of quote cards.
 *
 * WHAT THE WALL IS FOR HERE. These are supporting evidence beside the CTA, not
 * the argument itself, and the wall says exactly that: a field of quotes moving
 * past, of which you read the one you point at. Nothing on it ever holds still
 * long enough to become homework.
 *
 * THE CARDS FACE THE READER. React Bits ships this pitched and yawed - tilt 16,
 * turn -14 - which is tuned for photographs, where the skew IS the effect and
 * nothing has to be read. These tiles carry four lines of body copy, so the
 * wall is flat: tilt and turn are 0 and the plane sits at depth 0, and a held
 * card grows a little in place rather than lifting toward the reader - see the
 * hold note in styles/drift-wall.css.
 */
export default function Testimonials() {
  const items = site.testimonials.items as readonly Item[];

  /* THE PLANE MUST FIT THE SCREEN. It is columns x (tile + gap) wide, times
     planeScale, and anything past the viewport is a quote cut off mid-word -
     clipping a photograph is an edge treatment, clipping a sentence is a bug.
     Fixed widths broke it at every size in turn: two 220px columns on phones,
     and four 320px columns (1406px) on anything under ~1400px wide. So the
     column COUNT steps with the viewport here, and the tile WIDTH is derived
     from the viewport in CSS (.testimonials .drift-wall in globals.css). */
  const narrow = useMediaQuery("(max-width: 900px)");
  const isNarrow = narrow === true;
  const phone = useMediaQuery("(max-width: 639px)");
  const isPhone = phone === true;
  const midWidth = useMediaQuery("(max-width: 1199px)");
  const columns = isPhone ? 1 : isNarrow ? 2 : midWidth === true ? 3 : 4;

  /* TILES AS TALL AS THE LONGEST QUOTE, AND NO TALLER. The drift maths needs one
     tile height, but what the quotes need depends on how wide the tiles came
     out, which CSS decides. So it is measured: the tallest card's content plus
     its padding, re-read whenever the wall resizes and once the web font lands.
     A fixed height either clipped the longest quote or left the short ones a
     gap between the words and the name. */
  const wallRef = useRef<HTMLDivElement>(null);
  const [fitHeight, setFitHeight] = useState<number | null>(null);
  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    let frame = 0;
    let disposed = false;

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed) return;
        let tallest = 0;
        wall.querySelectorAll<HTMLElement>(".quote").forEach((quote) => {
          const body = quote.querySelector<HTMLElement>(".quote__body");
          const by = quote.querySelector<HTMLElement>(".quote__by");
          if (!body || !by) return;
          const cs = getComputedStyle(quote);
          const chrome =
            parseFloat(cs.paddingTop) +
            parseFloat(cs.paddingBottom) +
            parseFloat(cs.borderTopWidth) +
            parseFloat(cs.borderBottomWidth) +
            (parseFloat(cs.rowGap) || 0);
          // offsetHeight, not the rect: layout size, unaffected by planeScale
          // or a held card's scale.
          tallest = Math.max(tallest, body.offsetHeight + by.offsetHeight + chrome);
        });
        if (tallest > 0) {
          const next = Math.ceil(tallest) + 2;
          setFitHeight((prev) => (prev === next ? prev : next));
        }
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wall);
    // And every time the wall comes on screen, so a measurement that missed
    // (a hidden tab, a font swap, a remount) is corrected before anyone sees it.
    const visible = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) measure();
    });
    visible.observe(wall);
    document.fonts?.ready.then(measure);
    return () => {
      disposed = true;
      observer.disconnect();
      visible.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [columns]);

  /* Pointer-driven tilt is meaningless without a pointer and unwelcome when
     motion is reduced - the same gate Work.tsx puts on the same effect, and
     checked once here rather than once per card. */
  const [interactive, setInteractive] = useState(false);
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 901px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setInteractive(fine.matches && !reduced.matches);
    sync();
    fine.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      fine.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  return (
    <section className="section testimonials" id="testimonials" data-theme-key="testimonials">
      <div className="container testimonials__head">
        <Reveal>
          <p className="eyebrow">{site.testimonials.eyebrow}</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="section-title">{site.testimonials.title}</h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="lede" style={{ marginTop: "var(--space-4)" }}>
            {site.testimonials.lede}
          </p>
        </Reveal>
      </div>

      {/* Takes whatever height the head leaves - see .testimonials in
          globals.css, where the section is pinned to exactly one viewport. */}
      <div className="testimonials__wall" ref={wallRef}>
        <DriftWall
          items={items}
          renderItem={(item) => (
            <QuoteCard
              item={item}
              interactive={interactive}
              /* The wall's own index restarts in every column; the tone needs
                 the position in the whole list. */
              tone={toneFor(items.indexOf(item), columns, items.length)}
            />
          )}
          columns={columns}
          /* Overridden by the viewport-derived width in globals.css; this is
             only the width before that stylesheet applies. */
          tileWidth={isNarrow ? 220 : 320}
          /* Measured above; these are the first-paint estimates. */
          tileHeight={fitHeight ?? (isNarrow ? 180 : 240)}
          gap={isNarrow ? 12 : 18}
          /* Keep in step with the 1.04 in the wide tile-width rules in
             globals.css - they divide it back out so the scaled plane fits. */
          planeScale={isNarrow ? 1 : 1.04}
          tilt={0}
          turn={0}
          perspective={1400}
          depth={0}
          speed={30}
          direction="up"
          variance={0.4}
          parallax={0}
          holdScale={1.04}
          fade={0.62}
          /* No resting dim: the dim is OPACITY, and the cards are solid white -
             anything under 1 lets the dark page show through them. */
          dim={1}
          ariaLabel="What business owners say about working with Potentiaa"
        />
      </div>
    </section>
  );
}
