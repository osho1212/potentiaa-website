<!-- RECOVERED FILE.

     14 comments across app/, components/, lib/ and styles/ cite this document
     as the governing authority for this project. It was not in the repository.
     The system critic found every one of those citations dangling and called
     restoring it the highest-priority item, on the grounds that until it exists
     the design loop is auditing itself.

     Below is the owner's own design system, pasted into the session that
     started this project and never written to disk. It is recovered from that
     message and verified character-for-character against it: only whitespace
     differs, because the paste arrived with its newlines flattened into spaces
     and the headings and list items have been re-broken onto their own lines.
     Nothing else was changed, added or removed - including the caveat the
     document makes about itself, which is that it was compiled from brand notes
     and a logo file rather than from a codebase or Figma. -->

# Potentiaa Design System — design.md

Portable design reference. Compiled from this project's `readme.md`, `tokens/*.css`, and `components/*`. Paste this file into any project/tool that needs Potentiaa's brand rules.

## 1. Brand

Potentiaa helps small businesses stop losing time and money to outdated manual systems — consulting, building, and maintaining personalised digital solutions (billing/inventory software, websites, management apps) so owners can run operations from their phone.  Products covered: **Business App** (mobile management: billing, inventory, orders) and **Marketing Website** (sells the consulting/build service).  No codebase/Figma/deck was supplied as source of truth — this system originates from uploads/Logo.png and written brand notes (Sora/Manrope fonts; midnight/electric blue/coral/cool gray/soft white palette). Rebuild from real source material if it becomes available.

## 2. Voice & content

- Direct, practical, owner-to-owner. Talk about *time and money*, never "digital transformation" or "synergy".
- Second person for the reader ("you run your business from your phone"); Potentiaa is "we".
- Sentence case everywhere (headings, buttons) — never Title Case or ALL CAPS.
- Short, plain sentences, one idea each.
- No emoji — icons carry visual weight instead.
- Vibe: calm competence. Confident, not salesy. No hype punctuation, no urgency countdowns.
- Reference line: *"Stop losing time and money to outdated manual systems. We consult, build, and maintain personalised digital solutions — from billing and inventory software to websites and management apps — so you can run your operations from your phone and focus on what actually matters."*

## 3. Color

```
/* Midnight — ink / dark surfaces */
```

`--midnight-900:#000E33; --midnight-800:#001B5E; --midnight-700:#0A2470;`
`--midnight-600:#1A3688; --midnight-500:#2E4CA6; --midnight-100:#DFE5F5; --midnight-50:#F1F3FB;`
`/* Electric Blue — primary interactive accent */`
`--blue-700:#123FCC; --blue-600:#1B4CE0; --blue-500:#265DFF; --blue-400:#4C79FF;`
`--blue-300:#7E9BFF; --blue-100:#D9E2FF; --blue-50:#EEF2FF;`
`/* Coral — secondary/warm accent, CTAs on dark */`
`--coral-700:#E24A3F; --coral-600:#F25B4E; --coral-500:#FF6A5B; --coral-400:#FF8C7F;`
`--coral-300:#FFB0A5; --coral-100:#FFE1DC; --coral-50:#FFF1EE;`
`--magenta-500:#FA4592; /* gradient-only, sampled from logo — never a standalone UI color */`
`/* Cool Gray — neutrals, blue-tinted (never pure gray) */`
`--gray-900:#141A2E; --gray-800:#20273F; --gray-700:#333C58; --gray-600:#4B5476;`
`--gray-500:#6B7494; --gray-400:#96A0BC; --gray-300:#C1C8DC; --gray-200:#DEE2EE;`
`--gray-100:#EDF0F7; --gray-50:#F5F7FB;`
`--white:#FFFFFF; --soft-white:#FAFBFE;`
`--status-success:#1F9D65; --status-warning:#D98E1B; --status-danger:#D6423A;`
Semantic aliases:
`--bg-page` (soft-white) /
`--bg-page-dark` (midnight-900);
`--surface-card` (white) /
`--surface-card-dark` (midnight-800);
`--surface-muted`,
`--surface-sunken`;
`--text-primary/secondary/tertiary`,
`--text-on-dark(-secondary)`,
`--text-on-accent`;
`--border-default/strong/on-dark`;
`--accent-primary(-hover/-active)` = blue;
`--accent-secondary(-hover/-active)` = coral;
`--focus-ring` = blue-400.  Gradients (used sparingly, high-impact only — never on buttons/small chrome):
`--gradient-brand: linear-gradient(135deg, midnight-800 0%, blue-500 52%, coral-500 78%, magenta-500 100%)`;
`--gradient-blue-coral: linear-gradient(135deg, blue-500, coral-500)`.

## 4. Type

- Display/headings: **Sora**, 600–800 weight, tracking `-0.02em`.
- Body: **Manrope**, 400–600 weight, normal tracking.
- Both via Google Fonts (no local binaries supplied — swap in self-hosted `.woff2` if provided).

```
--fs-xs:12px; --fs-sm:14px; --fs-base:16px; --fs-md:18px; --fs-lg:22px;
```

`--fs-xl:28px; --fs-2xl:36px; --fs-3xl:48px; --fs-4xl:64px;`
`--lh-tight:1.1; --lh-snug:1.25; --lh-normal:1.5; --lh-relaxed:1.65;`
`--fw-regular:400; --fw-medium:500; --fw-semibold:600; --fw-bold:700; --fw-extrabold:800;`
`--tracking-tight:-0.02em; --tracking-normal:0; --tracking-wide:0.04em;`

## 5. Spacing & radius

```
--space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:20px; --space-6:24px;
```

`--space-8:32px; --space-10:40px; --space-12:48px; --space-16:64px; --space-20:80px; --space-24:96px;`
`--radius-sm:8px; --radius-md:14px; --radius-lg:20px; --radius-xl:28px; --radius-full:999px;`
`--container-max:1200px;`
Radii are generous, echoing the logo's rounded squares: sm = inputs/chips, md = buttons/small cards, lg = cards/panels, xl = hero panels/modals, full = pills/avatars.

## 6. Elevation, motion, states

```
--shadow-sm:0 1px 2px rgba(10,20,60,.06),0 1px 1px rgba(10,20,60,.04);
```

`--shadow-md:0 4px 12px rgba(10,20,60,.08),0 2px 4px rgba(10,20,60,.05);`
`--shadow-lg:0 12px 32px rgba(10,20,60,.12),0 4px 8px rgba(10,20,60,.06);`
`--shadow-glow-blue:0 8px 24px rgba(38,93,255,.28);   /* dark-surface CTA emphasis only */`
`--shadow-glow-coral:0 8px 24px rgba(255,106,91,.28);`
`--ease-standard:cubic-bezier(.4,0,.2,1); --ease-out:cubic-bezier(0,0,.2,1);`
`--duration-fast:120ms; --duration-base:200ms; --duration-slow:320ms;`
- **Hover**: shift one step darker along the element's own hue; never lighten. Cards lift to
`--shadow-lg`.
- **Press**: `transform: scale(0.98)` + the `-active` color step.
- **Focus**: always-visible 2px
`--focus-ring` outline, 2px offset — never suppressed.
- **Animation**: fast, functional, never bouncy/spring. No parallax.
- **Borders**: 1px
`--border-default` on light surfaces,
`--border-on-dark` (translucent white) on dark. No colored left-border accents.
- **Cards**: white surface,
`--radius-lg`,
`--shadow-md`, 1px
`--border-default`.
- **Backgrounds**: mostly flat soft-white or midnight; the brand gradient is the one expressive texture, used rarely (hero/splash). No illustration style, no repeating patterns.
- **Transparency/blur**: overlays/scrims and
`--border-on-dark` only — never decorative glass.
- **Imagery**: none supplied; use `<image-slot>`-style placeholders, never generated/stock images.

## 7. Iconography

No brand icon set supplied — uses **Lucide** (CDN: `unpkg.com/lucide-static`) for its 2px-stroke line style matching the mark's rounded-square geometry. Flagged substitution — swap if a bespoke set arrives. No emoji, no unicode-as-icon.

## 8. Components

Authored from scratch (no source library given), grouped by concern in `components/`:
- **core/**: Button, IconButton, Card, Badge, Tag
- **forms/**: Input, Select, Checkbox, Radio, Switch
- **feedback/**: Dialog, Toast, Tooltip
- **navigation/**: Tabs  Each has a `.jsx` implementation, `.d.ts` props contract, and `.prompt.md` usage doc in this project — pull those in directly for exact markup/props; this file covers the token layer that drives them.

## 9. Logo & assets

assets/logo.png — three rounded squares in a rising staircase, midnight → electric blue → coral/magenta gradient. No wordmark in source; pair with "Potentiaa" set in Sora Bold when a wordmark is needed.

## 10. Usage

Link the token stack (tokens/colors.css, `typography.css`, `spacing.css`, `shadows.css`, `base.css`, or the aggregated `styles.css`) and build with the CSS custom properties above — never hardcode hex/px values. Full component source lives in `components/`, UI kit recreations in `ui_kits/`.
