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

## Sanity

Project `u0p6z6ze`, dataset `production` (public: never put private content in
it). Studio at `/studio`, draft mode at `/api/draft-mode/enable`. Schemas in
`src/sanity/schemaTypes` are carried over from the old site and get reworked
with the pages.
