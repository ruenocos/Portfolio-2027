# Wessel Oud · Design system v02

**Status:** v02.1 (27 Oct 2026: Pause motion, cross-fade + load entrance, case video order). Locked to home preview v90 (27 Oct 2026; v89 + mobile patch v01, see `references/mobile-audit/`). This is the one source of truth for the 2027 portfolio.
**Live reference:** https://claude.ai/artifact/9TL3DccpMhDaYaCva7DYxj (source: `studio/web/preview/index.html`)
**Machine files:** `tokens.json` (colour, type, space, radius), `motion-tokens.json` (easing, durations, behaviours). Figma variables and text styles use the same names.
**Older docs:** the v01 files (cyan palette, ASCII, Archivo, cell swarm) are in `system/_archive/` and no longer apply.

How to use this file:
- Read it before you design or build anything new.
- If something isn't covered here, ask Wons first. Don't invent a new pattern.
- When Wons approves a change, update this file, the token files and Figma in the same round.

---

## 1. The idea in one paragraph

The site is **Wessel's design file**, and Wessel is in it with you. The page is a square, ruled Figma-like canvas with round objects on it. Wessel's tangerine cursor travels down the page and does one small, real design job per section as it scrolls in: select, drag, paste, leave a comment pin. By night (sunset to sunrise, Amsterdam) he's asleep and named bots do the chores. The visitor is a plain grape "You" cursor that only points. The page is precise, calm and roomy; the fun comes from Wessel's behaviour, not from decoration.

**Three words:** precise · playful · calm.

## 2. Principles (check every new screen against these)

1. **One thing at a time.** One mover per screen. Wessel acts after a section settles. Entrances wait while he works.
2. **Roomy over clever.** Air is a feature. If a section feels full, remove, don't shrink.
3. **Wessel is a character, not an effect.** He has his own life: he never follows the visitor's pointer, he parks where he last worked, he plays every beat in full, and he re-enters from the edge he left by.
4. **Colour tells who acts.** Tangerine = Wessel made or did it. Grape = you can touch it. Never mix the two roles.
5. **Only Wessel selects.** No hover bounding boxes for the visitor. Selection boxes, size labels, pins and handles belong to Wessel and the bots.
6. **Premium finish only on what Wessel made** (Focus dioramas, work media). The grid, cells and controls stay flat.
7. **Simple, consistent motion.** Reuse the existing moves (magnetism, selection, paste, pin, spring). No new effect without a reason, and never stack effects. Several were tried and dropped: page-wide colour ends, view-transition circles, row waves.
8. **Real content only.** Never invent copy, numbers, clients, logos or claims. Mock text must be marked `data-mock` and logged in `copy/home-copy_v01.md`.

## 3. Colour

Three modes. Light and dark follow the system by day. **Night ("purple hour") always wins** from sunset to sunrise in Amsterdam (52.37N 4.90E, computed in the browser, no API), whatever the system theme. The header switch lets the visitor put Wessel to bed or wake him.

| Token | Light | Dark | Night | Role |
|---|---|---|---|---|
| `canvas` | #FAF8F4 | #12100E | #0E0D1A | cell background |
| `ink` | #161412 | #F4F1EC | #ECEAF6 | text |
| `mute` | #736B61 | #9C958A | #8D89A8 | secondary text (≥4.5:1 on canvas) |
| `line` | #E6E0D7 | #26231F | #24223A | hairlines; the 1px gaps between cells |
| `fill` | #EFEBE4 | #1C1A17 | #17152B | media placeholders, quiet fills |
| `dot` | #D9D2C7 | #2E2A25 | #2B2947 | dot grid |
| `tang` | #F0611F | #FF7A3D | #BC6443 (ember; was #B05E3E, raised to pass AA on small tags 2026-10-27) | **Wessel's ink**: his cursor, name, logo, selections, pins, everything he draws |
| `tang-ink` | #C2410C | #FF7A3D | #C27052 | tangerine for small text (AA) |
| `on-tang` | #161412 | #12100E | #0E0D1A | text on tangerine pills |
| `grape` | #6A3DF0 | #B39BFF | #B39BFF | **yours to touch**: links, focus rings, "You" cursor, text selection, active states |
| `on-grape` | #FFFFFF | #12100E | #0E0D1A | text on grape |
| `bot` | #161412 | #F4F1EC | #C9C6DC | night bots (dashed outline tags at night) |

Rules:
- Tangerine on canvas is about 3.1:1 in light. It is fine for the giant name and graphics. **Small tangerine text uses `tang-ink`.** Tangerine pills carry dark text (`on-tang`), never white.
- At night Wessel is asleep, so his tangerine dims to ember. It returns to full when you wake him.
- Neutrals are warm, never pure grey. Don't add new colours. Figure colours (`--d-*`, clay `--k*`) are scoped to the Focus dioramas only.
- Mode changes cross-fade all tokens over 0.9s (`.lights`).

## 4. Typography

Fonts: **Bricolage Grotesque** (display + text; opsz 12–96), **Geist Mono** (labels), and **Instrument Serif Italic** for accents only.

| Style | Spec | Used for |
|---|---|---|
| Display | Bricolage 800 · 192px · lh .92 · ls -4% | the name only: hero WESSEL [reel] OUD and the bookend |
| Statement | Bricolage 500 · 56px (40 mobile) · lh 1.05 · ls -2% | "All work" |
| Headline | Bricolage 500 · 44px (34 mobile) · lh 1.05 · ls -2% | About title, Focus statement |
| Email | Bricolage 500 · 32px (fluid to 24 mobile) · lh 1.1 · grape 2px underline | the email address only |
| Accent | Instrument Serif Italic · 36px · lh 1.05 | hero role line and single inline accent words at 1.08em (*feel*, *notice*) only. Not on titles or values (review 2026-10-27) |
| Title | Bricolage 500 · 32px/36 · −1% | project titles in rows and cards; 28px mobile |
| Lead | Bricolage 400 · 20px/32 | cell labels (Email, Elsewhere), short leads |
| Body | Bricolage 400 · 16px/24 | running text |
| Small | Bricolage 400 · 14px/20 | comment-pin bubbles, legal bar |
| Link | Bricolage 500 · 16px/20 · sentence case | text links, buttons and pills you press (Contact, Copy email, Show all) |
| Label | Geist Mono 500 · 12px/16 · uppercase · +6% | section labels, meta, the status line. Not for links or buttons (2026-10-27) |
| Micro | Geist Mono 500 · 11px/14 · +4% · tabular figures | numbers and keys: size pills ("203 × 116"), ⌘C/⌘V chips, counters |
| Micro caps | Geist Mono 500 · 11px/14 · uppercase · +6% | word pills: "▶ Reel", "Case study soon", frame and layer labels |
| Wordmark | Bricolage 800 · 28px · ls -3% | header wordmark only |
| Cursor tag | Bricolage 700 · 13px | cursor name tags only (the name renders bold) |

Rules:
- No new sizes or styles without Wons. Mobile steps down: Display scales with width (51px at 390), Statement goes to 40, Headline to 34 (About title and Focus statement both), Email is fluid to 24. Weights never change between breakpoints.
- The name rows are aligned on **glyph ink**, not text boxes. The middle object (reel or smiley) is centred between the glyphs and on glyph height.
- Headings use `text-wrap: balance`. Running text stays under about 65 characters per line.
- Voice: first person "I", dry and precise, a little wry. The ban list is in `copy/home-copy_v01.md`.

## 5. Layout: the canvas

- **Frame:** every row is 3 columns: side `max(96px, (100vw − 1600px)/2)`, content, side. Side columns carry the dot grid. Content max width is 1600px.
- **Ruled cells:** cells sit on a `line` background with `gap: 1px`, so siblings share single hairlines. No shadows on cells and no card borders. Cells are square-cornered (radius 0).
- **Dot grid:** 1.1px dots every 16px, in `dot`. It sits on the side columns, the hero, the dividers and the bookend.
- **Insets and rhythm:** content inset is 40px desktop and 20px mobile. Sections use 96px vertical padding (40 mobile). Section dividers are 168px rows (96 mobile; the tall ones are 240 at every width), with the label at bottom-left (inset 40, 20px from the bottom; mobile inset 20, 16px from the bottom).
- **Section labels:** `{ About }` in Label style, ink. Only the braces are tangerine (`tang-ink`). No counter (dropped 2026-10-27).
- **Round things inside the square frame:** media radius 24 (`--rm`), pills 999, handles round, chips are circles.
- **Status line** (2026-10-27): "Awake in Amsterdam, 14:32" / "Asleep in Amsterdam, 23:10", Label style, live Amsterdam time in `mute`. Still: no pill, no lamp.
- **Mode values** are variables set on every `[data-mode]` element, never `[data-mode] .x` ancestor selectors, so a light panel inside a night page stays light.
- **Tactile objects** (2026-10-27): things you can press (pills, Contact, Copy email, Pause, the switch knob) plus cursor tags, pins and key chips get a lit top edge (no gradient sheen) and a short drop tinted in their own colour, pulled toward black in dark and night (`tactile.dropDark`); key chips are keycaps with a 2px darker base. Marks stay flat: selections and their size labels, redlines, bot tags, section labels, text links, the status line, tool chips, media. Round + lifted = you can press it; small rectangle + flat = a mark. Strength per mode in tokens.json `tactile` (night is about a fifth). Pressed: sinks 1px (`easing.press`, 120ms), off while calm.
- **Breakpoint:** one main switch at 900px (stack to one column, 20px insets), plus 600px for small tweaks. Use `hover:none` for touch behaviour.
- **Tap targets:** at least 44px. Grow the hit box, not the visible thing (`::before` inset, padding with negative margin, or a JS hit-slop when Wessel measures the element, like the reel).
- **Tablet (600–900):** project rows go text | media (two columns); Focus stays one card per row.
- **Long data:** titles and the email wrap (`overflow-wrap`), tool rows wrap, an empty Tools block hides. Set `lang` on Dutch titles in the build so `hyphens:auto` works.

### Pages
| Page | Status |
|---|---|
| Home | Locked (this file). |
| About | Direction picked 2026-10-27: **A1 Version history** (board `references/about-contact/`). Not built. Needs years for Mediacollege, motion and WP Masters. |
| Case study | Row order since 2026-10-27: crumb → opening (title | lead) → **header video** → facts → read. (Wons 2026-10-27: video under the title.) De Saak v01 built: `web/hifi/case/case-desaak_v01.html`, spec `web/case-study-spec_v02.md`. Title = Statement (56 / 40 mobile), facts and section headings = Accent 36. |
| Contact | **No page.** Every contact link (header "Contact ↓", CTAs) scrolls to the home footer. |
| All work | Linked from the archive hand. Not designed yet. |

### Page order (home)
Header (sticky, 90px) → Hero → `{ About }` → About (story + photo deck) → `{ Selected work }` → 3 project rows → `{ Focus }` → Focus (statement + Daily kit | 3 dioramas) → `{ See more }` → Archive hand + "All work" → Bookend (Wessel ☺ Oud) + Email / Elsewhere / More → legal bar.

## 6. Components

| Component | Spec |
|---|---|
| **Header** | Logo smiley (eyes follow the pointer) + "Wessel" wordmark that slides in once the hero name scrolls away · sentence-case nav Work/About/Playground (Link style) · day/night switch (grape) · Pause motion button · "Contact ↓". Sticky. **Below 900px:** logo · switch · pause · 44px menu button (two lines that turn into ×). |
| **Phone menu** | Wons 2026-10-27. A ruled panel under the header on the dot canvas: Work, About, Contact ↓ as 88px rows in Mobile/Headline (34), arrow in grape. Rows enter with the house entrance (60ms stagger). Closes on a link, Esc, the button or the empty canvas; locks page scroll; focus moves in and back. Built from the header's own links. |
| **Contact pill** | Phones and tablets: grape "Contact ↓" pill docks bottom-right once the hero has gone (stage spring), hides at the footer, in the reel and while the menu is open. |
| **Hero** | Height `clamp(480px, 80svh − 91px, 720px)`, or `clamp(420px, 72svh − 70px, 620px)` on mobile. Mono meta top-left (Based in / Local time). Name row WESSEL [reel] OUD. Role bottom-right in Accent. Letters are split into spans for the intro. |
| **Reel** | 1.05em × .6em of the name, radius scales with size. Magnetism toward the pointer. Grape "▶ Reel" pill on hover. Opens a dialog player. |
| **Project row** | Desktop: equal thirds: title (Accent) + summary + timeline \| portrait media 3:4 at 78% of the column (max 520), magnetism + slight rotation on the side columns, still over the middle \| role + tools + pin note. Media plays at 0.75×. The You tag reads "View case"; without a case page it says "Case study soon". Mobile: one column: title + summary, timeline, media (278 × 370), then role and tools side by side. |
| **Focus** | Left: sticky statement (Headline with Accent words) + Daily kit (56px tool chips). Right: 3 iso dioramas (UX, Motion, AI). Hovering a card ↔ its chips light up (grape title + chip rings), both ways. Never cut this interplay. Wessel's day beat on a card also applies its hover, so you see that you can hover. Mobile: statement, then Daily kit, then one card per row; tap = hover. |
| **About** | Story text left + shuffle deck of 3 photos right (click, or Wessel once by day, tucks the top photo behind). |
| **Archive** | A fanned hand of cards resting at .82 scale, with "All work →" in Statement. |
| **Bookend** | The name again in Display with the smiley in the middle. It starts empty and Wessel copy-pastes it in (⌘C from the header wordmark, then ⌘V three times). Hidden until pasted, with a 3s fallback. |
| **Contact** | Email style with a grape underline (`mailto`) + "Copy email" pill (copy feedback in Wessel's voice) · LinkedIn · More links. |
| **Cursor tag** | Figma-style pointer (rounded arrowhead, 23px, 1.75 outline in canvas colour) + pill tag with a square corner toward the tip, about 6px clear of the arrow's notch. Wessel = tangerine, You = grape, bots = ink (dashed outline at night). |
| **Comment pin** | Round avatar (smiley) + bubble, radius 4/16/16/16, Small style, canvas fill + line border + soft shadow. Pops in on a spring, text types at 85ms per character, shrinks to a dot when done. **One pin visible at a time.** |
| **Selection** | 1.5px tangerine box + 4 round handles + Micro size pill below ("203 × 116"). Only Wessel and the bots make them. |
| **Chips** | ⌘C / ⌘V key chips: Micro, `ink` fill with `canvas` text, radius 6. Size labels: Micro, `tang` fill, `on-tang` text, radius 3 (`radius.mark`, how Figma draws them), flat. Mock tag: dashed, radius 2 (`radius.tag`). |
| **Tool chips** | Brand logos as circles: 56px in Daily kit, 32px in project rows. Logos are the only non-system colours outside the dioramas. |
| **Media** | Project media: portrait 3:4 MP4 (muted, looping, plays in view at 0.75×) + JPG poster. About: 3 portrait photos. Radius 24 (`--rm`). |
| **Arrows** | One drawn arrow icon (Wons 2026-10-27, replaces the text glyphs): 16px grid, 1.5px stroke at every size, round ends, current colour, 1.15em next to labels. Rotated per meaning: → inside the site, ↗ leaves the site (in `mute`), ↓ scrolls down, ← back, ↑ to the top. Build: `<Arrow dir>`. No other icons. |
| **Pause motion** | Wons 2026-10-27 (WCAG 2.2.2). Round button right of the day/night switch on every page: 34px desktop (40 on touch, 44 on phones), 10px after the switch (6px on phones), hit area 44. Rest: `fill` + `line` outline, two-bar glyph in `mute`. Hover: grape outline, ink glyph, Micro caps tip "Pause motion" below (ink pill, canvas text). Paused: grape fill, ▶ glyph in `on-grape`, tip "Play motion". the name swaps with the visible tip ("Pause motion" / "Play motion", WCAG 2.5.3) and there is no `aria-pressed`, so name and state never contradict; status to the live region ("Motion paused" / "Motion back on", proposed copy). Figma: Control / Pause motion. |
| **Focus ring** | 2px grape outline, 3px offset, radius 4. |

## 7. Wessel's cursor (behaviour rules)

- **One Wessel on screen, always.** He never follows your pointer.
- **Beats:** one job per section, triggered once per mode when the section is about 40% in view (`need` threshold). Beats always play in full. If you scroll fast (peak above 1500px/s) he waits up to 360ms. Above 4500px/s, or if the section was never really seen, the beat is unmarked and replays when you come back.
- **Between beats:** he parks where he worked while that spot is on screen. Otherwise he follows a beat behind (the page drags him at 55%) and re-enters from the edge he left by. His spring stiffens with scroll speed. His target is clamped to the viewport.
- **Hello intro (hero, day, about 11s):** the W starts as an outline and the u of Oud is crooked. He arrives and his pin types "Hello!". He clicks the W and the fill plops in (squash plus a ring burst). He drags the u straight (tangerine baseline guide). He selects the reel (size pill) and says "Have a look". He goes to the bottom of the hero, says "More below" and nods down twice. The pin then becomes a dot. It skips only when the hero is scrolled 45% away.
- **Idle nod:** if you sit still on the hero, he repeats the down-nod after 7s, 12s and 17s, three times at most.
- **Night:** he sleeps in the corner ("Wessel · asleep", note "Off the clock. Click me if it's urgent."). On phones he sleeps just under the hero (in the divider band), never on the name. Click him or the smiley to wake him; the header switch puts him to bed. Bots do the jobs: Export, Duplicate, Handoff, Rename layers, Content update, Tidy up.
- **Reduced motion:** end states only, no travel.
- **Hold back:** never more than one pin on screen; never select something the visitor is using; never cover the name, role or work.

## 8. Motion

The values are in `motion-tokens.json`. In short:
- **UI:** `cubic-bezier(.2,0,0,1)`, 180ms. Hover, focus, toggles.
- **Stage:** 600ms on the house spring (`linear()` with about 15% overshoot). Used for objects Wessel moves, pills popping in and chips. It is never used for running text.
- **Entrance (one grammar for every block):** rise 16px + fade. Opacity 560ms `(.33,1,.68,1)`, rise 720ms expo-out `(.16,1,.3,1)`. It starts when the block crosses 92% of the screen. Blocks are staggered top to bottom at 60ms, 3 steps at most, and with no stagger if the block is already above 60% of the screen. Entrances wait up to 120ms while Wessel works.
- **Magnetism:** the reel and the project media lean toward the pointer, up to ±28px / ±18px with rotation of x × .07deg. They stay still over the middle card.
- **Smooth scroll:** gentle Lenis (lerp .12), desktop mouse only. Off for touch and reduced motion.
- **Boot:** 2.4s at most, and any input skips it.
- **Page transitions** (Wons 2026-10-27): every page change is a plain canvas cross-fade, 160ms out and 240ms in (`ui` easing; Wons 2026-10-27 21:05 after the motion flow research). The header, day/night switch, Pause and Wessel's cursor hold still during the switch; scroll resets to the top under the veil (Lenis stopped). On case pages the title row comes first and the header video one step (240ms) later. Then the first screen plays the house entrance on load (rise 16px + fade, rows top to bottom 80ms apart, 4 steps at most). Home's first visit keeps its wireframe boot instead (named frames draw, fill, hero springs in, ~1.2s; reconfirmed by Wons 2026-10-27 21:06). Paused or reduced motion: fade only, no entrance. A morph of the project video into the case header was tried and dropped (see taste.md). Build: a root-layout cross-fade (`<ViewTransition>` default) + the entrance on mount.
- **Pause motion:** one switch stops everything that moves by itself: project videos and the reel loop (they show posters), playground drift, Wessel's travel and beats, the bots and the hello intro. Paused = the reduced-motion path (end states, every block visible, no entrances). Remembered for the visit on every page. The reel dialog you open yourself still plays. In the prototype a toggle fades the page and brings it back at the same scroll; in the build it's a motion store that flips without a reload.
- **Never:** overshoot on text, glow, blur trails or sparkle, page-wide colour changes on scroll, snapshot or overlay transitions tied to scroll, more than one expressive move per screen, or motion that hides the name, role or work.

## 9. Accessibility

- Contrast is AA for all text. Use `tang-ink` for small tangerine text.
- Focus rings are visible everywhere. Tabbing reveals blocks that haven't faded in yet.
- Tap targets are at least 44px, including the day/night switch, footer links, the email and sleeping Wessel (his wake target). Hover-only actions have a tap or keyboard equivalent (for example "Case study soon").
- Decorative cursors, pins and bots are `aria-hidden`. Real status goes to the `aria-live` region.
- `prefers-reduced-motion` shows end states and keeps colour changes.
- **Pause motion** (WCAG 2.2.2) is in the header on every page and does the same as reduced motion, for anyone, on demand. Nothing may move on its own for more than 5s without it.

## 10. Figma

- **File:** https://www.figma.com/design/g3dqNNta9ysPSBbBMLxUkP · page **"Home · v89 final"** (first page). Older pages are renamed "Archive · …" (ASCII era, v07).
- **Frames:** Home v89 at 1440 in Light, Dark and Night, and at 390 in Light and Night. Each frame sets its Color mode explicitly, so one build serves all modes. The mobile frames also set Space to Mobile.
- **Variables:** `Color` collection (Light / Dark / Night) with the 12 colour tokens from section 3, named `color/<token>`. `Space` collection (Desktop / Mobile): `space/pad` (inset 40/20), `space/cell` (section 96/40), `space/section-air` (divider 168/96), `space/divider-tall` (240), `space/header` (90), `space/dot-step` (16), `space/tap` (44), `space/radius/media` (24), `space/radius/pill`, `space/radius/focus`.
- **Text styles:** the 13 styles from section 4 with the same names, plus `Mobile/Display` (51 at 390), `Mobile/Statement` (40), `Mobile/Headline` (34) and `Mobile/Email` (24).
- **Components** (frame "Components · v89" above the page): Dot field, Smiley, Tool / Figma · Illustrator · After Effects · LottieFiles · Claude, Section label (Name prop), Pill / Outline · Size · Grape, Cursor / Wessel · You.
- **Rules:** use only variables and text styles. No raw hex. The page sits on a `line` fill with 1px gaps between cells, so corners never show canvas. Dioramas are raster captures per mode. Motion, Wessel's beats and the hello intro live in the preview, not in Figma.
- Leave Wons's sketch (node 1-4) untouched. "Hero locked" means design-locked, not a Figma layer lock.

## 11. Build notes for Next.js

- CSS names in the preview: `--canvas --ink --mute --line --fill --dot --tang --tang-ink --ontang --ongrape --grape --bot`, fonts `--text --mono --serif`, easings `--ui --spring`, `--rm` (media radius), `--side`. In the build, rename `--ontang`/`--ongrape` to match the tokens (`on-tang`, `on-grape`) and compile `tokens.json` into Tailwind `@theme`.
- The preview CSS stacks several overrides on the same selectors (`.stmt p`, `.fx .stmt p`, `.about .title`, `.mail`). In the build, write each text style once as a class or component and change sizes only at the 900px breakpoint. That is how the 40px mobile Focus statement slipped through (fixed in v89).
- Libraries and final tuning are decided in the build (Wons, 2026-10-27). Page transitions and Pause motion are designed (section 8). Stack: Motion 14 + React 19.3 `<ViewTransition>`, a `motion` store (`paused` persisted, read by the beat director, video components and Lenis).

## 12. Change process

1. Propose the change as options (a decision card with room for Wons's own answer).
2. Build it in the preview, publish, and screenshot it in light, dark and night at 1440 and 390.
3. Once Wons approves, update this file, `tokens.json` / `motion-tokens.json`, Figma, and the decision log.
4. Rejected ideas go into `taste.md` with what replaced them, so they aren't proposed again.
