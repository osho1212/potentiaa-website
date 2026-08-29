"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import IntroCubes from "../IntroCubes";
import { onScrollFrame } from "@/lib/scrollState";
import { site } from "@/lib/site";
import { moduleBerth } from "@/lib/moduleBerth";

/** Below this the card stops pinning - see the note on the pin effect. */
const PIN_MIN_WIDTH = 900;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const c = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return c * c * (3 - 2 * c);
}

/**
 * How we work - the method as six numbered steps.
 *
 * Replaces the old `Helping` section. That one was three illustrated scenes of
 * a business before and after; this one is the sequence of what we actually do,
 * which is the question an owner is asking by the time they have scrolled here.
 *
 * WHITE CARD, like the Intro section. The page is dark and this section is a
 * long column of close-set text - numbers, labels, chips, a mono flow chain -
 * and that much fine detail on midnight is where the dark ground stops helping.
 * It is the same device Intro uses for the same reason: lift the reading matter
 * onto paper and leave the dark to the sections that are mostly image.
 *
 * THE HEADING DOES NOT SCROLL. The steps get their own scroller inside the
 * card, so the title, the sequence line and the lede stay put while the reader
 * moves through the six. That is what keeps "how we work" attached to the thing
 * being listed - a page-scrolled version loses the heading by step three.
 *
 * THE DISCLOSURE IS A REAL <button>. It toggles content, so it has to be
 * reachable by keyboard and announce its state - `aria-expanded` plus
 * `aria-controls` does that. The panel uses `hidden`, so collapsed content is
 * out of the accessibility tree and the tab order, not merely invisible.
 */
export default function Method() {
  /* A Set, so any number of steps can be open at once. An accordion that closed
     the previous step would stop the reader comparing two, and there is no
     layout reason to allow only one - the scroller absorbs the height. */
  const [open, setOpen] = useState<Set<string>>(new Set());

  const uid = useId().replace(/:/g, "");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const runwayRef = useRef<HTMLDivElement>(null);
  const berthSlotRef = useRef<HTMLDivElement>(null);
  const isBerthOwnerRef = useRef(false);

  const toggle = (n: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  /**
   * Give the section exactly as much page scroll as the list needs.
   *
   * The runway is the list's own hidden overflow, published as a length the
   * stylesheet adds under a 100svh sticky pin. Measured rather than picked: a
   * hard-coded runway would either end early - leaving the last steps
   * unreachable because the card unpins before they arrive - or run long,
   * parking a finished list on screen while the reader scrolls nothing. It is
   * re-measured whenever a step opens, because that changes the overflow.
   *
   * A 1:1 mapping is the point. One pixel of page scroll moves the list one
   * pixel, so the wheel feels exactly as it does everywhere else on the page;
   * the only thing that changes is WHICH box is moving.
   */
  const measureRunway = useCallback(() => {
    const el = scrollerRef.current;
    const runway = runwayRef.current;
    if (!el || !runway) return;

    const range = Math.max(0, el.scrollHeight - el.clientHeight);
    runway.style.setProperty("--method-runway", `${range}px`);
  }, []);

  /**
   * Drive the list from the page, while the card is pinned.
   * Also drive the floating 3D logo module berth so it lands and sticks in the
   * designated area while Method is in full viewport.
   *
   * Subscribed to onScrollFrame rather than a native scroll listener because
   * Lenis owns the page and does not emit native events for its own programmatic
   * movement - anchor-link jumps included. See lib/scrollState.
   */
  useEffect(() => {
    const el = scrollerRef.current;
    const rail = railRef.current;
    const runway = runwayRef.current;
    if (!el || !rail || !runway) return;

    let visible = false;

    const updateBerth = () => {
      const berthSlot = berthSlotRef.current;
      if (!berthSlot || !visible) return;

      const slotRect = berthSlot.getBoundingClientRect();
      const runwayTop = runway.getBoundingClientRect().top;
      const scrolled = -runwayTop;

      const range = Math.max(0, el.scrollHeight - el.clientHeight);
      const vh = window.innerHeight;

      // Arrive: smoothly transition into berth as the Method section comes into view
      const arrive = smoothstep(-vh * 0.85, 0, scrolled);
      // Leave: smoothly transition out of berth as the Method section unpins and scrolls away
      const leave = smoothstep(range, range + vh * 0.85, scrolled);
      const strength = arrive * (1 - leave);

      if (strength > 0.001) {
        isBerthOwnerRef.current = true;
        moduleBerth.strength = strength;
        moduleBerth.x = slotRect.left + slotRect.width / 2;
        moduleBerth.y = slotRect.top + slotRect.height / 2;
        moduleBerth.size = Math.min(slotRect.width, slotRect.height * 1.3, 300);
      } else if (isBerthOwnerRef.current) {
        isBerthOwnerRef.current = false;
        moduleBerth.strength = 0;
      }
    };

    const update = () => {
      const range = Math.max(0, el.scrollHeight - el.clientHeight);

      if (range > 0) {
        // Zero as the runway's top meets the top of the viewport, which is also
        // the frame the pin engages on.
        const scrolled = -runway.getBoundingClientRect().top;
        const t = Math.min(1, Math.max(0, scrolled / range));

        el.scrollTop = t * range;
        rail.style.setProperty("--rail-progress", t.toString());
      } else {
        rail.style.setProperty("--rail-progress", "1");
      }

      updateBerth();
    };

    measureRunway();
    update();

    const unsubscribe = onScrollFrame(update);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          updateBerth();
        } else if (isBerthOwnerRef.current) {
          isBerthOwnerRef.current = false;
          moduleBerth.strength = 0;
        }
      },
      { rootMargin: "50% 0px 50% 0px" },
    );
    io.observe(runway);

    // Opening a step changes the overflow, so both the runway and the mapping
    // have to be recomputed against the new height.
    const observer = new ResizeObserver(() => {
      measureRunway();
      update();
    });
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));

    window.addEventListener("resize", measureRunway);

    return () => {
      unsubscribe();
      io.disconnect();
      observer.disconnect();
      window.removeEventListener("resize", measureRunway);
      if (isBerthOwnerRef.current) {
        isBerthOwnerRef.current = false;
        moduleBerth.strength = 0;
      }
    };
  }, [measureRunway]);

  /**
   * Keyboard focus must not scroll the list behind the page's back.
   */
  const handleFocus = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    const runway = runwayRef.current;
    if (!el || !runway) return;

    const target = event.target as HTMLElement;
    if (target === el) return;

    const range = Math.max(0, el.scrollHeight - el.clientHeight);
    if (range === 0) return;

    // Undo the browser's own correction before measuring against it.
    const want = target.offsetTop - el.clientHeight / 2 + target.offsetHeight / 2;
    const t = Math.min(1, Math.max(0, want / range));

    const pageY = runway.getBoundingClientRect().top + window.scrollY + t * range;
    const lenis = (window as unknown as { __lenisInstance?: { scrollTo: (y: number) => void } })
      .__lenisInstance;

    if (lenis) lenis.scrollTo(pageY);
    else window.scrollTo(0, pageY);
  }, []);

  return (
    <section className="section method-section" id="method" data-theme-key="method">
      {/* The runway is the section's real height: one viewport for the pinned
          card, plus however much page scroll the list needs to run through. */}
      <div className="method__runway" ref={runwayRef}>
        <div className="method__pin">
          <div className="container method__container">
            <div className="method__card">
              {/* The same falling shards the Intro card carries. Both are white
                  cards on the dark page, and the drift is what stops them
                  reading as flat cut-outs pasted over the depth field. Driven
                  from shared scrollState, so it costs one rAF, not two. */}
              <IntroCubes />

              <div className="method__layout">
            {/* NO <Reveal> ON THIS COLUMN.

                This was a hard constraint and is now a choice. The page used to
                loop, and the wrap seam landed INSIDE this runway (measured: lap
                7539px, boundary 3769px, runway 3555-4918px), so a reader partway
                through the list was teleported to the other copy, whose head had
                never intersected - and it faded itself in, the heading appearing
                to reload mid-scroll while the card had not visibly moved. A
                pinned card spanning the seam therefore could not use
                intersection-driven entrances for anything inside it.

                There is no seam now, so an entrance here would be safe. It is
                still not worth adding: the head is on screen for the whole of
                this section, so there is no moment for it to enter ON. */}
            <div className="method__head">
              <p className="method__eyebrow">{site.method.eyebrow}</p>
              <h2 className="method__title">{site.method.title}</h2>

              {/* The whole sequence on one line, before the detail of it. */}
              <p className="method__chain">
                {site.method.chain.map((word, i) => (
                  <span key={word}>
                    {i > 0 && (
                      <span className="method__chain-arrow" aria-hidden="true">
                        →
                      </span>
                    )}
                    {word}
                  </span>
                ))}
              </p>

              <p className="method__lede">
                The same sequence on every build, whichever business it is — so you always know
                what happens next.
              </p>

              {/* Marked berth slot for the floating 3D logo module */}
              <div className="method__berth-slot" ref={berthSlotRef} aria-hidden="true" />
            </div>

            <div className="method__track">
              {/* The rail sits outside the scroller so it stays still while the
                  steps move past it; the fill is what reports position. */}
              <div className="method__rail" ref={railRef} aria-hidden="true">
                <span className="method__rail-fill" />
                <span className="method__rail-dot" />
              </div>

              <div className="method__scroller" ref={scrollerRef} onFocus={handleFocus}>
                <ol className="method__steps">
                  {site.method.steps.map((step) => {
                    const isOpen = open.has(step.n);
                    const panelId = `method-panel-${uid}-${step.n}`;
                    const hasDetail = "detail" in step && step.detail;

                    return (
                      <li
                        key={step.n}
                        className={`method__step${step.accent ? " method__step--accent" : ""}`}
                      >
                        <p className="method__n">{step.n}</p>
                        <p className="method__label">{step.label}</p>
                        <h3 className="method__step-title">{step.title}</h3>

                        {/* Always-on copy: steps 04-06. */}
                        {"body" in step && step.body && (
                          <p className="method__prose">{step.body}</p>
                        )}

                        {hasDetail && (
                          <>
                            <button
                              type="button"
                              className="method__toggle"
                              aria-expanded={isOpen}
                              aria-controls={panelId}
                              onClick={() => toggle(step.n)}
                            >
                              <span className="method__toggle-mark" aria-hidden="true">
                                {isOpen ? "×" : "+"}
                              </span>
                              What that involves
                            </button>

                            <div className="method__panel" id={panelId} hidden={!isOpen}>
                              <p className="method__lead">{step.detail.lead}</p>

                              {"chips" in step.detail && step.detail.chips && (
                                <ul className="method__chips">
                                  {step.detail.chips.map((chip) => (
                                    <li className="method__chip" key={chip}>
                                      {chip}
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {"flow" in step.detail && step.detail.flow && (
                                <ol className="method__flow">
                                  {step.detail.flow.map((node, i) => (
                                    <li className="method__flow-node" key={node}>
                                      {i > 0 && (
                                        <span className="method__flow-arrow" aria-hidden="true">
                                          →
                                        </span>
                                      )}
                                      {node}
                                    </li>
                                  ))}
                                </ol>
                              )}

                              {"close" in step.detail && step.detail.close && (
                                <p className="method__close">{step.detail.close}</p>
                              )}
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
