"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FRAME_COUNT, FRAME_SIZE } from "@/lib/frames";
import { buildHeroGeometry, buildHeroMaterial, REACH } from "@/lib/heroModel";

/**
 * Frame studio - a local build tool, not part of the public site.
 *
 * Bakes Potentiaa's welded three-module mark (lib/heroModel), tumbles it
 * through one closed loop, and writes every frame to
 * public/assets/module-frames/ via /api/save-frame. That gives
 * ModuleStack.tsx the pre-rendered sequence it plays back on canvas.
 *
 * Re-run this whenever you change FRAME_COUNT, the model or the materials.
 * For photoreal frames instead, render scripts/blender_module_stack.py in
 * Blender and drop its output into the same folder - the filenames match.
 */

const RENDER_SIZE = FRAME_SIZE * 2; // 2x supersample, downscaled on export

/**
 * Half-height of the orthographic view box, in model units.
 *
 * The model reaches REACH (1.40) on both axes, so this is how much of the
 * sprite the artwork fills - and therefore how big the hero reads on the page.
 *
 * The margin is not slack. The y-swing does not change the vertical extent at
 * all, but the z-roll does: a 5 degree roll lifts the top edge's outer end by
 * another 0.10, and at 1.13 that put the coral module within a few pixels of
 * the frame edge at the extremes of the tumble. 1.19 keeps the artwork inside
 * 90% of the frame all the way round, which also leaves the drop-shadow in
 * .module-stack__canvas somewhere to land.
 */
const FRUSTUM = REACH * 1.19;

/**
 * THE TUMBLE.
 *
 * Not a full turntable any more, and that is a consequence of the model rather
 * than a preference. The old mark was three CUBES, so a 360 on Y showed the
 * same mass at every angle. This one is a plate 0.34 deep against a 2.84 span:
 * spin it past 90 degrees and it goes edge-on, and for several frames either
 * side of that the hero is a thin diagonal bar. No tilt fixes it - a rotation
 * about x leaves the plate normal untouched once y has swung it onto the x
 * axis.
 *
 * So it swings instead: a sine on y through +/-58 degrees, which is wide enough
 * to show real depth on the sides of every module and never gets near the
 * vanishing angle. A sine also eases into and out of the extremes on its own,
 * and - the part that matters for the site - it is periodic, so frame 0 and
 * frame 90 are the same pose and the page's loop seam needs no special case.
 *
 * x and z carry smaller offset waves so the object is never simply rocking in
 * one plane. Both complete a whole number of cycles per page, for the same
 * reason.
 */
function poseAt(t: number): { x: number; y: number; z: number } {
  const turn = t * Math.PI * 2;
  return {
    y: Math.sin(turn) * 1.01,
    x: Math.sin(turn * 2) * 0.17,
    z: Math.sin(turn) * 0.09,
  };
}

export default function StudioPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    group: THREE.Group;
  } | null>(null);

  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const say = (line: string) => setLog((prev) => [...prev.slice(-200), line]);

  // Kept in a ref so the animation loop can read it without re-running the effect
  const busyRef = useRef(false);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);


  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true, // required for toDataURL
    });
    renderer.setSize(RENDER_SIZE, RENDER_SIZE, false);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    // Neutral (Khronos PBR neutral), not ACES Filmic. ACES characteristically
    // pushes highly saturated blues toward magenta, which turned electric blue
    // #265DFF violet once the emissive core drove it bright. Neutral holds hue.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;

    // Display at a sane size regardless of the render resolution
    renderer.domElement.style.width = "min(70vh, 520px)";
    renderer.domElement.style.height = "min(70vh, 520px)";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Orthographic, so the modules read as flat-sided solids with no
    // perspective distortion. But NOT the corner-on (1,1,1) isometric angle:
    // from there the staircase reads as three blocks floating on a diagonal.
    // This is a front three-quarter view - front face dominant, top and right
    // just visible - which keeps the plate look while making the stair shape
    // unmistakable at frame 0, the pose the homepage hero rests on.
    const camera = new THREE.OrthographicCamera(
      -FRUSTUM, FRUSTUM, FRUSTUM, -FRUSTUM, 0.1, 100,
    );
    // Swung further round than the old cube version. Cubes show their depth
    // from anywhere; a 0.4-deep plate only shows a side wall in proportion to
    // how far off-axis you stand, and at 14 degrees it was showing 9% of the
    // module width and reading as a flat sticker.
    camera.position.set(3.2, 2.5, 8.8);
    camera.lookAt(0, 0, 0);

    // Procedural studio environment.
    //
    // It mattered for the old glass mark and it matters more now: at
    // metalness 1 the surface has no diffuse term at all, so with no
    // environment the model renders as three black plates with a few specular
    // dots on them. Practically everything you see IS the environment,
    // reflected and roughened.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    const group = new THREE.Group();
    scene.add(group);

    // One mesh, one material - the whole point of the SDF build. See
    // lib/heroModel for the shape and the finish.
    const geometry = buildHeroGeometry();
    const material = buildHeroMaterial();
    const model = new THREE.Mesh(geometry, material);
    group.add(model);

    // Lighting rig.
    //
    // Metal takes almost nothing from ambient - it has no diffuse lobe to lift
    // - so the ambient light that used to sit here has gone and the punctual
    // lights are doing one job each: putting hard, moving speculars on the
    // bevels and the brushed faces. Without them the object is lit purely by a
    // soft room and reads as matte plastic.
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-3.5, 6, 6);
    scene.add(key);

    // Straight down the camera axis, tight and bright. This is the one that
    // lights up the front faces as the model swings, and it is what makes the
    // brushing legible - anisotropic streaks only show where a highlight
    // crosses them.
    const sheen = new THREE.DirectionalLight(0xffffff, 1.9);
    sheen.position.set(1.5, 1.0, 8);
    scene.add(sheen);

    const coralRim = new THREE.DirectionalLight(0xff6a5b, 2.2);
    coralRim.position.set(5, -3, -4);
    scene.add(coralRim);

    const blueFill = new THREE.PointLight(0x265dff, 26, 26);
    blueFill.position.set(-4, 2.5, 4);
    scene.add(blueFill);

    sceneRef.current = { renderer, scene, camera, group };

    let raf = 0;
    const spin = () => {
      if (!busyRef.current) {
        // Preview runs the same closed loop the export bakes, at about 14s a
        // turn, so what you watch here is exactly what lands in the frames.
        const pose = poseAt((performance.now() / 14000) % 1);
        group.rotation.set(pose.x, pose.y, pose.z);
        renderer.render(scene, camera);
      }
      raf = requestAnimationFrame(spin);
    };
    spin();

    return () => {
      cancelAnimationFrame(raf);
      geometry.dispose();
      material.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  /** Downscales the supersampled render to FRAME_SIZE and returns a webp data URL. */
  const exportFrame = (source: HTMLCanvasElement): string => {
    const out = document.createElement("canvas");
    out.width = FRAME_SIZE;
    out.height = FRAME_SIZE;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, FRAME_SIZE, FRAME_SIZE);
    return out.toDataURL("image/webp", 0.92);
  };

  const render = async () => {
    const ctx = sceneRef.current;
    if (!ctx || busy) return;

    setBusy(true);
    busyRef.current = true;
    setProgress(0);
    setLog([]);
    say(`Rendering ${FRAME_COUNT} frames at ${FRAME_SIZE}px...`);

    const { renderer, scene, camera, group } = ctx;

    try {
      for (let i = 0; i < FRAME_COUNT; i += 1) {
        const t = i / FRAME_COUNT;

        const pose = poseAt(t);
        group.rotation.set(pose.x, pose.y, pose.z);

        renderer.render(scene, camera);

        const dataUrl = exportFrame(renderer.domElement);

        const response = await fetch("/api/save-frame", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index: i, dataUrl }),
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(`frame ${i}: ${response.status} ${detail}`);
        }

        setProgress(i + 1);
        if (i % 10 === 0 || i === FRAME_COUNT - 1) say(`  frame ${i + 1}/${FRAME_COUNT}`);

        // Yield so the progress UI can paint
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      say("Done. Frames are in public/assets/module-frames/ - open / to see them.");
    } catch (error) {
      say(`FAILED: ${(error as Error).message}`);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  };

  return (
    <div className="studio">
      <div className="studio__panel">
        <p className="eyebrow">Build tool</p>
        <h1 className="section-title" style={{ fontSize: "var(--fs-xl)" }}>
          Hero frame studio
        </h1>
        <p className="card__body" style={{ marginTop: "var(--space-4)" }}>
          Bakes the welded module mark, tumbles it through one closed loop and writes{" "}
          {FRAME_COUNT} webp frames into <code>public/assets/module-frames/</code>.
          The homepage plays them back on canvas, scrubbed by scroll.
        </p>

        <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)" }}>
          <button type="button" className="btn btn--primary" onClick={render} disabled={busy}>
            {busy ? `Rendering ${progress}/${FRAME_COUNT}` : `Render ${FRAME_COUNT} frames`}
          </button>
          <a className="btn btn--ghost" href="/">
            View site
          </a>
        </div>

        {log.length > 0 && <pre className="studio__log">{log.join("\n")}</pre>}

        <p className="modal__note">
          Dev only - /api/save-frame refuses to run outside development.
        </p>
      </div>

      <div className="studio__stage" ref={mountRef} />
    </div>
  );
}
