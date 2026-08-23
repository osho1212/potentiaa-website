"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll-reveal wrapper. Uses IntersectionObserver rather than ScrollTrigger
 * so text still appears when motion is reduced (the CSS in motion.css strips
 * the transition and leaves the content visible).
 */
/** Which way the element arrives. See the note in styles/motion.css. */
export type RevealVariant = "up" | "scale" | "left" | "right" | "blur" | "rise";

export default function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
  variant = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  as?: React.ElementType;
  className?: string;
  variant?: RevealVariant;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = "true";
            observer.unobserve(entry.target);
          }
        });
      },
      // A low threshold with a generous bottom margin: the element starts
      // moving as it enters rather than after it has arrived, which is the
      // difference between a page that animates and a page that pops.
      { threshold: 0.08, rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal${variant === "up" ? "" : ` reveal--${variant}`} ${className}`.trim()}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
