# bar.md — what actually makes the reference good

**Reference:** duolingo.com — homepage hero and the "learn with duolingo" gamification
section. Captured in `public/assets/mascot/Screenshot 2026-08-20 213501.png` and
`…213609.png`, plus my own capture of the top of the page.

**Correction, after the Brief critic (round 4).** The first seven mechanisms below
describe how the reference *places* a character. That is necessary and not
sufficient: it produced a mascot that navigates a page rather than one that helps
anyone. M9 at the foot of this file is the requirement that was missing, and it
outranks the rest — a build can pass M1–M8 and still fail the brief, which is
exactly what happened four times.

**Honest limitation, stated up front.** Duo-as-annotator lives in the lesson UI behind
login. None of the three captures show him pointing at or labelling a control. The
closest thing is the gamification section, where he sits inside a ring of reward
objects that explain the system without words. So mechanisms M1–M7 below are drawn
from *placement, role and restraint* — which is what transfers. Nothing here tells us
how Duo behaves as a step-by-step explainer, and the craft critic must not pretend
otherwise.

---

## Mechanisms

**M1 — The character never overlaps body copy. Ever.**
In the hero, the illustration cluster occupies the left ~45% and all copy plus both
CTAs sit in the right ~40%, with a clear empty gutter between them. In the
gamification section the character sits below the headline and button, never behind
them. *Check: draw a box around all text; the character's silhouette must not enter it.*

**M2 — The character is the largest object in its group, by roughly 2.5–3×.**
Duo's head reads about 250px tall against ~90px human figures in the same cluster.
He is never one item among equals.

*Check: measure the character against the next largest element in ITS OWN
ILLUSTRATION GROUP — its props, satellites and companions. NOT against the page's
content blocks.*

**Clarified after round 3, where two critics read this differently.** In the
reference, Duo is compared to coins and hearts, never to the headline or a
content panel. Applied to our layout the loose reading demands the mascot be
twice the height of a service card, which at our card sizes means ~1140px —
taller than the viewport. That is not what the reference does and not what this
mechanism is for. The character must dominate the things it is holding and
presenting; it does not have to dominate the page.

**M3 — The character is surrounded by small satellite objects, and those objects
carry the meaning.**
The gamification scene has roughly ten satellites — coins, heart, streak flame, gems,
chest, checkmark, dumbbell — each appearing once. They explain the reward system with
no text at all. The character alone would say nothing. *Check: is there a payload the
character is presenting, or is it just standing there?*

**M4 — One saturated accent per satellite, each colour used once.**
Gold coins, one red heart, one orange flame, blue gems, one teal check. No colour
repeats across two different object types. The result reads as a set, not a mess.
*Check: count distinct accent hues; each should appear on exactly one object type.*

> **KNOWINGLY WAIVED for this project. M4 will never pass, and that is a decision,
> not a defect.**
>
> The reference gets its legibility from seven-plus unique hues. Potentiaa's
> palette is deliberately two accents — electric blue and coral — with magenta
> reserved as a gradient stop and never a standalone UI colour (design.md §3).
> Satisfying M4 as written means inventing gold, teal, violet and lime, which
> breaks the brand's own colour discipline to satisfy a mechanism borrowed from a
> brand that made the opposite choice.
>
> Brand discipline wins. Props are distinguished by **silhouette**, not hue — so
> any prop that is not identifiable by shape alone at its rendered size is a real
> failure and must be fixed, because shape is now the only channel carrying the
> distinction. Critics should record M4 as WAIVED rather than FAIL, and judge
> prop legibility under M3 instead.

**M5 — The character breaks its own container.**
Duo bursts out of the top of the phone frame; the green ground wave passes behind him.
Nothing is boxed, cropped to a rectangle, or given a card. *Check: does the silhouette
cross at least one container or section edge?*

**M6 — Flat ground, zero texture behind the character.**
The character sits on plain white or one flat green shape. There is no gradient, no
pattern, no photographic texture competing with the silhouette. *Check: sample the
background immediately around the character; it should be a single flat value.*

**M7 — Copy stays on flat ground, never on illustration.**
Every headline, button label and link sits on plain white. Not one word is set over
the artwork. *Check: no text node overlapping non-background pixels.*

---

## Deliberately NOT adopted

**Duolingo's rendering style.** Duo is flat vector — hard shapes, one darker tone for
shading, no gradients, no soft shadow. Zeal is a rendered 3D toy with soft light,
gradients and ambient occlusion. Copying the flat treatment would mean rebuilding the
mascot, which is not the job. **We adopt Duolingo's placement and role rules, not its
draughtsmanship.**

**Duolingo's light ground.** They work on white; we work on `--midnight-950 #020A24`.
This inverts M6 rather than breaking it: our flat ground is near-black, which means
Zeal needs edge separation the reference never had to solve. Expect a rim light. That
is an addition, not a violation.

---

## Our extra constraint, which the reference does not test

The goal is Zeal as an **explainer that points at and annotates content**. M3 is the
only mechanism that touches this, and only weakly. So one further rule, ours not
theirs:

**M8 — Every placed pose must have a target.**
Zeal points at, holds, presents or reacts to a specific element on the page. A pose
that would read identically with the surrounding content deleted has failed.
*Check: name the element the pose is directed at. If you cannot, it fails.*

**M9 — Somewhere on the page, Zeal must be helping a PERSON.**

Not a card. Not a row. Not an element. A person.

*Check: find the frame where Zeal is with a human being who has a visible job or
problem, and he is doing something for them. If no human is depicted anywhere on
the site, this fails outright.*

**Why this was missing, and why that mattered.** This bar was written by reading
the reference for placement mechanics, and it worked: rounds 1–4 took the craft
critic from 2/8 to 5/8. But the whole time it omitted the owner's actual
requirement — "showcased as helping people, and not just a mascot". The words
help, people, client, owner and person appeared nowhere in this file. Every round
passed a bar that did not contain the thing being asked for, so every round
produced a mascot that pointed at a menu.

The tell was in M2 all along: *"Duo's head reads about 250px tall against ~90px
human figures in the same cluster."* The reference scene HAS people in it. The
teardown extracted the size ratio and threw the people away.

M8 asks Zeal to have a target. M9 asks him to have a **beneficiary**. Those are
different questions, and only the second one is the brief.
