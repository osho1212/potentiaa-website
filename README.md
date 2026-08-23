# Potentiaa — marketing website

An award-style scroll experience for Potentiaa, built on the structural pattern
of [redis.agency](https://redis.agency/en): a single dark canvas, one 3D object
that travels the whole page, and content that arrives around it.

The object here is Potentiaa's own mark — three modules in midnight, electric
blue and coral, connected corner to corner into a staircase, rendered as liquid
glass and pre-baked into a turntable that plays back on canvas. And the page
never ends: it loops forever.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript |
| Smooth scroll | [Lenis](https://github.com/darkroomengineering/lenis) |
| Scroll choreography | plain rAF, driven by `lib/scrollState.ts` |
| Hero element | HTML5 canvas image sequence (90 WebP frames) |
| Frame generation | Three.js, in-browser, at `/studio` |
| Styling | Plain CSS + custom properties from `design.md` |

No CSS framework, and no animation library — GSAP came out when the loop went
in, because ScrollTrigger assumes a monotonic document progress and breaks on
the wrap. Every colour, size, radius and shadow comes from
`styles/tokens.css`, which is a direct transcription of `design.md`. Nothing
in `app/` or `components/` hardcodes a hex or a pixel value.

---

## The hero frame sequence

The homepage does **not** run live WebGL. It plays a pre-rendered 360° turntable
on a 2D canvas, with the frame index scrubbed by scroll position — the same
technique as the reference site, and for the same reason: near-zero GPU cost, so
it holds up on the cheap Android phones a lot of the audience will be on.

### Generating the frames

The sequence **is committed**, so a fresh clone renders correctly with no extra
step. Regenerate it whenever you change the geometry, materials or
`FRAME_COUNT`:

```bash
npm run dev
```

Then open http://localhost:3000/studio and click **Render 90 frames**.

The studio builds the module stack in Three.js under an **orthographic** camera,
so the cubes read as flat-sided solids with no perspective distortion. The angle
is a shallow front three-quarter (~15° azimuth and elevation), not the corner-on
(1,1,1) isometric: from the corner the stack reads as three blocks on a
diagonal, whereas front-on it unmistakably reads as stairs — which matters
because frame 0 is the pose the homepage hero rests on.

### Liquid glass

Each module is a solid **core** wrapped in a transmissive **glass shell**.
That pairing is the whole trick. `transmission` bends whatever sits behind the
surface, sampled from the opaque pass — and the core is exactly that. Looking
through the shell you see the core's edges refracted, magnified and split by
`dispersion`, which is the light-bending that a flat tinted material cannot
give at any opacity.

An earlier attempt used `transmission` with **nothing** behind the glass. These
frames bake onto a transparent background, so it sampled empty space and came
out as grey smoke. The core is the fix: it gives the refraction a subject, and
being opaque it carries the colour hard.

Two traps worth knowing if you retune it:

- **Do not tint the shell the same colour as the core.** Absorbing through
  matching glass multiplies the colour by itself — midnight `#1A3688` came out
  `rgb(3,11,73)`, a black cube on a near-black page. `attenuationColor` is the
  brand hue pulled halfway to white so the product lands back on the hue rather
  than its square.
- **Tone mapping is not neutral.** ACES Filmic characteristically pushes
  saturated blues toward magenta, which turned electric blue `#265DFF` violet
  once the emissive core drove it bright. The renderer uses
  `NeutralToneMapping`, which holds hue.

Depth ordering is handled by drawing all three cores first and all three shells
after, so no shell samples a core that has not been drawn yet.

There are no joiner cubes. The modules touch directly, the top-right vertical
edge of one meeting the bottom-left edge of the next, using the `STEP` constant:

```
step = S - r(2 - √2)
```

That is **not** simply the edge length `S`. These are rounded boxes — near a
vertical edge the surface is a cylinder of radius `r` set in from the corner, so
stepping by exactly `S` leaves a visible gap between the shoulders. The formula
collapses to `S` for a sharp cube (`r = 0`) and to `S/√2` for a sphere
(`r = S/2`), so it holds at both ends. Step much smaller and the cubes
interpenetrate, which shows badly through glass.

The tint lives in `color` + `opacity`, deliberately **not** in `transmission` —
transmission refracts whatever sits behind the glass, and these frames render
onto a transparent background, so a transmissive cube bakes out as grey smoke.

It spins the stack through one revolution and POSTs each frame to
`/api/save-frame`, which writes it to
`public/assets/module-frames/frame_0000.webp` … `frame_0089.webp`. Takes about
15 seconds and produces roughly 1.1 MB total.

`/api/save-frame` refuses to run when `NODE_ENV !== "development"`, so it cannot
write to disk on a deployed site.

If the frames are missing, the homepage falls back to the flat vector mark and
shows a link to `/studio` rather than rendering an empty box.

### Photoreal frames instead

`scripts/blender_module_stack.py` builds the same scene in Blender with Cycles —
real soft shadows and proper material response, which is what gives the
reference site its weight.

```bash
blender --background --python scripts/blender_module_stack.py
```

It writes to the same folder with the same filenames, so it is a drop-in
replacement. No code changes needed.

### Changing the choreography

`lib/frames.ts` holds everything tunable:

- `FRAME_COUNT` / `FRAME_SIZE` — change either and **re-render**, or the player
  will request frames that do not exist.
- `FRUSTUM` (in `app/studio/page.tsx`) — how much of the frame the artwork
  fills, and therefore how big the hero looks on the page. It pairs with
  `--stack-size` in `globals.css`, which sets the element the sprite is drawn
  into; the on-screen size is the product of the two.
- `WAYPOINTS` — where the stack sits at each point in a lap. `at` is progress
  through one lap (0 = top, 1 = the end of it); the stack eases between
  consecutive waypoints. Reading the array top to bottom is reading the
  choreography down the page.

  **The first and last waypoint must match.** The page loops, so progress 1 and
  progress 0 are the same moment on screen — the reader is crossing from the end
  of one lap into the start of the next, where the hero begins again. Both are
  centre / full size / no rotation, so the stack comes back to the middle at its
  opening size as the loop comes round. If they differed, it would snap.

---

## Hero sizing, and why it is fussy

The object is `position: fixed` at the viewport centre, while the hero is a
document-flow grid: headline / a band at least `--stack-size` tall / copy /
tagline. Those two only line up while **the hero fits inside 100svh**. Once it
overflows, the band slides down past the fixed object and the headline ends up
underneath it.

So growing the object means shrinking what sits around it. That is why the
hero headline has a deliberately *wide* measure (`max-width: 26ch`) — a narrow
measure costs far more height in extra wrapped lines than a large font size
does — and why there is a `max-height: 760px` guard for laptops and deep
browser toolbars.

**The guard block must stay last in `globals.css`.** Media queries add no
specificity, so it only beats the base `.hero` rules by coming after them in
source order. It is commented to that effect; moving it earlier silently stops
it working, which is exactly what happened while building it.

The hero must also clear the fixed header pill (top `--space-5`, ~64px tall),
hence the generous `padding-block` start value.

---

## The infinite loop

`app/page.tsx` renders the section set **twice**. One copy is a *lap*. Because
the document repeats with a fixed period, any two scroll positions exactly one
lap apart show identical pixels — so `components/SmoothScroll.tsx` lets you
scroll normally and teleports you a lap back whenever you drift out of the
middle band:

```
0            0.5·lap        1.5·lap          2·lap
|---clone-A----|===working band===|----clone-B---|
```

The jump is invisible because the destination looks exactly like the origin.
Half a lap of real content sits either side, so the wrap never happens near a
document edge where the browser would clamp the scroll and expose it.

The lap length is measured as the **gap between the two wrappers' `offsetTop`**,
not the first one's height, and re-measured by a `ResizeObserver`. Web fonts
land after first paint and changed section heights by ~10%; a stale lap length
makes the wrap jump by the wrong amount and the seam becomes visible.

Two values go to `lib/scrollState.ts` for the animated layers:

- `progress` — 0..1 within the lap, wrapped. Drives the hero's waypoints and the
  turntable frame, so both cycle once per lap and close cleanly.
- `distance` — unbounded and signed, wrap jumps discounted.

The clone lap is `aria-hidden` and `inert`, and every section takes a `clone`
prop that drops its `id`, so the document keeps exactly one `<h1>` and one of
each anchor target.

**This is not Lenis's own `infinite: true`.** On a window wrapper that leaves
Lenis's internal scroll unbounded while the browser clamps the real one, and the
two fight until the target runs away.

`DepthField` loops too: each shard travels a whole number of wrap-distances per
lap and rotates a whole number of turns, so after one lap it is exactly back
where it started.

---

## Project layout

```
app/
  layout.tsx           fonts (Sora + Manrope), metadata, OG tags
  page.tsx             section order
  globals.css          all component styling
  studio/page.tsx      frame generator (dev tool, not public)
  api/save-frame/      writes frames to disk (dev only)
components/
  SiteShell.tsx        scroll engine + fixed layers + contact dialog
  ModuleStack.tsx      the canvas sprite player  ← the centrepiece
  DepthField.tsx       loop-safe parallax shards behind the content
  SmoothScroll.tsx     Lenis + the lap wrap
  LogoMark.tsx         the mark, rebuilt as clean vector
  sections/            Hero, Intro, Work, Services, Process, CtaFooter
lib/
  frames.ts            frame + waypoint config
  scrollState.ts       lap progress + distance, written once per frame
  site.ts              all copy
styles/
  tokens.css           design.md, transcribed
  motion.css           marketing-only motion layer (see below)
scripts/
  blender_module_stack.py
```

---

## Deviation from `design.md`

`design.md` §6 governs the **product** UI and says, plainly:

> Animation: fast, functional, never bouncy/spring. **No parallax.**
> Transparency/blur: overlays/scrims only — **never decorative glass.**

This site breaks all three: the module stack drifts on a damped follow, the
depth field parallaxes, the hero is literally decorative glass, and the header
is a frosted pill. That is deliberate — a
marketing site has to hold a cold visitor through one scroll, which is not the
Business App's job.

The deviation is quarantined in `styles/motion.css` and documented at the top of
that file. `styles/tokens.css` is untouched and remains the shared contract.
**Nothing in `motion.css` should be copied into the Business App.**

If you would rather the site obeyed `design.md` literally, delete the
`motion.css` import from `app/globals.css` and drop `DepthField` from
`SiteShell.tsx`.

Under `prefers-reduced-motion`: Lenis does not initialise, the page stops
looping and behaves like an ordinary document, the stack snaps to its waypoints
without damping or bobbing, and the depth field freezes.

---

## Before launch

These are placeholders, all marked `TODO` in source:

- **`lib/site.ts` → `contact.email`** — currently `hello@potentiaa.com`, assumed
  not confirmed.
- **`lib/site.ts` → `trustSlots`** — dashed "Client logo" chips in the marquee.
  Real client marks need permission first; `design.md` §6 rules out stock or
  generated imagery, so nothing there pretends to be a logo.
- **Card image slots** — the gradient panels in the Work section (`data-slot`)
  are waiting on real product screenshots.
- **Contact form** — `ContactModal.tsx` composes a `mailto:` draft. There is no
  form backend. Swap `handleSubmit` for a POST to Resend, Formspree or an API
  route when you want submissions landing somewhere automatically.
- **`metadataBase`** in `app/layout.tsx` assumes `https://potentiaa.com`.
- **OG image** — no `og:image` is set, so link previews will be text-only.

No metrics, client names or testimonials are invented anywhere in the copy.

---

## Notes

The logo files in `../POTENTIAA MIS/assets/potentiaa logo and files/` are traced
JPEGs wrapped in SVG — they blur when scaled and cannot be recoloured. The mark
used here (`components/LogoMark.tsx`) and the 3D geometry in `/studio` were both
redrawn from the brand board, so they are resolution-independent and driven by
the palette tokens.
