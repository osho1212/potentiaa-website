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
function QuoteCard({ item, interactive }: { item: Item; interactive: boolean }) {
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
          <span className="quote__mark" aria-hidden="true">
            —
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
 * wall is flat: tilt and turn are 0 and the plane sits at depth 0. What is kept
 * from the 3D is the part that earns its place - the hover lift, which is a
 * real translateZ toward the reader through the container's perspective, so a
 * held card genuinely comes forward rather than just scaling.
 */
export default function Testimonials() {
  const items = site.testimonials.items as readonly Item[];

  /* Narrow viewports get ONE column, and the plane stops being blown up.
     Not a breakpoint for its own sake - it is arithmetic. The plane is
     columns x (tile + gap) wide before planeScale, so four 320px columns is
     1352px. On a 375px phone that put 656px of plane behind a 375px window and
     every card lost a third of its width off BOTH edges, mid-word. Clipping a
     photograph is an edge treatment; clipping a sentence is a bug. */
  const narrow = useMediaQuery("(max-width: 900px)");
  const isNarrow = narrow === true;

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
      <div className="testimonials__wall">
        <DriftWall
          items={items}
          renderItem={(item) => <QuoteCard item={item} interactive={interactive} />}
          columns={isNarrow ? 2 : 4}
          tileWidth={isNarrow ? 220 : 320}
          tileHeight={isNarrow ? 180 : 210}
          gap={isNarrow ? 12 : 18}
          planeScale={isNarrow ? 1 : 1.04}
          tilt={0}
          turn={0}
          perspective={1400}
          depth={0}
          speed={30}
          direction="up"
          variance={0.4}
          parallax={0}
          lift={isNarrow ? 30 : 70}
          fade={0.62}
          /* The resting dim is expressed as OPACITY, so the dark overlay it
             leaves is 1 - dim. 0.9 is a 10% overlay - just enough to sit the
             unheld tiles back off the held one, and no longer doing any of the
             dimming work it was originally there for. */
          dim={0.9}
          ariaLabel="What business owners say about working with Potentiaa"
        />
      </div>
    </section>
  );
}
