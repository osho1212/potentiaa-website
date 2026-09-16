"use client";

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import "./OptionWheel.css";

/* Fallback only - MobileNav passes the real labels, built from site.nav. Kept
   in step with it so the default is not quietly wrong. */
const DEFAULT_ITEMS = [
  "Home",
  "What we build",
  "How we work",
  "How it works",
  "Get in touch",
];

/* ---- Direct manipulation ---------------------------------------------
   The wheel is held, not steered: while a finger is down its position IS the
   finger's, with no easing between them. Easing only happens after release,
   and it starts at the finger's own speed, so there is no seam between the
   two - no lag while dragging, and no dead stop or jump when letting go. */

/** Movement before a press counts as a drag. The wheel follows from the first
    pixel regardless; this only decides whether the release is also a tap. */
const TAP_SLOP = 6;
/** How far back to look when measuring the release speed, ms. A finger that
    rested longer than this before lifting carries nothing. */
const VELOCITY_WINDOW = 100;
/** How far a flick carries past the release point: seconds of travel at the
    release speed, before it is rounded to an option. */
const FLICK_CARRY = 0.14;
/** Past the first or last option the pull meets growing resistance and never
    goes further than this many rows, then springs back on release. */
const OVERSCROLL_ROWS = 1.2;
const OVERSCROLL_STIFFNESS = 0.55;
/** Fastest release speed honoured, rows per second. */
const MAX_VELOCITY = 30;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Apple's rubber band: resistance that grows with distance and never lets go. */
function rubberBand(value: number, max: number) {
  if (value >= 0 && value <= max) return value;
  const over = value < 0 ? -value : value - max;
  const eased = (1 - 1 / ((over * OVERSCROLL_STIFFNESS) / OVERSCROLL_ROWS + 1)) * OVERSCROLL_ROWS;
  return value < 0 ? -eased : max + eased;
}

export interface OptionWheelProps {
  items?: string[];
  defaultSelected?: number;
  onChange?: (index: number, item: string) => void;
  onSelect?: (index: number, item: string) => void;
  textColor?: string;
  activeColor?: string;
  side?: "left" | "right";
  fontSize?: number;
  spacing?: number;
  curve?: number;
  tilt?: number;
  blur?: number;
  fade?: number;
  minOpacity?: number;
  /** Roughly how long the wheel takes to settle onto an option, ms. */
  smoothing?: number;
  inset?: number;
  loop?: boolean;
  draggable?: boolean;
  soundUrl?: string;
  soundVolume?: number;
  className?: string;
}

interface WheelConfig {
  count: number;
  items: string[];
  rowH: number;
  curve: number;
  tilt: number;
  blur: number;
  fade: number;
  minOpacity: number;
  side: "left" | "right";
  loop: boolean;
  smoothing: number;
  draggable: boolean;
  soundUrl: string;
  soundVolume: number;
}

interface Drag {
  id: number;
  y: number;
  /** Wheel position when the finger landed. */
  start: number;
  moved: boolean;
  /** Recent unclamped positions, for the release speed. */
  samples: { t: number; pos: number }[];
}

export default function OptionWheel({
  items = DEFAULT_ITEMS,
  defaultSelected = 0,
  onChange,
  onSelect,
  textColor = "#8c9bb4",
  activeColor = "#ffffff",
  side = "left",
  fontSize = 2.4,
  spacing = 1.4,
  curve = 1,
  tilt = 6,
  blur = 2,
  fade = 0.25,
  minOpacity = 0.05,
  smoothing = 380,
  inset = 40,
  loop = false,
  draggable = true,
  soundUrl = "",
  soundVolume = 0.5,
  className = "",
}: OptionWheelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  /** Rendered position in rows, fractional. The single source of truth. */
  const posRef = useRef(defaultSelected);
  /** Its velocity, rows per second - handed from a flick to the settle. */
  const velRef = useRef(0);
  /** Where the settle is headed. */
  const targetRef = useRef(defaultSelected);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(defaultSelected);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<Drag | null>(null);
  /** Swallows the click that ends a drag, or a tap that only caught a spin. */
  const suppressClickRef = useRef(false);
  const reducedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef("");
  const lastTickRef = useRef(0);
  const [selectedIndex, setSelectedIndex] = useState(defaultSelected);
  const [isDragging, setIsDragging] = useState(false);

  const remPx =
    typeof window !== "undefined"
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16;

  onChangeRef.current = onChange;
  onSelectRef.current = onSelect;
  const cfgRef = useRef<WheelConfig>(null as unknown as WheelConfig);
  cfgRef.current = {
    count: items.length,
    items,
    rowH: Math.max(fontSize * spacing * remPx, 1),
    curve,
    tilt,
    blur,
    fade,
    minOpacity,
    side,
    loop,
    smoothing,
    draggable,
    soundUrl,
    soundVolume,
  };

  /** Lays every option out along the curve from the current position. */
  const paint = useCallback(() => {
    const cfg = cfgRef.current;
    const pos = posRef.current;
    const els = itemRefs.current;
    const n = cfg.count;
    const mirror = cfg.side === "right" ? -1 : 1;
    // Options sit on a circle whose radius keeps the arc length between two
    // neighbours equal to one row height, so tilt controls how tightly it curls.
    const tiltRad = (cfg.tilt * Math.PI) / 180;
    const R = tiltRad > 0.0005 ? cfg.rowH / tiltRad : 0;

    for (let i = 0; i < n; i++) {
      const el = els[i];
      if (!el) continue;
      let d = i - pos;
      if (cfg.loop && n > 1) {
        d = ((d % n) + n) % n;
        if (d > n / 2) d -= n;
      }
      const dist = Math.abs(d);
      let x = 0;
      let y = d * cfg.rowH;
      let rot = 0;
      if (R > 0) {
        const ang = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, d * tiltRad));
        y = R * Math.sin(ang);
        x = -mirror * R * (1 - Math.cos(ang)) * cfg.curve;
        rot = (mirror * ang * 180) / Math.PI;
      }
      // 0 -> 1 as the option reaches the middle. Emphasis is scale, colour and
      // glow off this one number, so it follows the finger continuously - a
      // font-weight switch could only flip at the halfway mark.
      const p = Math.max(0, 1 - Math.min(dist, 1));
      const scale = 0.94 + 0.06 * p;
      el.style.transform = `translate(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%)) rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
      el.style.opacity = String(Math.max(cfg.minOpacity, 1 - dist * cfg.fade));
      el.style.filter = cfg.blur > 0 ? `blur(${(dist * cfg.blur).toFixed(2)}px)` : "none";
      el.style.setProperty("--ow-p", p.toFixed(4));
    }
  }, []);

  // Optional tick on selection change, throttled so fast scrolling can't spam
  // it, and with playback failures (e.g. autoplay policies) silently ignored.
  const playTick = useCallback(() => {
    const { soundUrl, soundVolume } = cfgRef.current;
    if (!soundUrl) return;
    const now = performance.now();
    if (now - lastTickRef.current < 70) return;
    lastTickRef.current = now;
    if (!audioRef.current || audioUrlRef.current !== soundUrl) {
      audioRef.current = new Audio(soundUrl);
      audioRef.current.preload = "auto";
      audioUrlRef.current = soundUrl;
    }
    const audio = audioRef.current;
    audio.volume = Math.min(Math.max(soundVolume, 0), 1);
    audio.currentTime = 0;
    audio.play()?.catch(() => {});
  }, []);

  /** Keeps the highlighted option in step with whatever is in the middle. */
  const syncSelected = useCallback(
    (pos: number) => {
      const cfg = cfgRef.current;
      const n = cfg.count;
      if (!n) return;
      let idx = Math.round(pos);
      idx = cfg.loop ? ((idx % n) + n) % n : Math.min(Math.max(idx, 0), n - 1);
      if (idx === selectedRef.current) return;
      selectedRef.current = idx;
      setSelectedIndex(idx);
      onChangeRef.current?.(idx, cfg.items[idx]);
      playTick();
    },
    [playTick],
  );

  /**
   * The settle: a critically damped spring from wherever the wheel is, at
   * whatever speed it is moving, onto the target - so a flick decelerates into
   * place and a release mid-pull springs back, with no overshoot wobble.
   * Integrated in small fixed substeps so a long frame cannot destabilise it.
   */
  const frame = useCallback(
    (now: number) => {
      const cfg = cfgRef.current;
      const dt = Math.min((now - lastRef.current) / 1000, 1 / 30);
      lastRef.current = now;
      // Settles to within ~0.3% in `smoothing` ms.
      const omega = 5.8 / (Math.max(cfg.smoothing, 1) / 1000);
      const target = targetRef.current;
      let x = posRef.current;
      let v = velRef.current;
      for (let left = dt; left > 0; left -= 1 / 240) {
        const h = Math.min(left, 1 / 240);
        v += (-omega * omega * (x - target) - 2 * omega * v) * h;
        x += v * h;
      }
      const settled = Math.abs(x - target) < 0.0005 && Math.abs(v) < 0.01;
      if (settled) {
        x = target;
        v = 0;
      }
      posRef.current = x;
      velRef.current = v;
      paint();
      syncSelected(x);
      rafRef.current = settled ? null : requestAnimationFrame(frame);
    },
    [paint, syncSelected],
  );

  const settleTo = useCallback(
    (value: number) => {
      const cfg = cfgRef.current;
      let target = value;
      if (!cfg.loop) target = Math.min(Math.max(target, 0), Math.max(cfg.count - 1, 0));
      targetRef.current = target;

      if (reducedRef.current) {
        posRef.current = target;
        velRef.current = 0;
        paint();
        syncSelected(target);
        return;
      }
      // Only start the loop if it is not already running. Restarting it on
      // every input reset its clock, which starved each frame's step - the
      // old wheel crawled for exactly as long as the finger kept moving.
      if (rafRef.current == null) {
        lastRef.current = performance.now();
        rafRef.current = requestAnimationFrame(frame);
      }
    },
    [frame, paint, syncSelected],
  );

  const stopMotion = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    velRef.current = 0;
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedRef.current = query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Wheel / touchpad scrolling, registered manually so it can be non-passive.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cfg = cfgRef.current;
      const delta = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
      // Cap each event at one step so notchy mouse wheels move exactly one
      // option per click, while touchpads still scroll continuously.
      const step = Math.max(-1, Math.min(1, delta / cfg.rowH));
      settleTo(targetRef.current + step);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => settleTo(Math.round(targetRef.current)), 140);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, [settleTo]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!cfgRef.current.draggable) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // Touching a moving wheel catches it where it is. That tap is a grab,
      // not a choice, so it does not also open whatever was under it.
      suppressClickRef.current = rafRef.current != null && Math.abs(velRef.current) > 0.5;
      stopMotion();
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      dragRef.current = {
        id: e.pointerId,
        y: e.clientY,
        start: posRef.current,
        moved: false,
        samples: [{ t: performance.now(), pos: posRef.current }],
      };
    },
    [stopMotion],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.id !== e.pointerId) return;
      const cfg = cfgRef.current;
      const dy = e.clientY - drag.y;

      if (!drag.moved && Math.abs(dy) > TAP_SLOP) {
        drag.moved = true;
        // Captured only once it is a drag, so a plain tap still reaches the
        // option under it.
        try {
          rootRef.current?.setPointerCapture(e.pointerId);
        } catch {
          /* The pointer is already gone; the drag simply ends with it. */
        }
        setIsDragging(true);
      }

      // 1:1 from the first pixel: one row of finger travel is one option.
      const raw = drag.start - dy / cfg.rowH;
      const pos = cfg.loop ? raw : rubberBand(raw, cfg.count - 1);
      posRef.current = pos;

      const now = performance.now();
      drag.samples.push({ t: now, pos: raw });
      while (drag.samples.length > 2 && now - drag.samples[0].t > VELOCITY_WINDOW) {
        drag.samples.shift();
      }

      paint();
      syncSelected(pos);
    },
    [paint, syncSelected],
  );

  const handlePointerEnd = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.id !== e.pointerId) return;
      dragRef.current = null;
      const cfg = cfgRef.current;

      if (!drag.moved) {
        // A tap: land on the option in the middle. Its click, if it was on an
        // option, then chooses it.
        settleTo(Math.round(posRef.current));
        return;
      }

      setIsDragging(false);
      suppressClickRef.current = true;

      const now = performance.now();
      const recent = drag.samples.filter((s) => now - s.t <= VELOCITY_WINDOW);
      let v = 0;
      if (e.type === "pointerup" && recent.length >= 2) {
        const first = recent[0];
        const last = recent[recent.length - 1];
        const span = (last.t - first.t) / 1000;
        if (span > 0.008) v = (last.pos - first.pos) / span;
      }
      v = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v));

      // Pulled past an end and still heading outward: the band has already
      // soaked that up, so it springs straight back rather than further out.
      const max = cfg.count - 1;
      const pos = posRef.current;
      if (!cfg.loop && ((pos < 0 && v < 0) || (pos > max && v > 0))) v = 0;

      velRef.current = v;
      settleTo(Math.round(pos + v * FLICK_CARRY));
    },
    [settleTo],
  );

  const handleItemClick = useCallback(
    (index: number) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      const cfg = cfgRef.current;
      const cur = targetRef.current;
      let d = index - (((cur % cfg.count) + cfg.count) % cfg.count);
      if (cfg.loop && cfg.count > 1) {
        if (d > cfg.count / 2) d -= cfg.count;
        else if (d < -cfg.count / 2) d += cfg.count;
      }
      settleTo(Math.round(cur) + d);
      onSelectRef.current?.(index, cfg.items[index]);
    },
    [settleTo],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let delta = null;
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") delta = -1;
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") delta = 1;
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelectRef.current?.(selectedIndex, cfgRef.current.items[selectedIndex]);
        return;
      }
      if (delta == null) return;
      e.preventDefault();
      settleTo(Math.round(targetRef.current) + delta);
    },
    [settleTo, selectedIndex],
  );

  // Laid out before the first paint, and again whenever the geometry changes.
  useIsoLayoutEffect(() => {
    paint();
    syncSelected(posRef.current);
  }, [items, fontSize, spacing, curve, tilt, blur, fade, minOpacity, side, loop, paint, syncSelected]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      audioRef.current?.pause();
    },
    [],
  );

  return (
    <div
      ref={rootRef}
      role="listbox"
      tabIndex={0}
      aria-label="Option wheel"
      className={`option-wheel${side === "right" ? " option-wheel--right" : ""}${isDragging ? " option-wheel--dragging" : ""}${className ? ` ${className}` : ""}`}
      style={
        {
          "--ow-text-color": textColor,
          "--ow-active-color": activeColor,
          "--ow-font-size": `${fontSize}rem`,
          "--ow-inset": `${inset}px`,
        } as React.CSSProperties
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
    >
      {items.map((label, index) => (
        <div
          key={`${label}-${index}`}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          role="option"
          aria-selected={selectedIndex === index}
          className={`option-wheel__item${selectedIndex === index ? " option-wheel__item--selected" : ""}`}
          onClick={() => handleItemClick(index)}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
