"use client";

import { useEffect, useId, useRef, useState } from "react";
import { onScrollFrame } from "@/lib/scrollState";
import { site } from "@/lib/site";
import { moduleBerth } from "@/lib/moduleBerth";

function smoothstep(edge0: number, edge1: number, x: number): number {
  const c = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return c * c * (3 - 2 * c);
}

export default function Method() {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const uid = useId().replace(/:/g, "");
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const berthSlotRef = useRef<HTMLDivElement>(null);
  const isBerthOwnerRef = useRef(false);

  const toggle = (n: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  useEffect(() => {
    const section = sectionRef.current;
    const rail = railRef.current;
    if (!section || !rail) return;

    let visible = false;

    const update = () => {
      const rect = section.getBoundingClientRect();
      const winH = window.innerHeight;

      // Calculate progress of scrolling through the Method section
      const totalScroll = rect.height - winH * 0.6;
      const currentScroll = -rect.top + winH * 0.2;
      const t = Math.max(0, Math.min(1, totalScroll > 0 ? currentScroll / totalScroll : 0));

      rail.style.setProperty("--rail-progress", t.toString());

      // Update 3D module berth
      const berthSlot = berthSlotRef.current;
      if (berthSlot && visible) {
        const slotRect = berthSlot.getBoundingClientRect();
        const arrive = smoothstep(-winH * 0.5, 0, -rect.top);
        const leave = smoothstep(rect.height - winH, rect.height, -rect.top);
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
      }
    };

    update();
    const unsubscribe = onScrollFrame(update);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          update();
        } else if (isBerthOwnerRef.current) {
          isBerthOwnerRef.current = false;
          moduleBerth.strength = 0;
        }
      },
      { rootMargin: "50% 0px 50% 0px" },
    );
    io.observe(section);

    return () => {
      unsubscribe();
      io.disconnect();
      if (isBerthOwnerRef.current) {
        isBerthOwnerRef.current = false;
        moduleBerth.strength = 0;
      }
    };
  }, []);

  return (
    <section className="section method-section" id="method" ref={sectionRef} data-theme-key="method">
      <div className="container method__container">
        <div className="method__card">
          <div className="method__layout">
            <div className="method__head">
              <p className="eyebrow method__eyebrow">{site.method.eyebrow}</p>
              <h2 className="section-title method__title">{site.method.title}</h2>

              <p className="method__chain" aria-label={`Steps: ${site.method.chain.join(", ")}`}>
                {site.method.chain.map((word, i) => (
                  <span key={word} className="method__chain-item">
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
                The same sequence on every build, whichever business it is — so you always know what happens next.
              </p>

              <div className="method__berth-slot" ref={berthSlotRef} aria-hidden="true" />
            </div>

            <div className="method__track">
              <div className="method__rail" ref={railRef} aria-hidden="true">
                <span className="method__rail-fill" />
                <span className="method__rail-dot" />
              </div>

              <div className="method__scroller">
                <ol className="method__steps">
                  {site.method.steps.map((step) => {
                    const isOpen = open.has(step.n);
                    const panelId = `method-panel-${uid}-${step.n}`;
                    const hasDetail = "detail" in step && step.detail;

                    return (
                      <li key={step.n} className={`method__step${step.accent ? " method__step--accent" : ""}`}>
                        <p className="method__n">{step.n}</p>
                        <p className="method__label">{step.label}</p>
                        <h3 className="method__step-title">{step.title}</h3>

                        {"body" in step && step.body && <p className="method__prose">{step.body}</p>}

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
    </section>
  );
}
