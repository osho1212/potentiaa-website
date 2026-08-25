"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * GlassSurface - refractive glass, from React Bits (reactbits.dev).
 *
 * Ported to TypeScript and to this project's CSS convention: the stylesheet
 * lives in styles/glass-surface.css and is imported by app/globals.css with
 * the other sheets, rather than being imported from this file. Next's App
 * Router restricts plain-CSS imports, and every other style on this site is
 * reached the same way.
 *
 * HOW IT WORKS. It builds an SVG displacement map as a data URI - a black
 * field with a red horizontal ramp, a blue vertical ramp, and a blurred bright
 * inset - and runs it through `backdrop-filter: url(#filter)`. The red and
 * blue channels drive x and y displacement, so what is behind the element gets
 * pushed outward near the edges: the way a real lens bends what is behind it.
 * The three colour channels are displaced by slightly different amounts, which
 * is what produces the chromatic fringe at the rim.
 *
 * ONLY THE FLOW CARDS USE THIS. It is deliberately not applied to the glass
 * panel behind them, the header pills, or the modal - see the note in
 * components/HeroLabels. A displacement `backdrop-filter` is far more
 * expensive than a blur, and six small cards is a very different bill from one
 * full-viewport panel.
 */

type Channel = "R" | "G" | "B";

export interface GlassSurfaceProps {
  children?: ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  borderWidth?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  displace?: number;
  backgroundOpacity?: number;
  saturation?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  xChannel?: Channel;
  yChannel?: Channel;
  mixBlendMode?: CSSProperties["mixBlendMode"];
  className?: string;
  style?: CSSProperties;
}

export default function GlassSurface({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  opacity = 0.93,
  blur = 11,
  displace = 0,
  backgroundOpacity = 0,
  saturation = 1,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = "R",
  yChannel = "G",
  mixBlendMode = "difference",
  className = "",
  style = {},
}: GlassSurfaceProps) {
  const uniqueId = useId().replace(/:/g, "-");
  const filterId = `glass-filter-${uniqueId}`;
  const redGradId = `red-grad-${uniqueId}`;
  const blueGradId = `blue-grad-${uniqueId}`;

  const [svgSupported, setSvgSupported] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const redChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const greenChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const blueChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const gaussianBlurRef = useRef<SVGFEGaussianBlurElement>(null);
  const lastDimensionsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const updateDisplacementMap = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      const actualWidth = Math.round(rect?.width || 200);
      const actualHeight = Math.round(rect?.height || 80);

      // Only regenerate if dimensions actually changed significantly (> 4px) to prevent thrashing during smooth morphs
      if (
        Math.abs(actualWidth - lastDimensionsRef.current.w) < 4 &&
        Math.abs(actualHeight - lastDimensionsRef.current.h) < 4 &&
        feImageRef.current?.getAttribute("href")
      ) {
        return;
      }
      lastDimensionsRef.current = { w: actualWidth, h: actualHeight };

      feImageRef.current?.setAttribute("href", generateDisplacementMap(actualWidth, actualHeight));
    };

    const generateDisplacementMap = (actualWidth: number, actualHeight: number) => {
      const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5);

      const svgContent = `
        <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#0000"/>
              <stop offset="100%" stop-color="red"/>
            </linearGradient>
            <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#0000"/>
              <stop offset="100%" stop-color="blue"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
          <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${redGradId})" />
          <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
          <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" />
        </svg>
      `;

      return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
    };

    updateDisplacementMap();
    (
      [
        [redChannelRef, redOffset],
        [greenChannelRef, greenOffset],
        [blueChannelRef, blueOffset],
      ] as const
    ).forEach(([ref, offset]) => {
      const node = ref.current;
      if (!node) return;
      node.setAttribute("scale", (distortionScale + offset).toString());
      node.setAttribute("xChannelSelector", xChannel);
      node.setAttribute("yChannelSelector", yChannel);
    });

    gaussianBlurRef.current?.setAttribute("stdDeviation", displace.toString());

    const node = containerRef.current;
    if (!node) return;
    const resizeObserver = new ResizeObserver(() => {
      updateDisplacementMap();
    });
    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, [
    width,
    height,
    borderRadius,
    borderWidth,
    brightness,
    opacity,
    blur,
    displace,
    distortionScale,
    redOffset,
    greenOffset,
    blueOffset,
    xChannel,
    yChannel,
    mixBlendMode,
    redGradId,
    blueGradId,
  ]);

  useEffect(() => {
    /**
     * Safari and Firefox are excluded by the upstream component: neither
     * supports an SVG filter reference in `backdrop-filter`, and Safari
     * reports that it does. They take the plain-blur fallback instead.
     */
    const supportsSVGFilters = () => {
      if (typeof window === "undefined" || typeof document === "undefined") return false;
      const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      const isFirefox = /Firefox/.test(navigator.userAgent);
      if (isWebkit || isFirefox) return false;
      const probe = document.createElement("div");
      probe.style.backdropFilter = `url(#${filterId})`;
      return probe.style.backdropFilter !== "";
    };
    setSvgSupported(supportsSVGFilters());
  }, [filterId]);

  const containerStyle = {
    ...style,
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    "--glass-frost": backgroundOpacity,
    "--glass-saturation": saturation,
    "--filter-id": `url(#${filterId})`,
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`glass-surface ${svgSupported ? "glass-surface--svg" : "glass-surface--fallback"} ${className}`}
      style={containerStyle}
    >
      <svg className="glass-surface__filter" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
            <feImage ref={feImageRef} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />

            <feDisplacementMap ref={redChannelRef} in="SourceGraphic" in2="map" result="dispRed" />
            <feColorMatrix
              in="dispRed"
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="red"
            />

            <feDisplacementMap ref={greenChannelRef} in="SourceGraphic" in2="map" result="dispGreen" />
            <feColorMatrix
              in="dispGreen"
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="green"
            />

            <feDisplacementMap ref={blueChannelRef} in="SourceGraphic" in2="map" result="dispBlue" />
            <feColorMatrix
              in="dispBlue"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
              result="blue"
            />

            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur ref={gaussianBlurRef} in="output" stdDeviation="0.7" />
          </filter>
        </defs>
      </svg>

      <div className="glass-surface__content">{children}</div>
    </div>
  );
}
