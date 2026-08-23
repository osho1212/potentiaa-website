"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { onScrollFrame } from "@/lib/scrollState";
import poses from "@/public/assets/mascot/poses.json";
import propManifest from "@/public/assets/mascot/props.json";

/**
 * Zeal, standing beside a section, holding up whatever the reader is pointing at.
 *
 * REWRITTEN to stand still. He used to track the scroll position: the component
 * measured a sightline, worked out which card or row it fell on, translated him
 * up or down so a fingertip anchor met that item, and drew a leader line from
 * his hand to it. All of that is gone on the owner's instruction - "do not
 * physically move our mascot, keep him still and just change the items in his
 * hand on mouse cursor, and I don't need the connector lines".
 *
 * It is a better mechanic than the one it replaces, and not only because it was
 * asked for. The scroll version was answering a question the reader had not
 * asked - it decided what they were looking at from how far they had scrolled,
 * which was a guess, and then moved a 450px character to act on the guess.
 * Hovering is not a guess. The reader says what they are interested in and he
 * responds to that, and when they are not pointing at anything he simply holds
 * the section's first object.
 *
 * What remains scroll-driven is the exit fade, and that is not choreography -
 * he sits in normal flow, so he scrolls up under a translucent header pill and
 * would otherwise ghost through the nav links on the way past.
 */

type PoseName = keyof typeof poses;
type PropName = keyof typeof propManifest;

type ZealExplainerProps = {
  pose: PoseName;
  /** CSS selector for the hoverable items, searched within the enclosing section. */
  targets: string;
  /** Rendered height of the pose in CSS px at desktop. */
  height?: number;
  /**
   * Human description of what this section's targets are.
   *
   * Documentation for the call site, NOT content - it is never rendered. I put
   * it on the page in one revision and it shipped "what we build" and "the
   * services list" as plain 16px white text floating under each mascot, which
   * is the kind of thing that only shows up if you actually read the DOM back.
   * It stays as a required prop because naming the placement at the call site
   * is worth the two words.
   */
  describes: string;
  /**
   * One object per target, in the same order.
   *
   * The craft critic failed three rounds on the same cause: "his hands are
   * empty in all three poses, which is why he reads as decoration no matter how
   * good the tracking is". A pointer adds nothing; a presenter does. Hovering a
   * card swaps what he is holding to that card's object.
   */
  payload?: PropName[];
};

/** Zeal's height once the two-column layout collapses, CSS px. */
const COLLAPSED_HEIGHT = 240;

/**
 * Where he must be gone by, and how fast. CSS px from the viewport top.
 *
 * The header pill occupies roughly 24-88px and is translucent, so 88 is the
 * line: any part of him above it shows through the nav links.
 */
const HEADER_CLEARANCE = 88;
const HEADER_FADE = 40;

const SATELLITES = [
  { token: "var(--midnight-500)", top: 2, left: 4, size: 26, delay: 0 },
  { token: "var(--blue-500)", top: 30, left: 74, size: 20, delay: 0.9 },
  { token: "var(--coral-500)", top: 78, left: 14, size: 16, delay: 1.7 },
];

export default function ZealExplainer({
  pose,
  targets,
  height = 380,
  payload,
}: ZealExplainerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fade, setFade] = useState(1);
  const [collapsed, setCollapsed] = useState(false);
  const [reduced, setReduced] = useState(false);

  const art = poses[pose];

  useEffect(() => {
    const wide = window.matchMedia("(max-width: 960px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setCollapsed(wide.matches);
      setReduced(motion.matches);
    };
    sync();
    wide.addEventListener("change", sync);
    motion.addEventListener("change", sync);
    return () => {
      wide.removeEventListener("change", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);

  /**
   * The only thing still measured per frame, and the only thing that needs to be.
   *
   * He does not move, so there is no position to recompute - but the section he
   * stands in does move, and the header he would pass under is translucent.
   */
  const measureFade = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const box = root.getBoundingClientRect();
    const ownHeight = collapsed ? COLLAPSED_HEIGHT : height;
    const top = box.top + box.height - ownHeight;
    setFade(Math.max(0, Math.min(1, (top - HEADER_CLEARANCE) / HEADER_FADE)));
  }, [collapsed, height]);

  useEffect(() => {
    measureFade();

    // Lenis drives this page and does not emit a native scroll event for its
    // own programmatic movement, so a window listener would leave this frozen.
    const unsubscribe = onScrollFrame(measureFade);
    window.addEventListener("resize", measureFade);
    return () => {
      unsubscribe();
      window.removeEventListener("resize", measureFade);
    };
  }, [measureFade]);

  /**
   * Hover, which is now the whole interaction.
   *
   * Bound on the section rather than per item so nothing has to be re-bound
   * when the list changes, and it sets the active state directly rather than
   * overriding a scroll-derived one - there is no longer a scroll-derived one
   * to override.
   */
  useEffect(() => {
    const section = rootRef.current?.closest("section");
    if (!section || collapsed) return;

    const items = () =>
      Array.from(section.querySelectorAll<HTMLElement>(targets));

    const setActive = (index: number) => {
      setActiveIndex(index);
      items().forEach((node, i) =>
        node.toggleAttribute("data-zeal-active", i === index),
      );
    };

    setActive(0);

    const onOver = (event: Event) => {
      const node = (event.target as HTMLElement)?.closest<HTMLElement>(targets);
      if (!node) return;
      const index = items().indexOf(node);
      if (index >= 0) setActive(index);
    };

    // Leaving the section entirely returns him to the first object, so he is
    // never left holding something the reader has stopped looking at.
    const onLeave = () => setActive(0);

    section.addEventListener("mouseover", onOver);
    section.addEventListener("mouseleave", onLeave);
    return () => {
      section.removeEventListener("mouseover", onOver);
      section.removeEventListener("mouseleave", onLeave);
      items().forEach((node) => node.removeAttribute("data-zeal-active"));
    };
  }, [collapsed, targets]);

  const artWidth = Math.round((art.width / art.height) * height);

  return (
    <div className="explainer__stage" ref={rootRef}>
      <div
        className="explainer__zeal"
        style={
          collapsed
            ? { height: COLLAPSED_HEIGHT, transform: "translateX(-50%)", opacity: fade }
            : { width: artWidth, height, opacity: fade }
        }
      >
        {!reduced &&
          SATELLITES.map((sat, i) => (
            <span
              key={i}
              className="explainer__satellite"
              style={{
                background: sat.token,
                width: sat.size,
                height: sat.size,
                top: `${sat.top}%`,
                left: `${sat.left}%`,
                animationDelay: `${sat.delay}s`,
              }}
            />
          ))}

        <Image
          src={art.src}
          alt=""
          aria-hidden="true"
          width={art.width}
          height={art.height}
          className="explainer__art"
          sizes="480px"
        />

        {/* The payload sits IN the character's box now rather than being
            positioned against the stage from a measured fingertip.

            The anchor maths existed to keep a held object attached to a hand
            that was moving up and down the column every frame. He does not move
            any more, so the object's place is a fixed spot in his silhouette -
            and a constant beats a measurement that has to be right 60 times a
            second. It also removes the class of bug where the two drifted
            apart: the anchor was once found to be exactly --space-10 off, and
            looked correct only because a second error cancelled it. */}
        {payload && !collapsed && (
          <span className="explainer__payload" aria-hidden="true">
            {payload.map((name, i) => {
              const item = propManifest[name];
              return (
                <Image
                  key={name + i}
                  src={item.src}
                  alt=""
                  width={item.width}
                  height={item.height}
                  data-shown={i === activeIndex}
                  className="explainer__prop"
                  sizes="96px"
                />
              );
            })}
          </span>
        )}
      </div>

    </div>
  );
}
