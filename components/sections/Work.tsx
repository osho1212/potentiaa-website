"use client";

import { useEffect, useId, useRef, useState } from "react";
import { gsap } from "gsap";
import Reveal from "../Reveal";
import LogoMark from "../LogoMark";
import WorkIcon, { type WorkIconName } from "../WorkIcons";
import { site } from "@/lib/site";

/**
 * Our Offerings - "What We Build" / "Who We Help".
 *
 * ZEAL IS NOT IN THIS SECTION. His `payload` prop maps one prop-object per card
 * positionally, which cannot hold when the whole grid swaps on a tab press. He
 * keeps Process, where the list does not move.
 *
 * THE TABS ARE REAL TABS: arrow keys move between them and only the selected
 * one is a tab stop (roving tabindex), per the WAI-ARIA tabs pattern.
 */

const MOBILE_BREAKPOINT = 768;
/** Matches MagicBento's card glow so the two sections read as one system. */
const GLOW_RGB = "79, 70, 229";
/** Same radius MagicBento passes as spotlightRadius in Intro. */
const GLOW_RADIUS = 280;

/**
 * The stroked glow, lit by how near the cursor is - section 3's mechanic.
 *
 * WHY THIS IS NOT PER-CARD. A card that only lights while the pointer is over
 * it barely reads as a glow at all: the cursor is already on the card, so the
 * rim arrives too late to be the thing that drew the eye there. Section 3 lights
 * every card in the grid by distance, so the rims come up ahead of the pointer
 * and fall away behind it, and the whole grid feels lit rather than hovered.
 * This is MagicBento's GlobalSpotlight maths - proximity at half the radius,
 * fading out by three quarters - applied to this grid's own cards.
 *
 * The listener is on `document`, not the grid: the glow has to start before the
 * pointer reaches the first card, which is exactly where a grid-bound listener
 * would not have fired yet.
 */
function useProximityGlow(
  gridRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !enabled) return;

    const proximity = GLOW_RADIUS * 0.5;
    const fadeDistance = GLOW_RADIUS * 0.75;

    const cards = () => grid.querySelectorAll<HTMLElement>(".work-card");

    const clear = () => {
      cards().forEach((card) => card.style.setProperty("--glow-intensity", "0"));
    };

    const onMove = (event: MouseEvent) => {
      const box = grid.getBoundingClientRect();
      const near =
        event.clientX >= box.left - 50 &&
        event.clientX <= box.right + 50 &&
        event.clientY >= box.top - 50 &&
        event.clientY <= box.bottom + 50;

      if (!near) return clear();

      cards().forEach((card) => {
        const rect = card.getBoundingClientRect();
        const distance = Math.max(
          0,
          Math.hypot(
            event.clientX - (rect.left + rect.width / 2),
            event.clientY - (rect.top + rect.height / 2),
          ) - Math.max(rect.width, rect.height) / 2,
        );

        let intensity = 0;
        if (distance <= proximity) intensity = 1;
        else if (distance <= fadeDistance)
          intensity = (fadeDistance - distance) / (fadeDistance - proximity);

        // Anchored to the pointer's real position on the card, so the bright
        // part of the rim is the edge nearest the cursor.
        card.style.setProperty("--glow-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        card.style.setProperty("--glow-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
        card.style.setProperty("--glow-intensity", intensity.toString());
        card.style.setProperty("--glow-radius", `${GLOW_RADIUS}px`);
      });
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", clear);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", clear);
    };
  }, [gridRef, enabled]);
}

/**
 * One card, carrying section 3's hover mechanics.
 *
 * Deliberately a sibling implementation of MagicBento's ParticleCard rather
 * than a reuse of it: MagicBento renders a fixed index/title/description
 * skeleton, and this card's structure (hero icon and heading on one row, body
 * beneath, mark in the corner) is a different shape entirely. What is shared is
 * the FEEL - the same tilt angles, the same magnetism coefficient, the same
 * cursor-tracked border glow - so pulling the markup apart does not pull the
 * interaction apart with it.
 *
 * THE CARD IS NOT THE REVEAL ELEMENT. Reveal animates transform to bring the
 * card in; GSAP animates transform to tilt it. Same property, two owners, and
 * the reveal loses. So Reveal stays on an outer wrapper and this drives only
 * the inner article.
 */
function WorkCard({
  icon,
  title,
  body,
  interactive,
}: {
  icon: WorkIconName;
  title: string;
  body: string;
  interactive: boolean;
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

      /* The stroke glow is NOT set here - it is proximity-driven from the grid,
         so cards light up as the cursor approaches rather than only once it has
         arrived. See useProximityGlow. This handler owns tilt and magnetism
         only, the same split MagicBento makes between ParticleCard and
         GlobalSpotlight. */
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

  return (
    <article className="work-card" ref={ref}>
      <div className="work-card__top">
        <span className="work-card__icon" aria-hidden="true">
          <WorkIcon name={icon} />
        </span>
        <h3 className="work-card__title">{title}</h3>
        <LogoMark className="work-card__mark" title="" />
      </div>
      <p className="work-card__body">{body}</p>
    </article>
  );
}

export default function Work() {
  const [active, setActive] = useState(0);
  const [interactive, setInteractive] = useState(false);

  const tabs = site.work.tabs;
  const panel = tabs[active];

  const uid = useId().replace(/:/g, "");
  const tabId = (i: number) => `work-tab-${uid}-${i}`;
  const panelId = (i: number) => `work-panel-${uid}-${i}`;

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  useProximityGlow(gridRef, interactive);

  /* Pointer-driven tilt is meaningless without a pointer, and unwelcome when
     motion is reduced. Both are checked once on mount rather than per card. */
  useEffect(() => {
    const query = window.matchMedia(
      `(hover: hover) and (pointer: fine) and (min-width: ${MOBILE_BREAKPOINT}px)`,
    );
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => setInteractive(query.matches && !reduced.matches);
    sync();

    query.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = tabs.length - 1;
    let next: number | null = null;

    if (event.key === "ArrowRight") next = active === last ? 0 : active + 1;
    else if (event.key === "ArrowLeft") next = active === 0 ? last : active - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;

    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="section" id="work" data-theme-key="work">
      <div className="container">
        <div className="work__head">
          <Reveal>
            <h2 className="section-title work__title">{site.work.title}</h2>
          </Reveal>

          {/* The lede and the tabs share a row: the copy on the left, the
              switch pinned to the container's right edge. That is one head row
              fewer, which is most of what buys the section its single
              viewport. */}
          <div className="work__head-row">
            <Reveal delay={100} className="work__lede-wrap">
              {/* Keyed: the lede is the one line of head copy that does change
                  with the tab, so it replays rather than swapping in place. */}
              <p className="lede work__lede" key={panel.id}>
                {panel.lede}
              </p>
            </Reveal>

            <Reveal delay={160} className="work__tabs-wrap">
              <div className="work__tabs" role="tablist" aria-label="Our offerings">
                {tabs.map((tab, i) => (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={tabId(i)}
                    aria-controls={panelId(i)}
                    aria-selected={active === i}
                    tabIndex={active === i ? 0 : -1}
                    className="work__tab"
                    onClick={() => setActive(i)}
                    onKeyDown={onKeyDown}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </Reveal>
          </div>
        </div>

        <div
          className="work__grid"
          ref={gridRef}
          role="tabpanel"
          id={panelId(active)}
          aria-labelledby={tabId(active)}
          style={{ "--glow-color": GLOW_RGB } as React.CSSProperties}
          /* Keyed on the panel so every card remounts and replays its reveal on
             a tab switch. Without it React reuses the nodes, the text swaps in
             place, and the change reads as a typo correction. */
          key={panel.id}
        >
          {panel.items.map((item, index) => (
            <Reveal key={item.title} className="work-card__reveal" delay={index * 70} variant="scale">
              <WorkCard
                icon={item.icon}
                title={item.title}
                body={item.body}
                interactive={interactive}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
