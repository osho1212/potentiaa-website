/**
 * Generates the six illustrated placeholder avatars in
 * public/assets/testimonials/.
 *
 * Kept as a script rather than six hand-written files so the set stays
 * consistent: every avatar is the same construction with different parameters,
 * so they read as one family rather than six drawings. Re-run with:
 *
 *     node scripts/build-avatars.mjs
 *
 * They are ILLUSTRATIONS, deliberately. design.md 6 supplies no imagery and
 * rules out stock or generated photographs, and these stand in for clients who
 * have not sent a photo yet - a stylised face cannot be mistaken for a real
 * person the way a synthetic headshot can. The register is the mascot's:
 * flat shapes, brand palette, no rendering.
 */
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "public/assets/testimonials";

/* Grounds sampled from tokens.css - the same cool-to-warm ramp the section
   themes walk, so the six sit together and inside the brand. */
const PEOPLE = [
  {
    file: "anita",
    ground: ["#1B4CE0", "#265DFF"],
    skin: "#8D5524",
    hair: "#1A1423",
    // Long hair, centre part.
    hairShape: "long",
    clothes: "#0A2470",
  },
  {
    file: "devraj",
    ground: ["#265DFF", "#7E9BFF"],
    skin: "#A9743F",
    hair: "#241C26",
    hairShape: "short",
    clothes: "#001B5E",
    beard: true,
  },
  {
    file: "farah",
    ground: ["#4C79FF", "#7E9BFF"],
    skin: "#C68642",
    hair: "#2B1B12",
    hairShape: "wrap",
    /* Deliberately the darkest step against the lightest ground: a headscarf
       is one flat shape with no hairline to give it an edge, so the only thing
       separating it from the background is value. */
    clothes: "#0A2470",
  },
  {
    file: "gopal",
    ground: ["#F25B4E", "#FF8C7F"],
    skin: "#7A451C",
    hair: "#15100F",
    hairShape: "short",
    clothes: "#E24A3F",
    beard: true,
  },
  {
    file: "meera",
    ground: ["#E24A3F", "#FF6A5B"],
    skin: "#B57A48",
    hair: "#1F1512",
    hairShape: "bun",
    clothes: "#8C2F27",
  },
  {
    file: "suresh",
    ground: ["#1A3688", "#2E4CA6"],
    skin: "#96612E",
    hair: "#3A3A3A",
    hairShape: "receding",
    clothes: "#0A2470",
  },
];

/** Hair drawn behind the head, per style. */
const hairBack = (p) => {
  switch (p.hairShape) {
    case "long":
      return `<path d="M22 52c0-16 10-28 26-28s26 12 26 28v22c0 6-4 9-8 9H30c-4 0-8-3-8-9z" fill="${p.hair}"/>`;
    case "wrap":
      // A headscarf: one shape, no hairline, so it reads as cloth not hair.
      return `<path d="M21 54c0-16 12-29 27-29s27 13 27 29v10c0 12-8 20-18 22H39c-10-2-18-10-18-22z" fill="${p.clothes}"/>`;
    case "bun":
      return `<circle cx="48" cy="26" r="9" fill="${p.hair}"/><path d="M24 54c0-15 11-26 24-26s24 11 24 26v14H24z" fill="${p.hair}"/>`;
    default:
      return "";
  }
};

/** Hair drawn over the head, per style. */
const hairFront = (p) => {
  switch (p.hairShape) {
    case "short":
      return `<path d="M27 50c0-13 9-22 21-22s21 9 21 22c0-6-9-9-21-9s-21 3-21 9z" fill="${p.hair}"/>`;
    case "receding":
      return `<path d="M29 54c0-14 8-23 19-23 8 0 14 4 18 10-6-4-12-5-19-3-9 2-15 8-18 16z" fill="${p.hair}"/><path d="M28 52c-1 6 0 11 1 15-4-4-5-11-1-15z" fill="${p.hair}"/>`;
    case "long":
      return `<path d="M27 50c0-13 9-22 21-22s21 9 21 22c0-7-8-11-14-9-2-6-6-8-11-7-9 2-17 8-17 16z" fill="${p.hair}"/>`;
    case "bun":
      return `<path d="M28 49c0-12 9-20 20-20s20 8 20 20c-3-7-11-10-20-10s-17 3-20 10z" fill="${p.hair}"/>`;
    case "wrap":
      return "";
    default:
      return "";
  }
};

const svg = (p) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.ground[0]}"/>
      <stop offset="1" stop-color="${p.ground[1]}"/>
    </linearGradient>
    <clipPath id="c"><circle cx="48" cy="48" r="48"/></clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect width="96" height="96" fill="url(#g)"/>
    ${hairBack(p)}
    <!-- Shoulders, cut off by the circle. -->
    <path d="M18 96c0-15 13-24 30-24s30 9 30 24z" fill="${p.clothes}"/>
    <!-- Neck, then head. -->
    <path d="M41 62h14v14H41z" fill="${p.skin}"/>
    <ellipse cx="48" cy="47" rx="18" ry="21" fill="${p.skin}"/>
    ${hairFront(p)}
    ${p.beard ? `<path d="M31 51c1 11 8 19 17 19s16-8 17-19c0 9-3 15-8 18-3 2-6 3-9 3s-6-1-9-3c-5-3-8-9-8-18z" fill="${p.hair}"/>` : ""}
    <!-- Eyes. Two dots, no mouth: the mascot's register, and a drawn smile at
         this size turns into a smudge. -->
    <circle cx="41" cy="46" r="2.1" fill="#1A1423"/>
    <circle cx="55" cy="46" r="2.1" fill="#1A1423"/>
  </g>
</svg>
`;

mkdirSync(OUT, { recursive: true });
for (const p of PEOPLE) writeFileSync(`${OUT}/${p.file}.svg`, svg(p));
console.log(`wrote ${PEOPLE.length} avatars to ${OUT}`);
