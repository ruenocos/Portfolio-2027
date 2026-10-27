# Wessel Oud

Portfolio 2027. Next.js 16.4 (App Router), Tailwind 4, Sanity, hosted on Netlify (wonsfolio).
The old site is kept on the `archive/old-site` branch.

## Run it

```bash
cp .env.example .env.local   # then add the Sanity read token
npm install
npm run dev
```

- http://localhost:3000 — the site
- http://localhost:3000/system — every token in light, dark and night (not indexed)
- http://localhost:3000/studio — Sanity Studio

## Design tokens

`design/` holds copies of the system files from the studio folder:
`DESIGN.md` (source of truth), `tokens.json` and `motion-tokens.json`.

`npm run tokens` compiles them into `src/styles/tokens.css` (it also runs
before `dev` and `build`). Don't edit that file by hand. It gives you:

- colour variables per mode on `[data-mode="light|dark|night"]`, as Tailwind
  colours (`bg-canvas`, `text-ink`, `text-tang-ink`, `bg-grape`…)
- fonts, radii, spacing and easings in `@theme` (`font-mono`, `rounded-media`,
  `p-inset`, `ease-spring`, the `stack:` 900px breakpoint)
- one utility per text style (`text-display`, `text-statement`, `text-label`…),
  with the mobile steps below 900px built in

To change a token: update the JSON in the studio folder first, copy it here,
run `npm run tokens`.

## Modes

`src/lib/mode.ts` decides the mode before the first paint: night from sunset
to sunrise in Amsterdam (computed in the browser), otherwise the system's
light or dark. `setAsleep()` puts Wessel to bed or wakes him for the rest of
the visit, until the sun next rises or sets. Mode changes cross-fade over 0.9s.

## The shell

Everything every page leans on lives in `src/app/(site)/layout.tsx` and
`src/components/shell/`: the sticky header (nav, day/night switch, Pause
motion, phone menu below 900px), the footer (`#contact`, where every
"Contact ↓" lands), the grid frame (`<Row>`: dotted side | cell | dotted
side, 1px hairlines) and the phone Contact pill. Sanity Studio sits outside
the `(site)` group, so it gets none of it.

Motion:

- `src/lib/motion.ts` is the motion store. `useMotion()` gives `mode`,
  `asleep`, `paused`, `reduced` and `calm` (paused or reduced). Anything that
  moves by itself checks `calm` and shows its end state. `<html>` mirrors it
  before the first paint (`.pz`, `data-motion="calm|full"`).
- Lenis (lerp .12) runs on desktop mouse only, never while calm.
- Page changes cross-fade: 240ms out, then 240ms in (`PageFade`, React
  `<ViewTransition>`). Then the first screen's `main [data-row]`s play the
  house entrance (rise 16px + fade, 80ms apart). A row can mark its own
  blocks with `data-enter`. Home's boot intro can skip it by setting
  `<html data-boot>`.
- `src/components/CursorLayer.tsx` is Wessel's layer. It sits in the shell
  (which stays mounted between pages), so he survives page changes.
- Status messages go to `#live` through `announce()`.

## Components

Every component is on `/system` in light, dark and night, and the live ones
(project rows, tool filter, media) run on the page itself. The prototype drew
some parts several times; they're merged into one component each (list in
`studio/web/build/phase-3/component-inventory_v01.md`).

- `src/components/parts/`: `SectionLabel`, `Divider`, pills (`SizePill`,
  `GrapePill`, `OutlinePill`, `KeyChip`, `MockTag`, `Slot`), `Tools` +
  `ToolFilter`, `TextLink` (letter hop + arrow), `Media` / `MediaFigure`,
  `ProjectRow(s)`, `Crumb`, `Facts`. Styles in `src/styles/components.css`.
- `Media` plays its loop only while on screen, at 0.75×, and shows the
  poster while calm. The source loads only when it comes near the screen.
- `src/lib/wessel.ts` is Wessel's engine: his travel, beats, selections,
  pins, redlines and the night bots. Springs and thresholds come from
  `motion-tokens.json` (`wessel`). A section gets a beat with `useBeat()`
  (`src/components/canvas/`): `day` for Wessel, `night` for a bot. Beats run
  one at a time, once per mode, and check in with `live(g)` so a mode or page
  change stops them.
- The visitor's grape "You" cursor (mouse only) reads its label from the
  nearest `[data-you]`: project media say "View case" or "Case study soon".
- Selections, redlines and bots go on `#ovl`, a page-coordinate layer in the
  shell, so they scroll with the page.

## Site basics

- Favicon (`src/app/icon.svg`, `favicon.ico`, `apple-icon.png`): Wessel's smiley.
- `robots.ts` and `sitemap.ts` use Netlify's `URL` and `CONTEXT`: deploy
  previews are never indexed; production hides `/studio`, `/system`, `/api`.
- The phone's browser bar takes the canvas colour of the mode (theme-color).
- `not-found.tsx` and `(site)/error.tsx` keep the shell. Their copy is a
  placeholder (`data-mock`).
- Security headers in `next.config.ts` (no CSP yet).

## Sanity

Project `u0p6z6ze`, dataset `production` (public: never put private content in
it). Studio at `/studio`, draft mode at `/api/draft-mode/enable`. Schemas in
`src/sanity/schemaTypes` are carried over from the old site and get reworked
with the pages.
