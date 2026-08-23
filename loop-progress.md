# Design loop — progress

**Goal:** Zeal placed across the site as an explainer that points at and annotates content.
**Bar:** duolingo.com → `bar.md` (M1–M9; M4 knowingly waived, M9 outranks the rest)
**Credit ceiling:** 100. **Used so far: 43.**

---

## Pieces

| # | Piece | Status |
|---|---|---|
| 1 | Static pose set | **Done** — 5 poses, ~97% optimised, anchors on the 2 directional ones |
| 2 | Placement + looping idle | **Done** — at the CTA, not the hero. See foot of file |
| 3 | Section explainer placements | Round 4 — 5/8 pass (was 3). Process cut |
| 4 | Reactive companion | **Done** — scroll, hover, contact modal |
| — | M9 — Zeal helping a person | **Done** — the `Helping` section |

---

## Piece 1 — Round 1

**Built:** one pose (`pointing`), generated from two character references via
`nano_banana_pro`, background removed, trimmed and optimised 4169 KB → 107 KB
(−97%), placed in the Services section pointing at the services list.

**Pipeline: proven.** generate → cutout → optimise → component → placed → renders.
Character fidelity is high — stripes, muzzle, eyes, toe pads and tail cubes all
survived. Two variants generated; v1 chosen because v2 drifted on the forehead
marking and ear shape.

### Critic verdicts

| Critic | Verdict |
|---|---|
| Craft | **FAIL** |
| Brief | not yet run — deferred, see note |
| System | not yet run — deferred, see note |

*Brief and System were not run: Craft failed decisively on 6 of 8 mechanisms, and
running two more critics against a build already known to need rebuilding spends
their runs for feedback that would be superseded. They run on round 2.*

### Craft critic, per mechanism

| | Verdict | Evidence |
|---|---|---|
| M1 no copy overlap | PASS | Zeal 190–472, list starts 536. Constant 64px gutter across the whole scroll range |
| M2 ≥2× next largest | PASS | 282×360 vs 124px largest neighbour. Ratio 2.9–4.1× |
| M3 satellites carry meaning | **FAIL** | Zero satellites. Wrapper contains only the `<img>`. Reference carries ~10 |
| M4 one hue per object | **FAIL** | Same blue gradient repeated across 6 shards, the cube stack and a glow |
| M5 breaks container | **FAIL** | Entirely inside `.services__void`, right edge flush at 472. Breaks nothing |
| M6 flat ground | **FAIL** | A 451px glow at 50% opacity ramps across his head/shoulders. Rim light never actually landed; drop-shadow is *black* on a near-black ground |
| M7 copy on flat ground | **FAIL** | Cube cluster sat on body copy at 8 of 9 sampled scroll positions — physically obscuring words |
| M8 pose has a target | **FAIL** | Fingertip resolves to y≈604, in the 48px dead gutter between rows 03 and 04. Nothing is highlighted, nothing responds |

**Verdict on the blind comparison:** the reference, and not narrowly. *"Ours has a
well-behaved mascot that respects its gutter and nothing else."*

**Single biggest gap named:** *Zeal's point has no target.* Align the fingertip to a
specific row's heading baseline, and make that row visibly respond — active state,
or a short leader from fingertip to the row's left edge.

---

## Gap history

| Round | Gap | Status |
|---|---|---|
| 1 | Cube traversed the services list, obscuring copy (M7) | **Fixed** — waypoint kept left of 20vw for the whole Work→Services→Process run, so it never crosses. *Fix not yet visually verified: the browser pane stopped compositing.* |
| 1 | The point has no target (M8) | Open — round 2 |
| 1 | No satellite objects (M3) | Open — round 2 |
| 1 | Doesn't break its container (M5) | Open — round 2 |
| 1 | Glow ramps across the silhouette; no real rim separation (M6) | Open — round 2 |
| 1 | One accent hue smeared, not a per-object set (M4) | Open — round 2 |

---

## Notes for round 2

- **M7 fix caution.** Moving the cube right to free the left column caused the
  regression: the stack *travels* between waypoints, it does not teleport. Any
  future waypoint change has to consider the path, not just the endpoints.
- **M8 and M3 are the same problem.** A target and a payload are two views of
  "Zeal is doing a job". Solve them together: give him something to hold or
  present that belongs to the row he points at.
- **M6 needs an art fix, not a CSS fix.** The rim light must be baked into the
  generated pose. Round 1's prompt asked for it and the model under-delivered;
  round 2's prompt should make it the dominant lighting instruction.

---

## Piece 1 — Round 2

**Built:** new pose with the rim light as the dominant prompt instruction and a
glowing module cube in the free hand. Fingertip located programmatically
(rightmost opaque pixel → `poses.json`). `ServicesExplainer` picks the row on a
viewport-fixed sightline, translates Zeal so the fingertip meets that row, draws
a leader from the real fingertip, and the row responds.

### Craft critic — round 2

**VERDICT: FAIL** — but 3 of 8 now pass, up from 2, and **the round-1 named gap
is closed**.

| | R1 | R2 | Note |
|---|---|---|---|
| M1 no copy overlap | PASS | **FAIL** | Regression: he ghosts through the translucent nav on section exit |
| M2 ≥2× | PASS | PASS | 5×–12× |
| M3 satellites carry meaning | FAIL | FAIL | Three featureless squares; they denote nothing |
| M4 one hue each | FAIL | FAIL | Two of three satellites are blue; coral reused by leader and shards |
| M5 breaks container | FAIL | **PASS** | Overhangs the column by 40px — but the edge is invisible, so passes the letter not the spirit |
| M6 flat ground | FAIL | FAIL | Glow ramps across him; rim light does not survive at render size |
| M7 copy on flat ground | FAIL | FAIL | 109px of one glyph run measured directly on a shard |
| M8 pose has a target | FAIL | **PASS** | *"Delete the list and the pose is meaningless, which is the point."* |

**In motion, confirmed working:** leader angle and length recompute per row
(−46° → 0° → +23° → +60°), all five rows tracked, entry clean.

**Named biggest gap:** clamp the sticky range so he never reaches the nav.

### Fixed after the round-2 verdict (no credits — all layout)

| Gap | Fix | Verified |
|---|---|---|
| M1 — ghosts through the nav on exit | Group fades out over the last 160px, well before the header | 0 frames visibly over nav; opacity reaches 0 |
| Leader invisible where it lands | Gradient was opaque at the hand and transparent at the row — reversed | visually confirmed |
| M7 — glyphs set on shards | Shards pinned to the outer margins with `calc()` off the container edge, never a bare `vw` | 0 shards inside the reading column |
| M6 — glow ramps across the ground | Both glows pulled off-canvas and dimmed | — |

**Still open for round 3:** M3 and M4 — the satellites are featureless
translucent squares that denote nothing and repeat hues. These need to become
distinct, meaningful objects, one hue each. That is the next build.

---

## Batch A (pieces 1 + 3) — Round 3

Built all five poses, generalised the explainer, and placed Zeal in Work
(presenting), Services (pointing) and Process (thinking). Cube made hero-only so
it can no longer contest the mid-page voids.

### Craft critic — round 3: **FAIL**

| | Verdict | Evidence |
|---|---|---|
| M1 no copy overlap | **PASS** | Clears all text in all three sections |
| M2 ≥2× largest | FAIL | Zeal ~230px against 310px cards — 0.7×. He is a small figure in a margin |
| M3 satellites carry meaning | FAIL | No payload. Hands empty in all three poses |
| M4 one hue each | FAIL | Two hues repeating; no object-to-colour mapping to count |
| M5 breaks container | FAIL | Never crosses an edge. Bleeds off the viewport left, which reads as cropping |
| M6 flat ground | **PASS** | Rim light works — *"he does not muddy into the background"* |
| M7 copy on flat ground | FAIL | Cube occludes a word in the hero paragraph and smears a Work card |
| M8 pose has a target | FAIL | 2 of 3 pass. Process fails outright |

### Per section

- **Work — earns it.** Connector to the active card; active card advances correctly.
- **Services — earns it, best of the three.** *"The one placement that looks designed."*
- **Process — does not.** Pose byte-identical across all three steps, no connector,
  gaze at nothing. bar.md's stated failure condition verbatim.

### Repetition — answered

**Cut Process.** *"Three consecutive full-height sections with a mascot parked in
the same left gutter trains the eye to stop looking there, and by the third one it
has… Two appearances with genuinely different jobs is restraint; three where the
last one does no job is a tic."*

### New defects found

- **He abandons the last item.** The exit fade removes him exactly as the final
  row/card goes active — the reader gets an empty column at the section's
  conclusion. Both Work and Services.
- **Cube still occludes copy**, in the hero paragraph and one Work card.

### Named biggest gap

**Give Zeal a payload** — one distinct, saturated, single-use object per target
that he physically holds out, swapping as the active target advances. *"His hands
are empty in all three poses, which is why he reads as decoration no matter how
good the tracking is: the gesture points at copy that already carries the
meaning, so nothing is added."* This closes M3 and M4 together and gives the
poses a reason to differ between sections.

---

## Round 4 — payload landed, 5 of 8 pass

| | R1 | R2 | R3 | R4 |
|---|---|---|---|---|
| M1 no copy overlap | PASS | FAIL | PASS | **PASS** |
| M2 largest in group | PASS | PASS | FAIL | **PASS** |
| M3 payload carries meaning | FAIL | FAIL | FAIL | **PASS** (thinnest possible) |
| M4 one hue each | FAIL | FAIL | FAIL | FAIL |
| M5 breaks container | FAIL | PASS | FAIL | **PASS** (untidy) |
| M6 flat ground | FAIL | FAIL | PASS | FAIL |
| M7 copy on flat ground | FAIL | FAIL | FAIL | FAIL |
| M8 pose has a target | FAIL | PASS | FAIL(2/3) | **PASS** |

**The payload worked.** *"Holding an object changes how he reads, and this is a
real improvement, not a claim."* Services verified in motion: five rows, five
props, strict 1:1, cross-fading in scroll order. *"The frame at 0.585 — red
receipt in his open palm, coral leader running to the '02' of Business software —
is the single best frame on the site."*

### Two real bugs found

1. **Work: one card never activates.** `prop-browser` never exceeds 0.5 opacity
   at any scroll position (swept at 0.004 resolution); "Marketing websites" is
   permanently dimmed. A quarter of the grid is dead.
2. **Hero cube over the paragraph** — measured, not estimated: the collision
   window is lap 1.025–1.068, ≈240px of scroll, with up to the full 69px
   paragraph height overlapped and the CTA button clipped. *"A sustained state
   you scroll through at reading speed."*

### Named biggest gap — and a conflict it creates

**Recolour the five props to five distinct hues none of which already appear on
the page.** `prop-audit` and `prop-phone` are the same periwinkle; `prop-browser`
is the exact brand blue of the CTA; receipt and wrench are both the coral of the
leader line.

**This conflicts with design.md.** The critic suggests *"gold, teal, magenta,
lime, violet"*. Potentiaa's palette is deliberately two accents — electric blue
and coral — with magenta reserved as a gradient stop and never a standalone UI
colour. Satisfying M4 as prescribed would break the brand's own colour
discipline. This is exactly the tension the three-critic structure exists to
surface, and it cannot be resolved by the craft critic alone.

---

## Brief critic — first run (after round 4)

The craft critic had taken the build from 2/8 to 5/8. The brief critic read the
same build against what the owner actually asked for, and returned the finding
that reframed the whole run:

> **The bar did not contain the brief.** The words *help*, *people*, *client*,
> *owner* and *person* appear nowhere in `bar.md`. Every round was scored against
> a document that omitted the thing being asked for — so passing it more
> thoroughly each round moved the build further from the ask, not closer.

**The ask, verbatim:** *"somwhere i want my zeal mascot, to be showcased as
helping people, and not just a mascot."*

**What the build actually depicted:** a mascot pointing at a menu. Zeal had a
target (M8) but no **beneficiary**. There was no human being anywhere on the
site, so the art could only ever depict availability, never help.

**The tell was inside the bar the whole time.** M2 reads: *"Duo's head reads
about 250px tall against ~90px human figures in the same cluster."* The reference
scene HAS people in it. The teardown extracted the size ratio and threw the
people away.

### Fixes taken from this critic

| Finding | Action |
|---|---|
| Bar omits the brief | **M9 added** to `bar.md`, outranking M1–M8: *"Somewhere on the page, Zeal must be helping a PERSON. Not a card. Not a row. Not an element. A person."* |
| No human depicted anywhere | New `Helping` section — three scene frames, the first assets in the library with a second character in them |
| *"The CTA is the one moment where a real person is being offered real help, and he is not there"* | Piece 2 placed at the CTA rather than the hero |

### Still open from this critic

| Finding | Status |
|---|---|
| Desktop dimming cost — 3 of 4 Work cards sit half-faded so one can be active | Open |
| `prop-phone` is not readable at its rendered 76px | Open, and now a **real** failure: M4 is waived, so silhouette is the only channel left carrying prop distinction |

---

## M9 — the Helping section

**Built:** `components/sections/Helping.tsx`. Three beats, each a generated scene
of Zeal with a shop owner — at the counter, over the books, on the phone — with a
stage label, a title, body copy, and one line of Zeal's own words. It is
deliberately **not** a case study: no client name, no quote, no numbers. Inventing
testimonials for a consultancy that has not published any would be fabrication,
so the section shows the working relationship instead of claiming outcomes.

Scenes are kept on their flat backgrounds rather than cut out. Cutting two
interacting figures away from the desk and paperwork they are interacting WITH
would destroy the thing that makes them read as help.

---

## Pieces 2 and 4 — placement, idle loop, reactive behaviour

| # | Piece | Status |
|---|---|---|
| 1 | Static pose set | **Done** |
| 2 | Placement + looping idle | **Done** — at the CTA, not the hero |
| 3 | Section explainer placements | Round 4, 5/8. Process cut |
| 4 | Reactive companion | **Done** — scroll, hover, contact modal |
| — | M9 / Helping | **Done** |

**Placement went to the CTA, not the hero**, on the brief critic's argument. The
hero already has the glass cube centre-stage at full size; putting Zeal there
restages the two-objects-one-void fight that cost round 3. At the CTA the cube has
already faded, so there is no contest — and the CTA is where a person is actually
being offered help.

**The idle loop is CSS, and that is a decision, not a shortcut.** Alpha video needs
VP9 *and* HEVC for cross-browser cover — two files — and this page has soft glows
behind him, so a non-alpha video would show its box. `autosprite` is not reachable
through this API path (*"Job set type not supported"*), and this machine has no
ffmpeg to cut a sprite sheet out of a generated mp4. Breathing plus a weight-shift
on a **co-prime period** reads as alive at this size, loops seamlessly, costs
nothing, and stops dead under `prefers-reduced-motion`. A single sine reads as a
bouncing GIF. A richer idle — blink, ear twitch, tail flick — needs a real frame
sequence and a second pipeline; this is honest about being the cheap version that
works.

**Reactive, verified in the browser:**

| Behaviour | Evidence |
|---|---|
| scroll | already tracking; fixed when the `window` scroll listener turned out to fire **zero** times under Lenis |
| hover | hovering *Consulting* pulls him off *Maintenance*; mouseout restores the scroll target. `{hoverWon: true, restoredToScroll: true}` |
| contact modal | greets with `zeal-celebrating`, replacing a gradient circle standing in for a portrait nobody has |

**Credits: 43 of the 100 ceiling.** Pieces 2 and 4 cost nothing — no generation.

**Next:** craft critic, fresh context, on the completed set.
