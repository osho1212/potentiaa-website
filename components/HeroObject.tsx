"use client";

/*
 * UNUSED. Nothing imports this file.
 *
 * The hero object was rendered live for a while - raymarched, with the energy
 * filaments wound around it - and the owner's call is that the hero shows their
 * own render as a picture instead. See components/sections/Hero.
 *
 * Kept rather than deleted because the work is sound and the repo has no
 * version control to recover it from. It costs nothing at runtime: an unimported
 * module is not bundled. Delete the three files together - HeroObject,
 * heroShader, heroTrails - if the picture is the final answer.
 */

import { useEffect, useRef, useState } from "react";
import { FRAGMENT_SHADER, poseMatrix, VERTEX_SHADER } from "@/lib/heroShader";
import {
  buildTrails,
  TRAIL_FRAGMENT_SHADER,
  TRAIL_VERTEX_SHADER,
} from "@/lib/heroTrails";

/**
 * The hero object, rendered live in two passes.
 *
 *   1. the body - one quad, raymarched (lib/heroShader);
 *   2. the energy filaments - ribbons, added on top (lib/heroTrails).
 *
 * Both write gl_FragDepth from the same mapping, so the filaments sort against
 * the body properly rather than being painted over it.
 *
 * Raw WebGL2, no three.js. The whole scene is one quad and some ribbons, so a
 * scene graph would be dead weight, and importing three would take the homepage
 * from 21kB to over 150kB for an object that never needs a camera object, a
 * light or a mesh.
 *
 * PROGRESSIVE, in that order:
 *
 *   1. the still renders immediately and is the LCP candidate, so the fold is
 *      never empty and never reflows;
 *   2. if WebGL2 is available the canvas fades in over it and takes over;
 *   3. if it is not - old hardware, a blocked context, a driver that refuses a
 *      shader - nothing happens and the still is what the visitor gets. There
 *      is no error state to design, because the fallback is already on screen.
 */

/** The still. Also the fallback, so it stays in the markup either way. */
const HERO_STILL = "/assets/hero/module.webp";

/**
 * Ceiling on the backing store's longest side.
 *
 * Raymarching costs per PIXEL and the cost is quadratic in this number, so it
 * is the only performance lever that matters. 1200 covers a 2x display outright
 * and leaves a 3x one marginally soft on a curve, which is invisible next to
 * the cost of the third of a million extra pixels it would take to fix.
 */
const MAX_PIXELS = 1200;

export default function HeroObject() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false, // the body antialiases analytically - see COVERAGE
      depth: true, // the filaments sort against the body
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        // Not thrown. A driver that will not take a shader is a reason to leave
        // the still on screen, not a reason to break the page.
        console.warn("[HeroObject]", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const link = (vertexSource: string, fragmentSource: string) => {
      const vs = compile(gl.VERTEX_SHADER, vertexSource);
      const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
      if (!vs || !fs) return null;

      const program = gl.createProgram()!;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn("[HeroObject]", gl.getProgramInfoLog(program));
        return null;
      }
      return program;
    };

    const body = link(VERTEX_SHADER, FRAGMENT_SHADER);
    const trails = link(TRAIL_VERTEX_SHADER, TRAIL_FRAGMENT_SHADER);
    if (!body || !trails) return;

    // ---- Pass 1: one triangle that covers the viewport --------------------
    const bodyVao = gl.createVertexArray();
    gl.bindVertexArray(bodyVao);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPosition = gl.getAttribLocation(body, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(body, "uResolution");
    const uBodySpin = gl.getUniformLocation(body, "uSpin");

    // ---- Pass 2: the filaments -------------------------------------------
    const geometry = buildTrails();
    const trailVao = gl.createVertexArray();
    gl.bindVertexArray(trailVao);
    const ribbon = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ribbon);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.data, gl.STATIC_DRAW);

    const bytes = geometry.stride * 4;
    const attribute = (name: string, size: number, offset: number) => {
      const location = gl.getAttribLocation(trails, name);
      if (location < 0) return;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, bytes, offset * 4);
    };
    attribute("aPos", 3, 0);
    attribute("aNext", 3, 3);
    attribute("aSide", 1, 6);
    attribute("aT", 1, 7);
    attribute("aSeed", 1, 8);
    attribute("aHue", 3, 9);

    const uTrailSpin = gl.getUniformLocation(trails, "uSpin");
    const uAspect = gl.getUniformLocation(trails, "uAspect");
    const uTime = gl.getUniformLocation(trails, "uTime");
    const uMotion = gl.getUniformLocation(trails, "uMotion");

    gl.bindVertexArray(null);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motion = reduced ? 0 : 1;

    // ---- Size -------------------------------------------------------------
    let width = 0;
    let height = 0;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return false;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.min(1, MAX_PIXELS / (Math.max(box.width, box.height) * dpr));

      const w = Math.max(1, Math.round(box.width * dpr * scale));
      const h = Math.max(1, Math.round(box.height * dpr * scale));
      if (w === width && h === height) return false;

      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      return true;
    };

    const draw = (seconds: number) => {
      const spin = poseMatrix(seconds, motion);

      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // Body: writes colour and depth, no blending.
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.useProgram(body);
      gl.uniform2f(uResolution, width, height);
      gl.uniformMatrix3fv(uBodySpin, false, spin);
      gl.bindVertexArray(bodyVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Filaments: tested against the body's depth but not writing their own,
      // so overlapping ribbons accumulate instead of clipping each other, and
      // added rather than blended, because light adds.
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(trails);
      gl.uniformMatrix3fv(uTrailSpin, false, spin);
      gl.uniform1f(uAspect, width / height);
      gl.uniform1f(uTime, seconds);
      gl.uniform1f(uMotion, motion);
      gl.bindVertexArray(trailVao);
      gl.drawArrays(gl.TRIANGLES, 0, geometry.vertexCount);

      gl.bindVertexArray(null);
    };

    // ---- Loop -------------------------------------------------------------
    //
    // Only while the object is on screen. The hero is one viewport tall on a
    // page that scrolls forever, so a visitor reading the rest of it would
    // otherwise pay for a raymarcher rendering to nothing.
    let raf = 0;
    let running = false;
    const started = performance.now();

    const tick = (now: number) => {
      resize();
      draw((now - started) / 1000);
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      // Reduced motion gets one frame and no loop: the pose is fixed and the
      // flow is stopped, so a loop would redraw an identical image forever.
      if (reduced) {
        resize();
        draw(0);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    draw(0);
    setLive(true);

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: "120px" },
    );
    observer.observe(canvas);

    const onResize = () => {
      if (resize() && !running) draw(0);
    };
    window.addEventListener("resize", onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      gl.deleteProgram(body);
      gl.deleteProgram(trails);
      gl.deleteBuffer(quad);
      gl.deleteBuffer(ribbon);
      gl.deleteVertexArray(bodyVao);
      gl.deleteVertexArray(trailVao);
    };
  }, []);

  return (
    <div className="hero__art" data-live={live ? "" : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="hero__art-still"
        src={HERO_STILL}
        alt="Potentiaa's three modules, welded into one rising form"
        width={1535}
        height={1600}
        decoding="async"
        fetchPriority="high"
      />
      <canvas ref={canvasRef} className="hero__art-canvas" aria-hidden="true" />
    </div>
  );
}
