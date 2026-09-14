"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { useContact } from "./ContactContext";
import { useModalDialog } from "@/lib/useModalDialog";
import type { Project, ProjectFigure } from "@/lib/projects";
import "./ProjectModal.css";

/** How long each screenshot holds before the hero moves on. */
const SHOT_DURATION = 4500;

const CHAPTERS = [
  { id: "start", label: "The starting point" },
  { id: "approach", label: "How we worked it out" },
  { id: "built", label: "What we built" },
  { id: "change", label: "What changed" },
] as const;

type ChapterId = (typeof CHAPTERS)[number]["id"];

/** An image and what it shows, numbered as a figure by the stylesheet. */
function Figure({ figure, wide }: { figure: ProjectFigure; wide?: boolean }) {
  return (
    <figure
      className="case__figure"
      data-kind={figure.kind ?? "photo"}
      data-wide={wide ? "true" : undefined}
    >
      <div className="case__figure-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={figure.src} alt={figure.alt} loading="lazy" draggable={false} />
      </div>
      <figcaption>{figure.caption}</figcaption>
    </figure>
  );
}

/**
 * A project's case study, read as a story.
 *
 * One scroller holds everything. The screenshot slideshow opens it as a hero,
 * then slides up out of the way until only its bar - title and chapters - stays
 * pinned (a sticky negative top in the stylesheet; nothing here tracks it). The
 * story follows in four chapters, each beat paired with its own image: where
 * the business started, how it was worked out, a row per module built, and
 * what changed.
 *
 * PORTALLED TO <body>. Our Work renders its carousel inside <Reveal>, which
 * always carries a transform - and a transformed ancestor becomes the containing
 * block for position: fixed. Rendered in place, the dialog would be pinned to
 * the carousel's box rather than to the viewport.
 *
 * Mounted only while open, and re-keyed per project by the caller, so every
 * opening starts from the first screenshot at the top of the story.
 */
export default function ProjectModal({
  project,
  onClose,
}: {
  project: Project;
  /** Must be stable - see useModalDialog. */
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Partial<Record<ChapterId, HTMLElement | null>>>({});
  const reducedRef = useRef(false);
  const { open: openContact } = useContact();

  const [active, setActive] = useState(0);
  /**
   * The slideshow runs until the reader stops it, with the button on the hero.
   *
   * NOT PAUSED ON HOVER. A project is opened by clicking a card in the middle
   * of the screen, so the dialog appears with the pointer already resting on
   * the images: hover-to-pause meant it opened paused, and a slideshow that
   * never moves reads as broken. The explicit control is also what a slideshow
   * that runs indefinitely needs to offer (WCAG 2.2.2).
   */
  const [playing, setPlaying] = useState(true);
  const [chapter, setChapter] = useState<ChapterId>("start");

  const shots = project.gallery;
  const count = shots.length;

  useModalDialog(true, onClose, panelRef);

  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Reduced motion starts still; the reader can still press play.
    if (reducedRef.current) setPlaying(false);
  }, []);

  /* A timeout per image rather than one interval, so choosing a screenshot by
     hand gives it the full duration instead of whatever the interval had left. */
  useEffect(() => {
    if (!playing || count < 2) return;
    const timer = window.setTimeout(() => setActive((i) => (i + 1) % count), SHOT_DURATION);
    return () => window.clearTimeout(timer);
  }, [active, playing, count]);

  /**
   * Reveal each beat of the story as it scrolls into the panel.
   *
   * Written straight to the element rather than through state: there are a
   * dozen of these, each changes once, and none of it is anything React needs
   * to render. `data-reveal-ready` goes on only once the observer exists, so
   * the stylesheet never hides content that nothing is going to reveal.
   */
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.seen = "true";
          observer.unobserve(entry.target);
        }
      },
      { root: scroller, rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );

    scroller.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => observer.observe(el));
    scroller.dataset.revealReady = "true";
    return () => observer.disconnect();
  }, []);

  /**
   * Which chapter is being read, from the story's own scroll (the page is
   * locked while this is open). Four offsetTop reads, at most once a frame,
   * only while the story scrolls.
   */
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const barHeight = barRef.current?.offsetHeight ?? 0;
      const readLine = scroller.scrollTop + barHeight + scroller.clientHeight * 0.3;

      let current: ChapterId = CHAPTERS[0].id;
      for (const { id } of CHAPTERS) {
        const el = chapterRefs.current[id];
        if (el && el.offsetTop <= readLine) current = id;
      }
      // The last chapter can be too short to ever reach the read line.
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) {
        current = CHAPTERS[CHAPTERS.length - 1].id;
      }
      setChapter(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const step = (by: number) => setActive((i) => (i + by + count) % count);

  /* Lands the chapter just under the bar. Every chapter sits below the whole
     hero, so by the time it is there the hero has collapsed to its bar - the
     bar's height is the only offset needed. */
  const goToChapter = (id: ChapterId) => {
    const scroller = scrollRef.current;
    const el = chapterRefs.current[id];
    if (!scroller || !el) return;
    scroller.scrollTo({
      top: el.offsetTop - (barRef.current?.offsetHeight ?? 0),
      behavior: reducedRef.current ? "auto" : "smooth",
    });
  };

  const discuss = () => {
    onClose();
    openContact();
  };

  const chapterProps = (id: ChapterId) => ({
    ref: (el: HTMLElement | null) => {
      chapterRefs.current[id] = el;
    },
    className: "case__chapter",
    "aria-labelledby": `case-${id}-title`,
  });

  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
      <button
        type="button"
        className="modal__scrim"
        aria-label="Close project details"
        onClick={onClose}
      />

      <div className="case" ref={panelRef}>
        <button
          type="button"
          className="case__close"
          onClick={onClose}
          aria-label="Close project details"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {/* data-lenis-prevent lets this scroll natively while Lenis is stopped;
            the page itself is locked by useModalDialog. */}
        <div className="case__scroll" ref={scrollRef} data-lenis-prevent>
          <header className="case__hero">
            <div className="case__media" role="region" aria-label={`${project.title} screenshots`}>
              {shots.map((shot, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={index}
                  src={shot.src}
                  alt={index === active ? shot.alt : ""}
                  aria-hidden={index !== active}
                  className="case__shot"
                  data-active={index === active}
                  draggable={false}
                />
              ))}
              <div className="case__shade" aria-hidden="true" />

              {count > 1 && playing && (
                <span
                  key={active}
                  className="case__progress"
                  style={{ "--shot-duration": `${SHOT_DURATION}ms` } as React.CSSProperties}
                  aria-hidden="true"
                />
              )}

              <p className="case__shot-caption">
                {count > 1 && (
                  <span className="case__shot-count">
                    {active + 1} / {count}
                  </span>
                )}
                {shots[active]?.caption}
              </p>

              <div className="case__headline">
                <p className="case__eyebrow">Case study · {project.industry}</p>
                <h3 className="case__title" id="project-modal-title">
                  {project.title}
                </h3>
              </div>

              {count > 1 && (
                <div className="case__hero-controls">
                  <button
                    type="button"
                    className="case__hero-button"
                    aria-label="Previous screenshot"
                    onClick={() => step(-1)}
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                  </button>
                  <div className="case__dots">
                    {shots.map((shot, index) => (
                      <button
                        key={index}
                        type="button"
                        className="case__dot"
                        aria-label={`Show screenshot ${index + 1}: ${shot.caption}`}
                        aria-current={index === active}
                        onClick={() => setActive(index)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="case__hero-button"
                    aria-label="Next screenshot"
                    onClick={() => step(1)}
                  >
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="case__hero-button"
                    aria-label={playing ? "Pause slideshow" : "Play slideshow"}
                    onClick={() => setPlaying((value) => !value)}
                  >
                    {playing ? (
                      <Pause size={14} aria-hidden="true" />
                    ) : (
                      <Play size={14} aria-hidden="true" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="case__bar" ref={barRef}>
              <span className="case__bar-title" aria-hidden="true">
                {project.title}
              </span>
              <nav className="case__chapters" aria-label="Chapters">
                <ol>
                  {CHAPTERS.map(({ id, label }, index) => (
                    <li key={id}>
                      <button
                        type="button"
                        data-active={chapter === id}
                        aria-current={chapter === id ? "step" : undefined}
                        onClick={() => goToChapter(id)}
                      >
                        <span className="case__chapter-num">{index + 1}</span>
                        {label}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </header>

          <div className="case__content">
            <section className="case__intro" data-reveal aria-label="Overview">
              <p className="case__tagline">{project.tagline}</p>
              <dl className="case__facts">
                <div>
                  <dt>Industry</dt>
                  <dd>{project.industry}</dd>
                </div>
                <div>
                  <dt>Scope</dt>
                  <dd>{project.built.length} modules, delivered as one system</dd>
                </div>
                <div>
                  <dt>Delivered</dt>
                  <dd>{project.features.join(" · ")}</dd>
                </div>
              </dl>
            </section>

            <section {...chapterProps("start")}>
              <header className="case__chapter-head" data-reveal>
                <p className="case__kicker">
                  <b>01</b> · The starting point
                </p>
                <h4 className="case__chapter-title" id="case-start-title">
                  {project.challenge.title}
                </h4>
              </header>
              <div className="case__row" data-reveal>
                <Figure figure={project.challenge.figure} />
                <div>
                  <p className="case__lede">{project.challenge.body}</p>
                  <ul className="case__frictions">
                    {project.challenge.pains.map((pain) => (
                      <li key={pain}>{pain}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section {...chapterProps("approach")}>
              <header className="case__chapter-head" data-reveal>
                <p className="case__kicker">
                  <b>02</b> · How we worked it out
                </p>
                <h4 className="case__chapter-title" id="case-approach-title">
                  From the first conversation to a working system
                </h4>
              </header>
              <div className="case__row case__row--flip" data-reveal>
                <Figure figure={project.approachFigure} />
                <ol className="case__timeline">
                  {project.approach.map((item) => (
                    <li key={item.stage}>
                      <span className="case__stage">{item.stage}</span>
                      <p>{item.body}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <section {...chapterProps("built")}>
              <header className="case__chapter-head" data-reveal>
                <p className="case__kicker">
                  <b>03</b> · What we built
                </p>
                <h4 className="case__chapter-title" id="case-built-title">
                  {project.built.length} modules, one system
                </h4>
              </header>
              {project.built.map((item, index) => (
                <article
                  key={item.title}
                  className={`case__row${index % 2 === 1 ? " case__row--flip" : ""}`}
                  data-reveal
                >
                  <Figure figure={item.figure} />
                  <div>
                    <span className="case__module-num" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h5 className="case__module-title">{item.title}</h5>
                    <p className="case__module-detail">{item.detail}</p>
                  </div>
                </article>
              ))}
            </section>

            <section {...chapterProps("change")}>
              <header className="case__chapter-head" data-reveal>
                <p className="case__kicker">
                  <b>04</b> · What changed
                </p>
                <h4 className="case__chapter-title" id="case-change-title">
                  The day to day, before and after
                </h4>
              </header>
              <div data-reveal>
                <Figure figure={project.outcomeFigure} wide />
              </div>
              <ul className="case__shift" data-reveal>
                {project.shift.map((row) => (
                  <li key={row.before}>
                    <div className="case__before">
                      <span className="case__shift-label">Before</span>
                      <p>{row.before}</p>
                    </div>
                    <ArrowRight size={18} className="case__shift-arrow" aria-hidden="true" />
                    <div className="case__after">
                      <span className="case__shift-label">After</span>
                      <p>{row.after}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <footer className="case__outro" data-reveal>
              <div className="case__tags">
                {project.features.map((feature) => (
                  <span key={feature} className="case__tag">
                    {feature}
                  </span>
                ))}
              </div>
              <p className="case__outro-title">Dealing with something similar?</p>
              <p className="case__outro-text">
                Tell us how your day runs today, and we will show you what the same approach would
                look like for your business.
              </p>
              <button type="button" className="btn btn--primary case__cta" onClick={discuss}>
                Discuss a similar build
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </footer>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
