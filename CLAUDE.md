@AGENTS.md

# Working on wesseloud.cv

Wessel Oud's portfolio. Read `README.md` for how the site is built and
`design/DESIGN.md` for the design system. This file holds the rules that
aren't written down anywhere else. Follow them without being asked.

## The site

- It lives at **wesseloud.cv**, nothing else. Never link or test against a
  `*.vercel.app` production URL; code reads the domain from
  `VERCEL_PROJECT_PRODUCTION_URL` (`src/lib/site.ts`).
- It's "a look into Wessel": a portfolio for fun work, shared with his team at
  WP Masters. No job-hunt lines anywhere (no "looking for", "open to",
  "medior", hire-me asks) in copy, meta or CTAs.
- Light and dark only, following the system unless the visitor picks. Night
  mode, the purple hour, bots and sunset logic are gone for good.
- Never invent copy, numbers, logos or claims. Placeholder copy is marked
  `data-mock` and only shows with `?mocks`.

## Content goes to Sanity, not to PRs

- Copy, case sections, posters, loops and Playground posts are content. Write
  them in Sanity through the **Sanity connector** (project `u0p6z6ze`,
  dataset `production`) and stop there. No PR, and no need to update the code
  fallbacks in `src/content/`.
- The dataset is public: never put private content in it.
- Publishing is Wons's call. Leave changes as drafts until he says go.
- Open a PR only when code, schema or layout changes.
- Schema change: edit `src/sanity/schemaTypes/`, run `npm run typegen`, commit
  `src/sanity/schema.json` and `src/sanity/types.ts` (CI fails when they're
  stale). Helpers interpolated into a `defineQuery()` end in `as const`.
  Deploy the schema with the connector after the PR merges.
- The token scripts in `scripts/` (`seed-sanity.ts`, `fill-placeholders.ts`)
  are a fallback for bulk jobs; prefer the connector.

## Build rules

- **Tokens over literals.** Colours, type, spacing, radii and easings come from
  `design/tokens.json` and `design/motion-tokens.json` through
  `npm run tokens`. Never edit `src/styles/tokens.css` by hand. Type sizes come
  from the scale (12 · 16 · 20 · 24 · 32 · 40 · 48 · 64); ask before adding one.
- **Letter hop on every text link** (`<Hop>` in `src/components/shell/Hop.tsx`,
  or `TextLink`). The one exception is the big footer email link.
- **Header:** three ruled boxes (logo | nav + switch + Pause | Contact), and the
  sticky header always carries its own bottom hairline.
- **Shared helpers, not local copies:** `lib/math` (clamp, lerp, easings,
  cssBezier), `lib/media` (narrow, finePointer, touch, STACK_PX),
  `lib/hairline`, `lib/magnet`, `lib/clock`.
- **Anything that moves by itself checks `useMotion().calm`** and shows its end
  state when paused or reduced.
- **Rows and ruled cells never move**: entrances fade a cell's content, never
  the cell (it shows a grey band).
- **Hidden pages stay in the DOM** (React Activity). A `.page:has(X)` rule or a
  document-wide `querySelector` also hits pages you've left; use
  `:has(X:not([style*="display: none"] *))` or scope to the visible page.
- **Media:** edge to edge with the standard 24 radius. No captions under media,
  no panels, fills or borders around shots. Don't reuse an image on two pages
  (Work reusing Home's project rows is the one exception).
- **Comments say why**, not what changed or who picked it. No dates, version
  numbers or "Wons picked" in code: history lives in git.

## Commits and pushes

Every push builds a Vercel preview. Batch work locally, check it on a local
build, and push once per finished round. Before pushing:

```bash
npm run typecheck && npm run lint && npm run build
npm run typegen   # only after a schema or query change
```

CI (`.github/workflows/checks.yml`) runs the same plus the accessibility scan.

## Checking pages

Run the site, then screenshot every page at 1440 and 390 in light and dark:

```bash
npx next build && npx next start -p 3100
node scripts/shots.mjs                       # local build
node scripts/shots.mjs https://wesseloud.cv  # live site
node scripts/shots.mjs <preview-url>         # a Vercel preview
```

It reads the page list from the sitemap, skips home's first-visit intro, and
writes a first-screen and a full-page shot per page into `shots/<time>/`
(gitignored), with an `index.html` contact sheet and `log.json` (console
errors, sideways scroll, status). Options: `--out dir`, `--pages /,/about`,
`--calm` (reduced motion), `--fold` (first screen only). A full run takes
about two minutes.

**Vercel previews sit behind a login.** When `VERCEL_AUTOMATION_BYPASS_SECRET`
is set (it is in the cloud environment), `shots.mjs` sends it as the
`x-vercel-protection-bypass` header. For anything else, add that header
yourself, or use the Vercel connector's `get_access_to_vercel_url` for a
temporary share link.

Other checks, all against a running site:

- `node scripts/check-a11y.mjs [base]`: axe on every page, desktop and phone
- `node scripts/check-intro.mjs [base]`: home's first-visit intro
- `node scripts/check-wessel.mjs [base]`: how Wessel's cursor moves on scroll

If the global Playwright can't find its browser, launch Chromium with
`executablePath: "/opt/pw-browsers/chromium"`.

## Working with Wons

- Ask every open question as an option card (2 to 4 options, one recommended,
  room for his own answer), one at a time. Never a list of questions in a
  message.
- Show a before/after for any system-wide visual change before building it,
  at full page size, not as small tiles.
- After building a page, review it against a rubric with independent
  reviewers until it scores 8/10 or more.
