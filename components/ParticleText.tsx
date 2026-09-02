"use client";

import React, { useEffect, useRef, useState } from "react";
import "./ParticleText.css";

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export interface ParticleTextProps {
  text: string;
  className?: string;
  color?: string;
  highlightColor?: string;
  particleSize?: number;
  gap?: number;
  hoverRadius?: number;
  hoverStrength?: number;
  returnSpeed?: number;
  friction?: number;
}

const PAD_X = 140;
const PAD_Y = 100;

export default function ParticleText({
  text,
  className = "",
  color = "#ffffff",
  highlightColor = "#ffffff",
  particleSize = 1.6,
  gap = 2.5,
  hoverRadius = 85,
  hoverStrength = 4.8,
  returnSpeed = 0.08,
  friction = 0.88,
}: ParticleTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -1000,
    y: -1000,
    active: false,
  });

  const [textDimensions, setTextDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const computed = window.getComputedStyle(container);
      const fontSize = parseFloat(computed.fontSize) || 48;
      const fontFamily = computed.fontFamily || "var(--font-display), sans-serif";
      const fontWeight = computed.fontWeight || "700";

      const offscreen = document.createElement("canvas");
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;

      offCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const metrics = offCtx.measureText(text);
      const textWidth = Math.ceil(metrics.width);
      const textHeight = Math.ceil(fontSize * 1.25);

      setTextDimensions({ width: textWidth, height: textHeight });
    };

    measure();

    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(container);

    return () => ro.disconnect();
  }, [text]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || textDimensions.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const textW = textDimensions.width;
    const textH = textDimensions.height;

    const totalW = textW + PAD_X * 2;
    const totalH = textH + PAD_Y * 2;

    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = `${totalW}px`;
    canvas.style.height = `${totalH}px`;
    canvas.style.left = `-${PAD_X}px`;
    canvas.style.top = `-${PAD_Y}px`;

    // 1. Render text on offscreen canvas with padding offset
    const offscreen = document.createElement("canvas");
    offscreen.width = totalW;
    offscreen.height = totalH;
    const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
    if (!offCtx) return;

    const computed = window.getComputedStyle(container);
    const fontSize = parseFloat(computed.fontSize) || 48;
    const fontFamily = computed.fontFamily || "var(--font-display), sans-serif";
    const fontWeight = computed.fontWeight || "700";

    offCtx.fillStyle = "#ffffff";
    offCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    offCtx.textBaseline = "middle";
    offCtx.textAlign = "left";
    offCtx.fillText(text, PAD_X, PAD_Y + textH * 0.52);

    const imgData = offCtx.getImageData(0, 0, totalW, totalH);
    const pixels = imgData.data;

    // 2. Generate particles from text alpha mask
    const newParticles: Particle[] = [];
    const step = Math.max(2, gap);

    for (let y = PAD_Y - 10; y < PAD_Y + textH + 10; y += step) {
      for (let x = PAD_X - 10; x < PAD_X + textW + 10; x += step) {
        const index = (Math.floor(y) * totalW + Math.floor(x)) * 4;
        const alpha = pixels[index + 3];

        if (alpha > 50) {
          newParticles.push({
            x: x + (Math.random() - 0.5) * 2,
            y: y + (Math.random() - 0.5) * 2,
            originX: x,
            originY: y,
            vx: 0,
            vy: 0,
            size: particleSize,
            color: color,
            alpha: 1.0,
          });
        }
      }
    }

    particlesRef.current = newParticles;

    // 3. Animation loop with generous unclipped boundary
    let rafId = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const hasMouse = mouseRef.current.active;
      const r2 = hoverRadius * hoverRadius;

      const particles = particlesRef.current;
      const len = particles.length;

      for (let i = 0; i < len; i++) {
        const p = particles[i];

        // Interaction repulsion from cursor
        if (hasMouse) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist2 = dx * dx + dy * dy;

          if (dist2 < r2 && dist2 > 0.001) {
            const dist = Math.sqrt(dist2);
            const force = (1 - dist / hoverRadius) * hoverStrength;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Spring return force back to original glyph position
        const fx = (p.originX - p.x) * returnSpeed;
        const fy = (p.originY - p.y) * returnSpeed;

        p.vx = (p.vx + fx) * friction;
        p.vy = (p.vy + fy) * friction;

        p.x += p.vx;
        p.y += p.vy;

        // Render particle
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      rafId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [textDimensions, text, color, highlightColor, particleSize, gap, hoverRadius, hoverStrength, returnSpeed, friction]);

  const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  return (
    <span
      ref={containerRef}
      className={`particle-text-wrapper ${className}`.trim()}
      style={{
        width: textDimensions.width ? `${textDimensions.width}px` : "auto",
        height: textDimensions.height ? `${textDimensions.height}px` : "auto",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} className="particle-text-canvas" aria-label={text} />
      <span className="particle-text-fallback" aria-hidden="true">
        {text}
      </span>
    </span>
  );
}
