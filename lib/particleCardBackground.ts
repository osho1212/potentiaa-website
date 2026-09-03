/**
 * ParticleCardBackground - a card that IS its particles.
 *
 * Ported from the supplied ParticleCardBackground.js. The original's premise is
 * kept exactly: every visible mark is a particle, there is no card mesh, plane,
 * overlay or late-stage solid layer, and apparent solidity comes only from a
 * dense grid of points settling into place. One interleaved static buffer, zero
 * per-frame allocations, capped DPR, off-screen pausing, reduced-motion support
 * and automatic RAF shutdown after the build completes.
 *
 * Four things had to change to make it the background of THIS card.
 *
 * 1. THE PROJECTION IS PARAMETERISED. The original sizes its card off the
 *    canvas height through a fixed focal length, which fixes the card at
 *    116:72 (1.61) wherever it is mounted. The offerings card is 1.90 and
 *    changes with the viewport, so the card would never have lined up with the
 *    content it is supposed to sit behind. `setCardRect` takes the real
 *    element rect and solves the two scale uniforms from it.
 *
 * 2. DENSITY IS PER CARD PIXEL, NOT PER CANVAS PIXEL. This is the change that
 *    matters most, and it was measured rather than guessed. Solidity is
 *    governed by dot diameter against grid spacing, and the original is tuned
 *    so the two are equal - 1.2px dots at 1.17px spacing - for ITS card size.
 *    Point the same numbers at a 1240x652 card and the spacing opens to 1.87px
 *    while the dots stay at 1.2px. Rendering the original's exact shader maths
 *    at both sizes:
 *
 *        its own card size (723x437)    36% mean white, 29% of pixels empty
 *        this card size  (1240x652)     14% mean white, 71% of pixels empty
 *
 *    The second is a faint speckle, not a card. Because the count was derived
 *    from CANVAS area while the particles are laid out over the CARD, the
 *    density silently depended on how much empty space surrounded the card.
 *    Tying it to card area instead makes it scale-invariant: verified at 85.1%
 *    on a 1240x652 desktop card and 85.3% on a 358x760 mobile one.
 *
 * 3. ROUNDED-RECT CORNERS INSTEAD OF THE SUPERELLIPSE. The original's power-18
 *    superellipse works in normalised card space, so its corner stretches with
 *    aspect - at 1.90 that is roughly 6px of rounding horizontally against 33px
 *    vertically. The corner is now an ellipse quadrant whose two radii both
 *    come from the same CSS value, so it stays circular at any aspect and
 *    matches the 28px radius the rest of the card design uses.
 *
 * 4. THE SHAPE IS SOLVED IN THE SHADER. The buffer stores NORMALISED card
 *    coordinates and the corner is applied per-vertex from a uniform, so a
 *    resize re-projects rather than rebuilding an 8MB buffer.
 *
 * Everything else - the delay ramp, the curl, the settle envelope, the
 * hash-based scatter - is the original's.
 */

const PARTICLE_SIZE_CSS = 3.6;
const MIN_PARTICLES = 40000;
const MAX_PARTICLES = 480000;

/**
 * Particles per CSS pixel OF CARD. This is what makes the settled card opaque,
 * and it is set by the DARKEST pixel rather than the average.
 *
 * The tempting reading of "dense enough" is the mean, and the mean lies here.
 * An earlier setting of 0.285 particles at 2.6px measured 85% mean white and
 * passed a WCAG contrast check at 5.4:1 for the tab labels - and on screen
 * those labels were unreadable. Contrast ratios are computed against a
 * UNIFORM background; this one was noise at the same spatial frequency as a
 * 13.5px letter stroke, and five percent of it sat at 8% brightness. Stroke-
 * sized black speckles scattered through the type.
 *
 * Measured over a 240px sample at the card's size:
 *
 *                           mean     5th pct   below 0.99
 *    0.285 @ 2.6px           0.851     0.08       ~40%
 *    0.322 @ 3.6px           0.9999    1.00       0.04%
 *
 * At this density the additive accumulation saturates, so there is no residual
 * texture to interfere with anything - and no separate white layer either. The
 * card is opaque because there are enough particles for it to be, which is the
 * premise of the effect.
 */
const PARTICLES_PER_CARD_PIXEL = 0.322;

/** Corner radius in CSS pixels; matches the card's own border-radius. */
const CARD_CORNER_CSS = 28;

/**
 * Drawn radius of a HEADING particle, as a fraction of a card particle's.
 *
 * The card's dot size is solved for SURFACE opacity. Lettering has an outline
 * to respect instead: a dot sits centred on an ink pixel and spills its radius
 * past that outline, so at the card's 3.6px the particle heading came out
 * fatter than the type it hands over to. Read together with GLYPH_STRIDE in
 * components/OfferingCardParticles - stride and dot size only work as a pair,
 * because a grid needs dots of at least stride*sqrt(2) to close without holes.
 *
 * Measured against the real glyphs, on the drawing buffer, with the heading
 * settled. `coverage` is the share of true glyph pixels the particles actually
 * reach; `halo` is mean alpha in the 3px ring just outside the outline, which
 * is the spill (it also picks up the scattered field, so it is a ceiling, and
 * the runs sat at slightly different scroll positions - treat halo as
 * approximate and coverage/alpha as exact):
 *
 *                          title cov/alpha/halo   eyebrow cov/alpha/halo
 *   stride 2, scale 1.00     0.982 / 250 / 49       0.857 / 217 / 50
 *   stride 1, scale 0.85     1.000 / 255 / 61       1.000 / 255 / 64
 *   stride 1, scale 0.70     1.000 / 255 / 50       1.000 / 252 / 40
 *
 * The first row is what was there, and its real fault is not the spill - it is
 * the EYEBROW, at 0.857 coverage and 217 alpha. That is a patchy, dimmer copy
 * of the type underneath it, and dimness is what wrecks the handoff: both
 * layers are white glyphs crossfading, so if one is at 85% the sum dips in the
 * middle no matter how well the curves are matched.
 *
 * The last row dominates the first - full coverage and full brightness at
 * equal or less spill - so it is not a trade, and that is why it was worth
 * measuring instead of picking a smaller number and assuming.
 *
 * NOT SMALLER THAN THIS. 0.45 was tried and looks like it should be sharper;
 * it measured 0.73 coverage at 137 mean alpha - grey, holed lettering. The
 * antialiasing band is a fixed ~1 device pixel, so below about 2.5 CSS px a dot
 * is almost entirely that band and shrinking it buys nothing but faintness.
 */
const TEXT_DOT_SCALE = 0.7;

/**
 * How much of the canvas the scatter fills, per axis.
 *
 * A full 1.0, because every edge of the canvas is somewhere the reader cannot
 * see one: the canvas overhangs the section by 8vh top and bottom, and its
 * left and right sit on the viewport edges. Anything less leaves a margin of
 * empty space inside the section, and a margin has a straight edge - which is
 * the rectangle silhouette this field exists to avoid.
 */
const SOURCE_FILL = 1;

/* Arbitrary world units. Nothing depends on their absolute value any more -
   the scale uniforms map them onto the target rect - but the source sphere
   distances below are expressed relative to them, so they stay put. */
const CARD_HALF_WIDTH = 58;
const CARD_HALF_HEIGHT = 36;
const CAMERA_DISTANCE = 188;
const MAX_DELAY = 4.65;
const SETTLE_TIME = 1;
const COMPLETION_TIME = MAX_DELAY + SETTLE_TIME;

/**
 * The formation has no duration of its own any more - it is scrubbed by
 * scroll position, so how long it takes is however long the reader takes to
 * scroll the section in. COMPLETION_TIME survives only as the unit the
 * per-particle delay ramp is expressed in.
 */
const STRIDE_BYTES = 9 * 4;

/**
 * THE BRAND RAMP, THE SAME ONE THE HERO SWARM USES.
 *
 * Electric Blue -> Deep Electric Violet -> Rich Magenta -> Coral. These stops
 * are the GRADIENT array in lib/heroParticles, transcribed rather than
 * imported: that module pulls in three.js, and importing it here to reach four
 * colours would drag the whole of three into the offerings bundle, which a
 * previous commit on this branch went to some trouble to evict. If the hero's
 * ramp is ever retuned, retune these with it - they are meant to match.
 */
const BRAND_RAMP_GLSL = /* glsl */ `
vec3 brandRamp(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.17647, 0.41961, 1.00000); // #2D6BFF electric blue
  vec3 c1 = vec3(0.50980, 0.31373, 1.00000); // #8250FF deep electric violet
  vec3 c2 = vec3(0.90196, 0.29412, 0.58824); // #E64B96 rich magenta
  vec3 c3 = vec3(1.00000, 0.41961, 0.36078); // #FF6B5C vibrant coral
  if (t < 0.45) return mix(c0, c1, t / 0.45);
  if (t < 0.75) return mix(c1, c2, (t - 0.45) / 0.30);
  return mix(c2, c3, (t - 0.75) / 0.25);
}
`;

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aEnd;
in vec3 aStart;
in vec2 aSeed;
in float aDelay;

uniform float uTime;
uniform float uProgress;
uniform float uRadius;
uniform float uSwirl;
uniform float uPixelRatio;
uniform float uParticleSize;
uniform vec2 uCardScale;
uniform vec2 uCardCenter;
uniform vec2 uCorner;
uniform vec2 uCardHalfPx;
uniform vec2 uSourceSpread;

out float vBuild;
out float vRand;
out float vIsText;
out vec2 vCardCssPos;
out float vSize;
out float vNdcY;
out vec3 vTint;

${BRAND_RAMP_GLSL}

void main() {
  /* PROGRESS, NOT ELAPSED TIME. uProgress is 0..1 and comes from how far the
     section has been scrolled into view, so the assembly is scrubbed by the
     reader rather than played at them. Multiplying it back up by
     COMPLETION_TIME keeps the per-particle delay ramp below in the same units
     it was authored in.

     uTime is still real time, and is deliberately kept separate: it drives the
     swirl and the pulse, so the scattered particles keep drifting while the
     page is still. Folding the two together would freeze the field solid
     whenever the user stopped scrolling, which reads as broken rather than
     paused. */
  float rawBuild = clamp(uProgress * ${COMPLETION_TIME.toFixed(2)} - aDelay, 0.0, 1.0);
  float build = rawBuild * rawBuild * (3.0 - 2.0 * rawBuild);
  float envelope = 4.0 * build * (1.0 - build);
  float phase = aSeed.x * 2.3 + uTime * (1.1 + 0.5 * aSeed.y);

  /* aEnd.xy is normalised card space (-1..1). The corner is applied here
     rather than baked into the buffer so a resize only re-projects: the two
     radii are independent fractions of the half-extents, which is what keeps
     the corner circular when the card is not square.

     aEnd.z flags a HEADING particle - one whose destination is a glyph in the
     section's title rather than a cell of the card. Those sit above the card,
     outside |aEnd.xy| <= 1 entirely, so the corner shaping must not touch them
     (it would bend the lettering) and neither must the card's outline clip in
     the fragment stage (it would delete them). */
  float isText = step(0.5, aEnd.z);
  float ax = abs(aEnd.x);
  float limit = 1.0;
  if (isText < 0.5 && ax > 1.0 - uCorner.x) {
    float t = (ax - (1.0 - uCorner.x)) / max(uCorner.x, 0.0001);
    limit = (1.0 - uCorner.y) + uCorner.y * sqrt(max(0.0, 1.0 - t * t));
  }

  /* aEnd.z is NOT a position.
     THE SETTLED CARD IS PERFECTLY FLAT, AND HAS TO BE. The original gave each
     particle a little z at its destination, which reads as thickness in
     flight and quietly wrecks the settled surface: position is divided by
     clipW, so a particle 1.1 units nearer the camera lands ~0.6% further from
     centre than the grid intends - about 11 device pixels at the edge of an
     1860px card, four times the 2.6px grid spacing. That destroys the
     stratification the density calculation depends on, and the even lattice
     degrades into a random scatter with gaps in it. It showed up as holes
     running 0.9% at the card's centre rising to 2.3% at the edges: an error
     proportional to distance from centre. Flat, the surface closes completely.
     The fly-in keeps its volume anyway, because the sources are a sphere.
     So the slot is free, and carries the source distance factor instead. */
  vec3 endPosition = vec3(
    aEnd.x * ${CARD_HALF_WIDTH.toFixed(1)},
    aEnd.y * limit * ${CARD_HALF_HEIGHT.toFixed(1)},
    0.0
  );

  /* THE SCATTER. aStart.xy is a uniform position in -1..1, which uSourceSpread
     turns into world units spanning the canvas. Every particle therefore
     begins somewhere arbitrary in the section and travels to an ordered place
     in the grid, which is what makes the motion read as gathering rather than
     as the whole field contracting.

     RE-CENTRED ON THE CANVAS. Everything else in this shader is positioned
     relative to the CARD - that is what uCardCenter does - but the card is not
     in the middle of the section: the heading sits above it, so its centre is
     about 100px low. Left on the card's centre the scatter inherits that
     offset, missing the top edge of the section and spilling past the bottom.
     Converting uCardCenter back into world units and subtracting it puts the
     field on the section instead, which is what "scattered evenly across the
     section" actually requires.

     The z term only gives the flight some depth - the destination is flat. */
  vec2 canvasOffset = vec2(
    uCardCenter.x * ${CAMERA_DISTANCE.toFixed(1)} / uCardScale.x,
    uCardCenter.y * ${CAMERA_DISTANCE.toFixed(1)} / uCardScale.y
  );
  /* uRadius scales HOW FAR the scatter spreads. It must not touch
     canvasOffset, which is a position: multiplying the two together applied
     the section re-centring at only half strength and left the field pulled
     down towards the card, missing the top of the section entirely. */
  vec3 startPosition = vec3(
    aStart.xy * uSourceSpread * uRadius - canvasOffset,
    aStart.z * 26.0 * uRadius
  );

  vec3 curl = vec3(0.0);
  if (build < 0.999) {
    curl = vec3(
      cos(phase),
      sin(phase * 0.87),
      sin(phase * 1.31)
    ) * uSwirl * envelope;

    /* The envelope is 4*build*(1-build), which is ZERO at build 0 - so with
       the curl alone the scattered field is completely frozen until the
       formation starts. That matters now that the reader is held at the
       scattered state while scrolling in: a still field reads as a broken
       render rather than as particles waiting. This term is independent of
       the envelope and fades out as the card forms.

       THIS IS THE HERO SWARM'S MOTION, PORTED, not an approximation of it.
       Both earlier versions drove each particle from its OWN phase, so however
       the frequencies were tuned the field could only ever read as a crowd of
       independent jitterers. The hero swarm does not move that way: its drift
       is a function of WHERE a particle is, so neighbours move together and the
       whole field flows as one sheet. That coherence is the difference, not the
       amplitude - which is why matching amplitudes did not make the two look
       alike.

       Frequencies, rates and amplitudes are lib/heroParticles' verbatim. They
       transfer unscaled because the two fields happen to be the same size in
       world units: the hero's sphere is baseRadius 68, and this canvas solves
       to a half-extent of about 68 as well (uSourceSpread at SOURCE_FILL 1).
       If either is ever rescaled, these stop being comparable.

       home is the particle's scatter position measured from the CANVAS centre -
       startPosition carries the section re-centring above, and feeding that
       offset into a spatial wave would slide the wave pattern off the field
       along with it. */
    vec2 home = startPosition.xy + canvasOffset;

    /* The hero's fluid wave drift: coherent travelling waves across the field. */
    vec3 heroDrift = vec3(
      sin(home.y * 0.04 + uTime * 0.7) * 3.5,
      cos(home.x * 0.04 - uTime * 0.6) * 3.5,
      sin((home.x + home.y) * 0.025 + uTime * 0.8) * 2.5
    );

    /* The hero's multi-harmonic ripple and breath. There they modulate a
       sphere's RADIUS; the equivalent on a flat field is a radial displacement
       about its centre, so the field breathes in and out as the hero's shell
       does. aSeed stands in for the hero's per-particle fold/wave phases. */
    vec3 hdir = normalize(vec3(aStart.xy, aStart.z) + vec3(1e-5));
    float morph1 = sin(hdir.y * 3.4 + uTime * 0.85 + aSeed.x * 2.2);
    float morph2 = cos(hdir.z * 3.8 - uTime * 0.75 + aSeed.y * 2.2);
    float morph3 = sin((hdir.x * 2.6 + hdir.y * 2.2) + uTime * 0.95);
    float morph4 = cos(length(hdir.xy) * 4.5 - uTime * 0.7);
    float ripple = (morph1 * 0.35 + morph2 * 0.30 + morph3 * 0.20 + morph4 * 0.15) * 14.0;
    float breath = sin(uTime * 0.55 + aSeed.x * 3.14159) * 4.5;
    heroDrift.xy += hdir.xy * (ripple + breath);

    curl += heroDrift * (1.0 - build);
  }

  vec3 worldPosition = mix(startPosition, endPosition, build) + curl;
  vec3 viewPosition = worldPosition - vec3(0.0, 0.0, ${CAMERA_DISTANCE.toFixed(1)});
  float clipW = max(32.0, -viewPosition.z);

  /* uCardCenter is multiplied by clipW so that it survives the perspective
     divide as a constant NDC offset - the card stays pinned to its element
     while depth still spreads the incoming particles. */
  gl_Position = vec4(
    viewPosition.x * uCardScale.x + uCardCenter.x * clipW,
    viewPosition.y * uCardScale.y + uCardCenter.y * clipW,
    0.0,
    clipW
  );

  gl_PointSize = uParticleSize * uPixelRatio
    * (${CAMERA_DISTANCE.toFixed(1)} / clipW);

  vBuild = build;
  vIsText = isText;
  /* A stable per-particle number, used as the threshold that decides whether
     this particle is drawn at all while the field is scattered. */
  vRand = aSeed.y;
  /* Where this particle SETTLES, in CSS pixels from the card centre. The
     fragment stage tests against the card's outline from here. */
  vCardCssPos = vec2(endPosition.x / ${CARD_HALF_WIDTH.toFixed(1)},
                     endPosition.y / ${CARD_HALF_HEIGHT.toFixed(1)}) * uCardHalfPx;
  vSize = gl_PointSize;
  /* Where this particle is vertically within the canvas, -1..1. The fragment
     stage fades the field out towards the canvas's top and bottom from this. */
  vNdcY = gl_Position.y / clipW;

  /* THE SCATTERED FIELD IS BRAND-COLOURED, THE CARD IS NOT.
     Mapped from the particle's SCATTER position (aStart), not its live one, so
     a particle keeps one colour for its whole flight instead of sliding
     through the ramp as it travels - the hero swarm assigns its colour from
     the rest position the same way. The diagonal weighting is the hero's, so
     the two fields ramp along the same axis: blue low and left, coral high and
     right. Whitening is handled in the fragment stage. */
  vTint = brandRamp(clamp(0.5 + aStart.y * 0.42 + aStart.x * 0.18, 0.0, 1.0));
}
`;

/**
 * Fraction of the field drawn while fully scattered.
 *
 * This is the ONLY dial for how dense the loose field looks. The particle
 * count itself is fixed by what the SETTLED card needs in order to be opaque -
 * thinning that would reopen holes in the finished card - so the scattered
 * state is thinned by drawing fewer of the same particles instead. At
 * vBuild 1 the probability reaches 1 regardless, and every particle is drawn.
 *
 * Tuned down in two steps from the 0.40 that first matched the old
 * dimmed-particle look. Measured over a 600x60 band at the canvas centre with
 * the field fully scattered:
 *
 *              particles drawn    mean alpha    pixels lit
 *   0.40            100%             0.344         43.2%
 *   0.30             75%             0.273         34.9%
 *   0.12             30%             0.126         16.5%
 *   0.06             15%             0.066          8.8%
 *
 * Density and brightness do not move together, which is worth knowing before
 * anyone tunes this again. The dots overlap, so removing a share of them
 * uncovers less than that share of the area - and the gap narrows as the field
 * thins, because sparser dots overlap less:
 *
 *   0.40 -> 0.30   count -25%   brightness -21%
 *   0.30 -> 0.12   count -60%   brightness -54%
 *   0.12 -> 0.06   count -50%   brightness -47%
 *
 * So a request for "n% fewer" lands short of n% on screen, and by more the
 * denser the field already is - the shortfall shrinks from 4 points to 3 as
 * the field thins and the dots stop overlapping each other. Measure rather
 * than assuming the two track.
 *
 *   0.036            60%             0.035          4.6%
 *
 * THAT LAST ROW DOES NOT CONTINUE THE PATTERN, and the reason is that it was
 * not measured under the same conditions: it is the first reading taken after
 * the scattered field was given the brand ramp and the wider drift below. Read
 * literally, 0.06 -> 0.036 is count -40% against brightness -48% - overshoot,
 * where every earlier step undershot. Do not draw a trend through it without
 * re-measuring the rows above it on the current shader.
 */
const SCATTER_KEEP = 0.036;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in float vBuild;
in float vRand;
in float vIsText;
in vec2 vCardCssPos;
in float vSize;
in float vNdcY;
in vec3 vTint;
out vec4 fragColor;

uniform float uPixelRatio;
uniform vec2 uCardHalfPx;
uniform float uCornerPx;
uniform float uProgress;

void main() {
  vec2 point = gl_PointCoord - 0.5;
  float radial = dot(point, point);
  if (radial > 0.25) discard;

  /* THE OUTLINE IS DEFINED HERE, NOT BY WHERE DOTS LAND.
     Left to the grid, the card's boundary was whatever the outermost
     particles happened to cover: those cells sit half a cell inside the edge,
     carry jitter, and each dot fades over the outer half of its radius, which
     added up to about four device pixels of ragged, part-covered fringe.
     Testing every FRAGMENT against the exact rounded rectangle instead gives
     an edge that is exactly the shape, with one pixel of feather.

     Only applied as particles settle - a particle in flight is nowhere near
     its destination, and clipping it there would delete the fly-in. */
  float shape = 1.0;
  if (vBuild > 0.85 && vIsText < 0.5) {
    vec2 offsetCss = point * vSize / uPixelRatio;
    vec2 p = vCardCssPos + offsetCss;
    vec2 q = abs(p) - (uCardHalfPx - uCornerPx);
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uCornerPx;
    shape = mix(1.0, 1.0 - smoothstep(-0.5, 0.5, sd), smoothstep(0.85, 1.0, vBuild));
  }
  if (shape <= 0.0) discard;

  /* RAZOR-SHARP DOTS, NOT SOFT ONES.
     This was 1.0 - smoothstep(0.10, 0.25, radial): a falloff running from
     |point| 0.316 out to 0.5, so the outer 37% of every dot's radius was a
     gradient. On a dot 5.4 device pixels across that is not a subtle edge
     treatment, it is most of the dot - there is no room at this size to
     render a gradient, so the whole thing reads as blur.

     A dot is opaque to its rim instead, with exactly ONE device pixel of
     antialiasing. vSize carries gl_PointSize, and the sprite spans that many
     pixels across 2 units of the -1..1 space below, so 2/vSize is one pixel
     however near or far the particle is and whatever the device ratio. The
     clamp keeps the band from swallowing the dot if it ever gets very small.

     Same fix, same reason, as the hero swarm in lib/heroParticles. */
  vec2 unit = point * 2.0;
  float dist = length(unit);
  float aa = clamp(2.0 / max(vSize, 1.0), 0.04, 0.6);
  /* HEADING DOTS ARE SMALLER THAN CARD DOTS. The card's size is set by what
     makes a SURFACE opaque; lettering is not a surface, and at that size the
     glyphs came out dilated by the dot radius and read as a bolder, blobbier
     copy of the type they hand over to - see GLYPH_STRIDE in
     components/OfferingCardParticles for the measurements. Shrinking the drawn
     disc here rather than gl_PointSize keeps this to one line and one branchless
     mix; the sprite is a little larger than it needs to be for text particles,
     which is a few thousand wasted fragments and nothing worth a second
     uniform. */
  float radiusScale = mix(1.0, ${TEXT_DOT_SCALE.toFixed(2)}, vIsText);
  float edge = (1.0 - smoothstep(radiusScale - aa, radiusScale, dist)) * shape;
  /* EVERY PARTICLE IS THE SAME WHITE. DENSITY CARRIES EVERYTHING ELSE.
     Earlier versions dimmed the scattered particles (0.30-0.48 alpha against
     the settled card's 1.0), which is why the loose field looked like it had a
     darkening filter over it while the card did not - they were literally
     different colours. Fading a UNIFORM-density field also cannot dissolve an
     edge convincingly: every particle stays where it is and just gets darker,
     so the boundary survives as a gradient in a sheet rather than reading as
     particles running out.

     So alpha is constant and a particle is either drawn or not, decided by its
     own fixed random against a probability. Two things set that probability:

       SCATTER_KEEP  - only a fraction of the field is present while scattered,
                       which is what keeps the loose state from being a wall of
                       white now that each particle is at full strength. The
                       rest arrive as the card forms, so the formation front is
                       a density ramp instead of a brightness ramp.
       edgeFade      - thins that fraction to nothing towards the canvas's top
                       and bottom, so the field genuinely runs out of particles
                       at the seam rather than dimming into it.

     Gated on the particle's own build, which is not optional: the card sits
     ~97px below the canvas centre, so its bottom rows reach |vNdcY| ~= 0.91,
     deep in the fade band. Ungated, this would delete the bottom of the
     finished card. At vBuild 1 the probability is 1 and every particle is
     drawn, so the settled card still measures mean 1.0000, 0.00% holes. */
  float edgeFade = 1.0 - smoothstep(0.55, 1.0, abs(vNdcY));
  float visible = step(vRand, mix(${SCATTER_KEEP.toFixed(3)} * edgeFade, 1.0, vBuild));
  if (visible <= 0.0) discard;

  /* THE HEADING HANDS OFF TO REAL TEXT. Particles assemble the lettering, then
     give way to the actual DOM heading over the last stretch of the scroll, so
     what the reader ends up with is selectable, accessible, crisply hinted
     type rather than a permanent approximation of it. The wrapper fades the
     element in across the same window, and since both are white glyphs in the
     same place the swap is not visible. */
  float textFade = 1.0 - smoothstep(0.78, 0.97, uProgress);
  float alpha = edge * mix(1.0, textFade, vIsText);
  if (alpha <= 0.0) discard;

  /* BRAND COLOUR WHILE LOOSE, PURE WHITE ONCE LANDED.
     vTint carries the hero's ramp (see the vertex stage), so the scattered
     field reads as the same material as the swarm in the hero rather than as a
     separate monochrome effect. It has to be gone by the time a particle
     settles: the card is a white surface, and the opacity invariant the count
     is tuned for - mean alpha 1.0000, 0.00% holes - assumes every particle
     landing on it contributes the same white. At vBuild 1 this is exactly
     vec3(1.0), so that is untouched.
     The band starts above 0 so the loose field holds its colour through the
     hold before formation, and finishes well before landing so the card is
     never tinted while it closes up. */
  float whiten = smoothstep(0.15, 0.75, vBuild);
  vec3 color = mix(vTint, vec3(1.0), whiten);

  fragColor = vec4(color, alpha);
}
`;

export interface CardRect {
  /** Card centre, in CSS pixels relative to the canvas's top-left. */
  centerX: number;
  centerY: number;
  halfWidth: number;
  halfHeight: number;
}

export interface ParticleCardBackgroundOptions {
  /** Scales the source cloud within the canvas. 1.0 fills it as far as SOURCE_FILL allows. */
  sourceRadius?: number;
  swirl?: number;
}

function hash01(value: number): number {
  let hash = value | 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("ParticleCardBackground could not create a shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown shader error";
    gl.deleteShader(shader);
    throw new Error(`ParticleCardBackground shader error: ${message}`);
  }

  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("ParticleCardBackground could not create a program.");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "Unknown program error";
    gl.deleteProgram(program);
    throw new Error(`ParticleCardBackground link error: ${message}`);
  }

  return program;
}

export default class ParticleCardBackground {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;

  private readonly sourceRadius: number;
  private readonly swirl: number;

  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;
  private particleCount = 0;
  private builtForArea = 0;
  private builtForAspect = 0;

  private frameId = 0;
  private running = false;
  private visible = true;
  private destroyed = false;

  /** Scroll-driven formation progress, 0 (scattered) to 1 (formed). */
  private progress = 0;
  private readonly clock = performance.now();

  private rect: CardRect = { centerX: 0, centerY: 0, halfWidth: 0, halfHeight: 0 };
  /** Glyph destinations for the section heading, as x,y pairs in canvas CSS px. */
  private textPoints: Float32Array | null = null;
  /** Set when the glyph set changes, since that alters the buffer's length. */
  private textDirty = false;
  private uCardScaleX = 1;
  private uCardScaleY = 1;

  private readonly uniforms: Record<string, WebGLUniformLocation | null>;
  private readonly motionQuery: MediaQueryList;
  private reducedMotion: boolean;
  private readonly intersectionObserver: IntersectionObserver;

  constructor(canvas: HTMLCanvasElement, options: ParticleCardBackgroundOptions = {}) {
    this.canvas = canvas;
    /* 1.0, not the 0.5 this carried while the sources were a sphere at a fixed
       world distance that overshot the frame and needed reining in. Now that
       uSourceSpread fits the canvas directly, anything under 1 only shrinks
       the field away from the edges it is supposed to reach. */
    this.sourceRadius = Number.isFinite(options.sourceRadius)
      ? Math.max(0.1, options.sourceRadius as number)
      : 1;
    this.swirl = Number.isFinite(options.swirl) ? Math.max(0, options.swirl as number) : 10;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      depth: false,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
    });

    if (!gl) throw new Error("ParticleCardBackground requires WebGL 2.");
    this.gl = gl;
    this.program = createProgram(gl);

    this.uniforms = {
      time: gl.getUniformLocation(this.program, "uTime"),
      progress: gl.getUniformLocation(this.program, "uProgress"),
      radius: gl.getUniformLocation(this.program, "uRadius"),
      swirl: gl.getUniformLocation(this.program, "uSwirl"),
      pixelRatio: gl.getUniformLocation(this.program, "uPixelRatio"),
      particleSize: gl.getUniformLocation(this.program, "uParticleSize"),
      cardScale: gl.getUniformLocation(this.program, "uCardScale"),
      cardCenter: gl.getUniformLocation(this.program, "uCardCenter"),
      corner: gl.getUniformLocation(this.program, "uCorner"),
      cardHalfPx: gl.getUniformLocation(this.program, "uCardHalfPx"),
      cornerPx: gl.getUniformLocation(this.program, "uCornerPx"),
      sourceSpread: gl.getUniformLocation(this.program, "uSourceSpread"),
    };

    this.onFrame = this.onFrame.bind(this);
    this.onVisibility = this.onVisibility.bind(this);
    this.onMotionPreference = this.onMotionPreference.bind(this);

    this.motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.motionQuery.matches;
    this.motionQuery.addEventListener("change", this.onMotionPreference);

    this.intersectionObserver = new IntersectionObserver(this.onVisibility, {
      rootMargin: "120px 0px",
    });
    this.intersectionObserver.observe(canvas);

    gl.useProgram(this.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
  }

  /**
   * The card's rect within the canvas, in CSS pixels. Everything downstream -
   * the projection, the particle count, the corner radii - is solved from
   * this, so it must be called at least once before anything renders.
   */
  setCardRect(rect: CardRect) {
    if (this.destroyed) return;
    if (rect.halfWidth <= 0 || rect.halfHeight <= 0) return;

    this.rect = rect;
    this.resize();
  }

  private calculateParticleLayout() {
    const cardWidth = this.rect.halfWidth * 2;
    const cardHeight = this.rect.halfHeight * 2;
    const area = cardWidth * cardHeight;
    const aspect = cardWidth / cardHeight;
    const ideal = Math.round(area * PARTICLES_PER_CARD_PIXEL);
    const target = Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, ideal));
    const columns = Math.ceil(Math.sqrt(target * aspect));
    const rows = Math.ceil(target / columns);

    /* SIZE COMPENSATES WHEN THE COUNT CLAMPS. Coverage goes as count x size
       squared, so a card too big for MAX_PARTICLES would otherwise thin out -
       and thinning is not cosmetic here, it reopens the dark speckles that
       made small text unreadable. The container has no max-width, so a 2560px
       display puts the card near 2360px wide and asks for ~836k particles;
       holding memory at the cap and widening the dots by the square root of
       the shortfall keeps the surface identical instead. The same expression
       shrinks the dots on a card small enough to hit MIN_PARTICLES. */
    const scale = Math.sqrt(ideal / target);
    const size = PARTICLE_SIZE_CSS * Math.min(2.2, Math.max(0.6, scale));

    return { area, aspect, columns, rows, count: columns * rows, size };
  }

  private buildParticleBuffer(layout: ReturnType<typeof ParticleCardBackground.prototype.calculateParticleLayout>) {
    const gl = this.gl;
    const textCount = this.textPoints ? this.textPoints.length >> 1 : 0;
    const data = new Float32Array((layout.count + textCount) * 9);
    const tau = Math.PI * 2;

    for (let index = 0; index < layout.count; index += 1) {
      const h1 = hash01(index + 0x12d4a7);
      const h2 = hash01(index + 0x9e3779);
      const h3 = hash01(index + 0x51ed27);
      const h4 = hash01(index + 0x7f4a7c);
      /* Independent of h3/h4, which shape the DESTINATION. Reusing those for
         the source would tie where a particle starts to where it lands, and
         the field would contract as one piece instead of gathering. */
      const h5 = hash01(index + 0x2f1b3d);
      const h6 = hash01(index + 0xc2b2ae);
      const column = index % layout.columns;
      const row = Math.floor(index / layout.columns);

      /* Stratified: one particle per grid cell, jittered by a fraction of a
         cell. Even coverage without the clumping a uniform random scatter
         would give, which at this density would show as blotches. */
      const cardX = ((column + 0.5) / layout.columns) * 2 - 1
        + (h3 - 0.5) * 0.65 / layout.columns;
      const cardY = ((row + 0.5) / layout.rows) * 2 - 1
        + (h4 - 0.5) * 0.65 / layout.rows;

      const offset = index * 9;

      /* Normalised card space; the shader scales it and applies the corner. */
      data[offset] = cardX;
      data[offset + 1] = cardY;
      /* Free: the settled card is flat and the source no longer needs a
         distance factor. Left at zero rather than restriding the buffer. */
      data[offset + 2] = 0;
      /* THE SCATTER: a plain uniform position over the whole canvas, in -1..1,
         scaled to world units by uSourceSpread in the shader.

         Uniform and unstructured is the entire point. Anything with a rule in
         it acquires a silhouette: an earlier version placed sources on a ring
         between the card's edge and the canvas edge, which is even coverage of
         a REGION but reads unmistakably as a rectangular frame hanging in the
         section. Two independent randoms have no shape to read.

         Nor do they clump. At ~260,000 particles over a section-sized canvas
         the density is ~0.17 per square pixel, and Poisson noise at that count
         is far below what an eye resolves - the stratified grid is needed for
         the DESTINATION, where dots must tile a solid surface, not here. */
      data[offset + 3] = h5 * 2 - 1;
      data[offset + 4] = h6 * 2 - 1;
      data[offset + 5] = h2 * 2 - 1;
      data[offset + 6] = tau * h3;
      data[offset + 7] = h1;
      /* TOP TO BOTTOM, which is what the falling index gives - and the sign
         here is easy to get backwards, so it is worth stating why.

         cardY is ((row + 0.5) / rows) * 2 - 1, so row 0 is cardY = -1. World
         -y is DOWN the screen, which makes row 0 the BOTTOM row, not the top.
         Index is row-major, so index 0 is the bottom and the last index is the
         top. Delay therefore has to FALL with index for the top to go first.

         Flipping this to (index / count) was tried and measured: sampling the
         card during a build read the top band at 0.66 while the bottom was
         already at 1.0 - the card filling upward. This is the direction that
         the staggered content reveal in globals.css follows. */
      data[offset + 8] = 3.4 * (1 - index / layout.count) + 1.2 * h4;
    }

    /* THE HEADING, APPENDED TO THE SAME FIELD.
       These particles share everything with the card's: the same scatter to
       start from, the same projection, the same white. Only their destination
       differs - a glyph pixel instead of a grid cell - which is what makes the
       heading and the card read as one field resolving rather than as two
       effects running side by side.

       The points arrive in canvas CSS pixels and are converted into the same
       normalised card space the shader projects through, so they need no
       special handling downstream beyond the aEnd.z flag. Values outside
       -1..1 are expected and correct: the heading sits above the card. */
    if (this.textPoints && textCount > 0) {
      const halfW = Math.max(1, this.rect.halfWidth);
      const halfH = Math.max(1, this.rect.halfHeight);
      for (let t = 0; t < textCount; t += 1) {
        const index = layout.count + t;
        const offset = index * 9;
        const px = this.textPoints[t * 2];
        const py = this.textPoints[t * 2 + 1];

        const g1 = hash01(index + 0x3ab19f);
        const g2 = hash01(index + 0x5f2e11);
        const g3 = hash01(index + 0x91c7d3);
        const g4 = hash01(index + 0x1de3b7);

        /* CSS y grows downward, normalised y grows upward. */
        data[offset] = (px - this.rect.centerX) / halfW;
        data[offset + 1] = -(py - this.rect.centerY) / halfH;
        data[offset + 2] = 1; // isText
        data[offset + 3] = g1 * 2 - 1;
        data[offset + 4] = g2 * 2 - 1;
        data[offset + 5] = g3 * 2 - 1;
        data[offset + 6] = tau * g4;
        data[offset + 7] = g1;
        /* Delay 0, like the card's top row: the heading sits above the card, so
           the top-to-bottom sweep should reach it first. The jitter keeps the
           letters from snapping into place all on one frame. */
        data[offset + 8] = 0.55 * g4;
      }
    }

    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.buffer) gl.deleteBuffer(this.buffer);

    this.vao = gl.createVertexArray();
    this.buffer = gl.createBuffer();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    this.bindAttribute("aEnd", 3, 0);
    this.bindAttribute("aStart", 3, 3 * 4);
    this.bindAttribute("aSeed", 2, 6 * 4);
    this.bindAttribute("aDelay", 1, 8 * 4);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.particleCount = layout.count + textCount;
    this.builtForArea = layout.area;
    this.builtForAspect = layout.aspect;
  }

  private bindAttribute(name: string, size: number, offsetBytes: number) {
    const gl = this.gl;
    const location = gl.getAttribLocation(this.program, name);
    if (location < 0) return;
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, STRIDE_BYTES, offsetBytes);
  }

  private resize() {
    if (this.destroyed) return;

    const gl = this.gl;
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const pixelRatio = Math.min(2, devicePixelRatio || 1);
    const displayWidth = Math.round(width * pixelRatio);
    const displayHeight = Math.round(height * pixelRatio);

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }

    gl.viewport(0, 0, displayWidth, displayHeight);
    gl.useProgram(this.program);
    gl.uniform1f(this.uniforms.pixelRatio, pixelRatio);

    /* Solve the projection from the card's rect. At the card plane clipW is
       CAMERA_DISTANCE, so a world half-extent maps to
       halfExtentNdc = worldHalf * scale / CAMERA_DISTANCE. */
    const halfWidthNdc = this.rect.halfWidth / (width / 2);
    const halfHeightNdc = this.rect.halfHeight / (height / 2);
    this.uCardScaleX = (halfWidthNdc * CAMERA_DISTANCE) / CARD_HALF_WIDTH;
    this.uCardScaleY = (halfHeightNdc * CAMERA_DISTANCE) / CARD_HALF_HEIGHT;
    gl.uniform2f(this.uniforms.cardScale, this.uCardScaleX, this.uCardScaleY);
    /* CSS y grows downward, NDC y grows upward. */
    gl.uniform2f(
      this.uniforms.cardCenter,
      (this.rect.centerX - width / 2) / (width / 2),
      -(this.rect.centerY - height / 2) / (height / 2),
    );
    gl.uniform2f(
      this.uniforms.corner,
      Math.min(1, CARD_CORNER_CSS / this.rect.halfWidth),
      Math.min(1, CARD_CORNER_CSS / this.rect.halfHeight),
    );
    /* The fragment stage tests the card outline in CSS pixels. */
    gl.uniform2f(this.uniforms.cardHalfPx, this.rect.halfWidth, this.rect.halfHeight);
    gl.uniform1f(
      this.uniforms.cornerPx,
      Math.min(CARD_CORNER_CSS, this.rect.halfWidth, this.rect.halfHeight),
    );

    /* Fit the source cloud to the canvas. Solve for the world extent whose
       projection lands at SOURCE_FILL of each half-axis, so particles enter
       from just inside the frame instead of from a fixed distance that mostly
       fell outside it. Divided by the largest per-particle distance factor
       (1.2) so even the furthest starts inside. */
    const spreadX = (SOURCE_FILL * CAMERA_DISTANCE) / this.uCardScaleX;
    const spreadY = (SOURCE_FILL * CAMERA_DISTANCE) / this.uCardScaleY;
    gl.uniform2f(this.uniforms.sourceSpread, spreadX, spreadY);

    const layout = this.calculateParticleLayout();
    gl.uniform1f(this.uniforms.particleSize, layout.size);
    const areaRatio = this.builtForArea > 0 ? layout.area / this.builtForArea : 1;
    const aspectRatio = this.builtForAspect > 0 ? layout.aspect / this.builtForAspect : 1;
    /* Rebuilding is an 8MB allocation and a several-hundred-thousand-iteration
       loop, so it happens only when the grid would actually be wrong - not on
       every resize tick, and not when switching offering tabs, which moves the
       card height by well under these bands. */
    const needsRebuild =
      !this.vao ||
      this.textDirty ||
      areaRatio > 1.35 ||
      areaRatio < 0.65 ||
      aspectRatio > 1.18 ||
      aspectRatio < 0.85;

    if (needsRebuild) {
      this.buildParticleBuffer(layout);
      this.textDirty = false;
    }

    /* A resize changes the projection, so whatever is on screen is stale
       regardless of whether anything is animating. */
    this.draw();
    this.wake();
  }

  /**
   * Destinations for the heading particles, as x,y pairs in canvas CSS pixels.
   * The wrapper rasterises the section's own heading elements and samples them
   * - see OfferingCardParticles - because turning DOM text into pixels needs
   * computed styles and loaded fonts, which are its business, not this one's.
   *
   * Rebuilds the buffer, so it is called on font load and on resize, not per
   * frame.
   */
  setTextTargets(points: Float32Array | null) {
    if (this.destroyed) return;
    this.textPoints = points && points.length >= 2 ? points : null;
    /* An EXPLICIT flag, not a poisoned builtForArea. Zeroing that looks like it
       forces a rebuild and does the opposite: the guard below reads it as
       "no baseline yet" and substitutes a ratio of 1, which passes every
       rebuild test. The glyph particles silently never got appended. */
    this.textDirty = true;
    this.resize();
  }

  /**
   * Set how far the card has formed: 0 fully scattered, 1 solid. Driven by
   * scroll position from the wrapper.
   */
  setProgress(value: number) {
    if (this.destroyed) return;
    const next = Math.min(1, Math.max(0, value));
    if (next === this.progress) return;
    this.progress = next;
    this.wake();
  }

  /**
   * Start rendering if there is anything left to render.
   *
   * Two things can require a frame: progress moved, or the field is
   * part-formed and its swirl is still running. Pinned at 0 or 1 neither is
   * true, so the loop stops - which means the settled card, the state it
   * spends nearly all its life in, costs nothing at all.
   */
  private wake() {
    if (this.destroyed || !this.vao || !this.visible || this.reducedMotion) return;
    if (this.running) return;
    this.running = true;
    this.requestFrame();
  }

  private onVisibility(entries: IntersectionObserverEntry[]) {
    const isVisible = entries[entries.length - 1].isIntersecting;
    if (isVisible === this.visible) return;

    this.visible = isVisible;
    if (!isVisible) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
      this.running = false;
    } else {
      this.wake();
    }
  }

  private onMotionPreference(event: MediaQueryListEvent) {
    this.reducedMotion = event.matches;
    if (this.reducedMotion) {
      /* No scrubbing under reduce: the card is simply there, formed. */
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
      this.running = false;
      this.draw();
    }
  }

  private requestFrame() {
    if (!this.destroyed && this.running && this.visible && this.frameId === 0) {
      this.frameId = requestAnimationFrame(this.onFrame);
    }
  }

  private onFrame() {
    this.frameId = 0;
    if (!this.running || !this.visible || this.destroyed) return;

    this.draw();

    /* Keep going for anything short of formed. The scattered field drifts on
       its own now, so stopping at progress 0 would freeze it on screen; only
       the finished card is genuinely static, and that is the state it spends
       nearly all of its life in. */
    if (this.progress >= 1) {
      this.running = false;
      return;
    }

    this.requestFrame();
  }

  private draw() {
    if (!this.vao) return;
    const gl = this.gl;
    const time = (performance.now() - this.clock) * 0.001;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform1f(this.uniforms.time, time);
    gl.uniform1f(this.uniforms.progress, this.reducedMotion ? 1 : this.progress);
    gl.uniform1f(this.uniforms.radius, this.sourceRadius);
    gl.uniform1f(this.uniforms.swirl, this.swirl);
    gl.drawArrays(gl.POINTS, 0, this.particleCount);
    gl.bindVertexArray(null);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    this.intersectionObserver.disconnect();
    this.motionQuery.removeEventListener("change", this.onMotionPreference);

    const gl = this.gl;
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.program) gl.deleteProgram(this.program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
