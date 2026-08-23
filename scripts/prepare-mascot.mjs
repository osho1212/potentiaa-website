/**
 * Prepare generated Zeal poses for the web, and record where his finger is.
 *
 * Higgsfield returns ~1792x2400 PNGs at 4+ MB with a lot of transparent margin
 * around the character. Shipping those directly would be absurd, and the loose
 * margin also makes poses impossible to position consistently: every pose would
 * sit at a different offset inside its own box.
 *
 * This does four things:
 *   1. trim      - crop fully transparent edges, so the file's bounding box IS
 *                  the silhouette. Positioning then works off the character
 *                  rather than off arbitrary padding.
 *   2. resize    - cap the long edge; nothing renders larger than ~520 CSS px
 *                  and we serve 2x for retina.
 *   3. webp      - alpha-preserving, roughly a tenth of the PNG.
 *   4. ANCHOR    - find the fingertip and write it to poses.json.
 *
 * Step 4 is why this script matters more than filesize. bar.md M8 requires a
 * pose to have a target, and the craft critic failed round 1 because the
 * fingertip landed in a dead gutter between two rows. You cannot align to a
 * target by eye across responsive layouts - the component needs the real
 * coordinate. The fingertip is found as the rightmost opaque pixel, which is
 * exactly what it is in a pose that points right.
 *
 * Usage:  node scripts/prepare-mascot.mjs
 * Reads   public/assets/mascot/generated/*.png
 * Writes  public/assets/mascot/*.webp  and  public/assets/mascot/poses.json
 */

import sharp from "sharp";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "public", "assets", "mascot", "generated");
const OUT = path.join(process.cwd(), "public", "assets", "mascot");

/** Long edge in px. 2x the largest size any pose is rendered at on the page. */
const MAX_EDGE = 1040;

/** Alpha above which a pixel counts as part of the character, not a soft edge. */
const OPAQUE = 160;

const kb = (n) => `${Math.round(n / 1024)} KB`;

/**
 * Rightmost strongly-opaque pixel. In a pose that points right this is the
 * fingertip; the search is bounded to the upper 70% of the figure so a tail or
 * a foot flicked out to the right can never win.
 */
async function findFingertip(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const limit = Math.floor(height * 0.7);

  for (let x = width - 1; x >= 0; x -= 1) {
    for (let y = 0; y < limit; y += 1) {
      if (data[(y * width + x) * channels + 3] >= OPAQUE) {
        return { x, y };
      }
    }
  }
  return null;
}

const files = (await readdir(SRC)).filter((f) => f.endsWith(".png"));

if (files.length === 0) {
  console.log("No PNGs in", SRC);
  process.exit(0);
}

await mkdir(OUT, { recursive: true });

const manifest = {};

for (const file of files) {
  const from = path.join(SRC, file);
  const name = file.replace(/\.png$/, "");
  const to = path.join(OUT, `${name}.webp`);

  const before = statSync(from).size;

  // trim() with a transparent background removes fully-transparent borders.
  // Threshold 1 rather than 0: the background remover leaves a few near-zero
  // alpha pixels at the edge which would otherwise defeat the trim.
  const trimmed = await sharp(from)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .toBuffer();

  const meta = await sharp(trimmed).metadata();

  const resized = await sharp(trimmed)
    .resize({
      width: meta.width >= meta.height ? MAX_EDGE : undefined,
      height: meta.height > meta.width ? MAX_EDGE : undefined,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();

  const final = await sharp(resized).metadata();
  const tip = await findFingertip(resized);

  const info = await sharp(resized)
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(to);

  manifest[name] = {
    src: `/assets/mascot/${name}.webp`,
    width: final.width,
    height: final.height,
    // Stored as fractions so the component can scale to any rendered height.
    fingertip: tip
      ? { x: +(tip.x / final.width).toFixed(4), y: +(tip.y / final.height).toFixed(4) }
      : null,
  };

  const pct = Math.round((1 - info.size / before) * 100);
  console.log(
    `${file}\n  ${meta.width}x${meta.height} -> ${final.width}x${final.height}` +
      `   ${kb(before)} -> ${kb(info.size)}  (-${pct}%)` +
      `\n  fingertip: ${tip ? `${tip.x},${tip.y}  (${manifest[name].fingertip.x}, ${manifest[name].fingertip.y})` : "NOT FOUND"}`,
  );
}

await writeFile(path.join(OUT, "poses.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("\nwrote poses.json");

/* ---------------------------------------------------------------------------
 * Props: the objects Zeal holds out.
 *
 * Same trim-and-shrink treatment, but deliberately NO aim anchor - a receipt
 * has no fingertip. They live in their own folder and their own manifest so
 * nothing can accidentally try to point with one. They render at ~70px on
 * screen, so the size cap is far smaller than a pose's.
 * ------------------------------------------------------------------------- */
const PROPS_SRC = path.join(SRC, "props");
const PROPS_OUT = path.join(OUT, "props");
const PROP_EDGE = 320;

let propFiles = [];
try {
  propFiles = (await readdir(PROPS_SRC)).filter((f) => f.endsWith(".png"));
} catch {
  propFiles = [];
}

if (propFiles.length > 0) {
  await mkdir(PROPS_OUT, { recursive: true });
  const props = {};

  for (const file of propFiles) {
    const from = path.join(PROPS_SRC, file);
    const name = file.slice(0, -4);
    const to = path.join(PROPS_OUT, name + ".webp");
    const before = statSync(from).size;

    const trimmed = await sharp(from)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
      .toBuffer();

    const info = await sharp(trimmed)
      .resize({ width: PROP_EDGE, height: PROP_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 92, alphaQuality: 100, effort: 6 })
      .toFile(to);

    props[name] = {
      src: "/assets/mascot/props/" + name + ".webp",
      width: info.width,
      height: info.height,
    };
    console.log(`${file}  ${kb(before)} -> ${kb(info.size)}   ${info.width}x${info.height}`);
  }

  await writeFile(path.join(OUT, "props.json"), JSON.stringify(props, null, 2) + "\n");
  console.log("wrote props.json");
}

/* ---------------------------------------------------------------------------
 * Scenes: Zeal with a person.
 *
 * These exist because bar.md M9 - "somewhere Zeal must be helping a PERSON" -
 * cannot be satisfied by any amount of positioning code. Every other asset in
 * this library is a solo cut-out, so the art could only ever depict
 * availability, never help. These are the only frames with a second character
 * in them.
 *
 * The flat backdrop is REMOVED, but the props are not. Earlier rounds kept the
 * whole frame because "cutting two interacting figures apart from the desk they
 * are interacting WITH would destroy what makes them read as help" - which is
 * true of the desk and false of the empty backdrop behind it. Keeping both cost
 * two mechanisms: the scene sat in a rounded, bordered, overflow-hidden box
 * (M5 forbids exactly that) on its own studio grey (M6 wants one flat value,
 * and the page already is one).
 *
 * So the backdrop goes and everything the figures touch stays. It is a BORDER
 * FLOOD FILL, not a colour key, and that distinction is load-bearing: the
 * backdrop is rgb(29,35,61) and the leopard's deepest shadows come within 12 of
 * it, so keying on colour alone punches holes through the character. Filling
 * inward from the edges can only ever reach pixels connected to the outside, so
 * interior shadows are unreachable by construction.
 * ------------------------------------------------------------------------- */

/**
 * Replace the flat studio backdrop with transparency.
 *
 * Seeded from all four edges, 4-connected, with a soft band above the hard
 * tolerance so the cut edge carries partial alpha instead of aliasing into a
 * hard jaggy line against the page.
 */
async function cutBackdrop(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });

  const { width: W, height: H, channels: C } = info;
  const at = (x, y) => (y * W + x) * C;

  // The backdrop colour, taken as the median of the four corners rather than
  // one of them - a single corner can sit inside a lighting falloff.
  const corners = [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]].map(([x, y]) => {
    const i = at(x, y);
    return [data[i], data[i + 1], data[i + 2]];
  });
  const bg = [0, 1, 2].map((ch) => {
    const vals = corners.map((c) => c[ch]).sort((a, b) => a - b);
    return (vals[1] + vals[2]) / 2;
  });

  const HARD = 60;   // below this distance: certainly backdrop
  const SOFT = 130;  // above this: certainly not

  // A GLOBAL key, not a flood fill, and the difference is the desk.
  //
  // The first version filled inward from the borders, which is the right answer
  // when the backdrop is a colour the subject also contains - these scenes were
  // first generated on dark navy, where the leopard's own shadows came within
  // 12 units of the background, and a global key punched holes straight through
  // him. Connectivity was the only thing separating the two.
  //
  // But connectivity cannot reach an ENCLOSED region, and it showed: the gap
  // between the desk legs and the man's legs kept its green, a bright patch
  // sitting in the middle of the finished art.
  //
  // Regenerating on a chroma green backdrop removed the reason for the flood
  // fill. Nothing in these frames is green - navy leopard, cream apron, wood,
  // cardboard, skin - so the nearest subject colour is hundreds of units away
  // and a global key cannot take anything it should not. Enclosed regions go
  // with everything else.
  let cleared = 0;
  for (let i = 0; i < data.length; i += C) {
    const d = Math.hypot(
      data[i] - bg[0],
      data[i + 1] - bg[1],
      data[i + 2] - bg[2],
    );

    // Distance alone misses backdrop that is in SHADOW - the strip under the
    // desk where the figures cast onto it is the same green at half the value,
    // far enough away in RGB to survive the threshold and near enough to the
    // subject to read as a lime sliver between the man's shoes. So also key on
    // HUE: nothing in these frames is green-dominant, so any pixel where green
    // clearly beats both other channels is backdrop at some exposure.
    const greenDominant =
      data[i + 1] > data[i] * 1.25 && data[i + 1] > data[i + 2] * 1.25;

    if (d <= HARD || greenDominant) {
      data[i + 3] = 0;
      cleared += 1;
    } else if (d < SOFT) {
      // Feather band: alpha ramps across HARD..SOFT so the silhouette keeps its
      // antialiased edge instead of gaining a hard jagged one.
      data[i + 3] = Math.round(((d - HARD) / (SOFT - HARD)) * 255);
    }
  }

  // De-spill. Antialiased edge pixels are part subject, part backdrop, so on a
  // green screen they carry a green cast that survives the cut and shows as a
  // lime rim once the art sits on midnight. Clamping green to the mean of the
  // other two channels on any pixel that is not fully opaque removes the cast
  // without touching anything genuinely green - and nothing here is.
  for (let i = 0; i < data.length; i += C) {
    if (data[i + 3] === 255) continue;
    const neutral = (data[i] + data[i + 2]) / 2;
    if (data[i + 1] > neutral) data[i + 1] = neutral;
  }

  return {
    buffer: await sharp(data, { raw: { width: W, height: H, channels: C } })
      .png()
      .toBuffer(),
    cleared,
    total: W * H,
    bg: bg.map(Math.round),
  };
}
const SCENES_SRC = path.join(SRC, "scenes");
const SCENES_OUT = path.join(OUT, "scenes");
const SCENE_EDGE = 1400;

let sceneFiles = [];
try {
  sceneFiles = (await readdir(SCENES_SRC)).filter((f) => f.endsWith(".png"));
} catch {
  sceneFiles = [];
}

if (sceneFiles.length > 0) {
  await mkdir(SCENES_OUT, { recursive: true });
  const scenes = {};

  for (const file of sceneFiles) {
    const from = path.join(SCENES_SRC, file);
    const name = file.slice(0, -4);
    const to = path.join(SCENES_OUT, name + ".webp");
    const before = statSync(from).size;

    const cut = await cutBackdrop(from);

    const info = await sharp(cut.buffer)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
      .resize({ width: SCENE_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100, effort: 6 })
      .toFile(to);

    console.log(
      `  backdrop rgb(${cut.bg}) removed: ` +
        `${Math.round((cut.cleared / cut.total) * 100)}% of the frame`,
    );

    scenes[name] = {
      src: "/assets/mascot/scenes/" + name + ".webp",
      width: info.width,
      height: info.height,
    };
    console.log(`${file}  ${kb(before)} -> ${kb(info.size)}   ${info.width}x${info.height}`);
  }

  await writeFile(path.join(OUT, "scenes.json"), JSON.stringify(scenes, null, 2) + "\n");
  console.log("wrote scenes.json");
}
