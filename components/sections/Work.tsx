"use client";

import { useEffect, useId, useRef, useState } from "react";
import { gsap } from "gsap";
import Reveal from "../Reveal";
import LogoMark from "../LogoMark";
import WorkIcon, { type WorkIconName } from "../WorkIcons";
import { site } from "@/lib/site";

const MOBILE_BREAKPOINT = 768;
const GLOW_RGB = "79, 70, 229";
const GLOW_RADIUS = 280;

function useProximityGlow(
  gridRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !enabled) return;

    const proximity = GLOW_RADIUS * 0.5;
    const fadeDistance = GLOW_RADIUS * 0.75;

    let cardItems: { el: HTMLElement; rect: DOMRect }[] = [];
    let box: DOMRect | null = null;
    let rafId = 0;
    let lastEvent: MouseEvent | null = null;

    const updateRects = () => {
      box = grid.getBoundingClientRect();
      const nodes = Array.from(grid.querySelectorAll<HTMLElement>(".work-card"));
      cardItems = nodes.map((el) => ({ el, rect: el.getBoundingClientRect() }));
    };

    const clear = () => {
      cardItems.forEach(({ el }) => el.style.setProperty("--glow-intensity", "0"));
    };

    const processMove = () => {
      rafId = 0;
      if (!lastEvent) return;
      if (!box || cardItems.length === 0) updateRects();
      if (!box) return;

      const event = lastEvent;
      const near =
        event.clientX >= box.left - 50 &&
        event.clientX <= box.right + 50 &&
        event.clientY >= box.top - 50 &&
        event.clientY <= box.bottom + 50;

      if (!near) return clear();

      cardItems.forEach(({ el, rect }) => {
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

        el.style.setProperty("--glow-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        el.style.setProperty("--glow-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
        el.style.setProperty("--glow-intensity", intensity.toString());
        el.style.setProperty("--glow-radius", `${GLOW_RADIUS}px`);
      });
    };

    const onMove = (event: MouseEvent) => {
      lastEvent = event;
      if (!rafId) {
        rafId = requestAnimationFrame(processMove);
      }
    };

    const handleScrollOrResize = () => {
      updateRects();
    };

    updateRects();
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", clear);
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", clear);
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [gridRef, enabled]);
}

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

    let cachedRect: DOMRect | null = null;

    const onEnter = () => {
      cachedRect = el.getBoundingClientRect();
      gsap.to(el, { rotateX: 4, rotateY: 4, duration: 0.3, ease: "power2.out", transformPerspective: 1000 });
    };

    const onMove = (event: MouseEvent) => {
      if (!cachedRect) cachedRect = el.getBoundingClientRect();
      const rect = cachedRect;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      gsap.to(el, {
        rotateX: ((y - cy) / cy) * -6,
        rotateY: ((x - cx) / cx) * 6,
        x: (x - cx) * 0.035,
        y: (y - cy) * 0.035,
        duration: 0.25,
        ease: "power2.out",
        transformPerspective: 1000,
      });
    };

    const onLeave = () => {
      cachedRect = null;
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
    <section className="section work-section" id="offerings" data-theme-key="work">
      <div className="container">
        <div className="work__head">
          <Reveal>
            <h2 className="section-title work__title">{site.work.title}</h2>
          </Reveal>

          <div className="work__head-row">
            <Reveal delay={100} className="work__lede-wrap">
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
