// Measures how Wessel's cursor moves while you scroll: jumps, target flips,
// time off screen, resting on text, and frames spent while nothing moves.
// Needs Playwright with Chromium, and the site running:
//   npm run dev -- -p 3100        (or next build && next start -p 3100)
//   node scripts/check-wessel.mjs [http://localhost:3100] [--json out.json]
// It loads each page with ?wessel=debug, which makes the engine log a frame
// per tick (lib/wessel.ts), and scrolls down and back up in a fixed pattern.
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const { chromium } = createRequire(import.meta.url)("playwright");

const args = process.argv.slice(2);
const BASE = args.find((a) => a.startsWith("http")) || "http://localhost:3100";
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
// --only /about,phone,calm runs the matching runs alone.
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : [];
const ROUTES = ["/", "/about", "/work/de-saak"];
const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 } },
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
const MOTIONS = ["full", "calm"];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Text he sits on: the footprint of his arrow and tag against the line boxes
// of text blocks in the content, with a 16px margin. Runs in the page.
function restingOnText() {
  const el = document.querySelector(".cur.wes");
  if (!el || el.dataset.hide === "true" || el.dataset.tuck === "true" || getComputedStyle(el).display === "none") return null;
  // Only where he rests by himself: a job (the case read panel) points him on purpose.
  const mode = window.__wessel?.frames.at(-1)?.mode;
  if (mode === "job") return null;
  const a = el.querySelector(".ptr").getBoundingClientRect();
  // A folded tag (no clear spot for it) is invisible: only the arrow counts.
  const folded = el.dataset.fold === "true";
  const l = folded ? a : el.querySelector(".lab").getBoundingClientRect();
  // 16px clear around arrow and tag; 8px around the arrow alone.
  const pad = folded ? 8 : 16;
  const box = {
    left: Math.min(a.left, l.left) - pad,
    right: Math.max(a.right, l.right) + pad,
    top: Math.min(a.top, l.top) - pad,
    bottom: Math.max(a.bottom, l.bottom) + pad,
  };
  if (box.bottom < 0 || box.top > innerHeight) return null;
  const range = document.createRange();
  for (const t of document.querySelectorAll("main :is(p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption,dt,dd), footer :is(p,h1,h2,h3,a)")) {
    const r = t.getBoundingClientRect();
    if (r.bottom < box.top || r.top > box.bottom || r.right < box.left || r.left > box.right) continue;
    // Line boxes of the text itself (an element's range would also count
    // the whole box of every child block).
    const walk = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent.trim()) continue;
      range.selectNodeContents(n);
      for (const q of range.getClientRects())
        if (q.width && q.bottom > box.top && q.top < box.bottom && q.right > box.left && q.left < box.right)
          return n.textContent.trim().slice(0, 40);
    }
  }
  return false;
}

async function scrollBy(p, phone, dy, stepPx, stepMs) {
  const n = Math.ceil(Math.abs(dy) / stepPx);
  for (let i = 0; i < n; i++) {
    const d = Math.sign(dy) * stepPx;
    // Phones: plain scrolling (no wheel on touch); desktop goes through Lenis.
    if (phone) await p.evaluate((d) => scrollBy(0, d), d);
    else await p.mouse.wheel(0, d);
    await wait(stepMs);
  }
}

async function run(b, route, device, motion) {
  const phone = device === "phone";
  const ctx = await b.newContext({ ...DEVICES[device], reducedMotion: motion === "calm" ? "reduce" : "no-preference" });
  // No first-visit intro: these runs are about scrolling.
  await ctx.addInitScript(() => sessionStorage.setItem("wsl-boot", "1"));
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(BASE + route + "?wessel=debug", { waitUntil: "networkidle" });
  if (!phone) await p.mouse.move(DEVICES.desktop.viewport.width / 2, 300);
  await wait(motion === "calm" ? 1500 : 9000); // home's hello plays out

  const H = DEVICES[device].viewport.height;
  const height = await p.evaluate(() => document.documentElement.scrollHeight);
  const rests = [];
  const rest = async (label) => {
    await wait(1600);
    const on = await p.evaluate(restingOnText);
    if (on !== null) rests.push({ label, on });
  };
  // Down slowly in chunks of about a screen, resting between.
  for (let y = 0; y < height - H; y += H * 0.8) {
    await scrollBy(p, phone, H * 0.8, 60, 30);
    await rest(`down ${Math.round(y)}`);
  }
  // Back up fast, then down again fast, resting at the end of each.
  await scrollBy(p, phone, -height * 0.6, 240, 16);
  await rest("fast up");
  await scrollBy(p, phone, height * 0.4, 240, 16);
  await rest("fast down");
  // Idle cost: frames he spends with nothing moving.
  await wait(1500);
  const t0 = await p.evaluate(() => window.__wessel?.ticks ?? 0);
  await wait(3000);
  const idleTicks = (await p.evaluate(() => window.__wessel?.ticks ?? 0)) - t0;
  const frames = await p.evaluate(() => window.__wessel?.frames ?? []);
  const idleModes = [...new Set(frames.filter((f) => f.t > frames.at(-1).t - 3000).map((f) => f.mode))];
  await ctx.close();

  let jumps = 0;
  let flips = 0;
  let scrollFrames = 0;
  let offScreen = 0;
  const jumpAt = [];
  for (let i = 1; i < frames.length; i++) {
    const f = frames[i];
    const g = frames[i - 1];
    if (f.out || g.out) continue;
    // A jump moves him both on screen and on the page: the page carrying a
    // parked Wessel, or a screen-fixed one over a scrolling page, is neither.
    const onScreen = (q) => q.y > -30 && q.y < H + 30;
    const d = Math.min(Math.hypot(f.x - g.x, f.y - g.y), Math.hypot(f.x - g.x, f.y + f.sy - (g.y + g.sy)));
    if (d > 120 && (onScreen(f) || onScreen(g))) {
      jumps++;
      jumpAt.push(Math.round(f.sy));
    }
    const free = (m) => m === "park" || m === "follow" || m === "ride";
    if (free(f.mode) && free(g.mode) && Math.abs(f.ty - g.ty) > 0.3 * H) flips++;
    if (f.sy !== g.sy) {
      scrollFrames++;
      if (f.y < 0 || f.y > H) offScreen++;
    }
  }
  const onText = rests.filter((r) => r.on);
  return {
    route,
    device,
    motion,
    frames: frames.length,
    jumps,
    jumpAt: jumpAt.slice(0, 8),
    flips,
    offScreenPct: scrollFrames ? Math.round((offScreen / scrollFrames) * 1000) / 10 : 0,
    rests: rests.length,
    onText: onText.length,
    onTextSamples: onText.slice(0, 4).map((r) => r.on),
    idleTicksPer3s: idleTicks,
    idleModes,
    errors: errors.slice(0, 3),
  };
}

const b = await chromium.launch();
const results = [];
for (const route of ROUTES)
  for (const device of Object.keys(DEVICES))
    for (const motion of MOTIONS) {
      if (only.length && !only.every((o) => [route, device, motion].includes(o))) continue;
      const r = await run(b, route, device, motion);
      results.push(r);
      console.log(
        `${route.padEnd(14)} ${device.padEnd(7)} ${motion.padEnd(4)}  jumps ${r.jumps}  flips ${r.flips}  off ${r.offScreenPct}%  on text ${r.onText}/${r.rests}  idle ${r.idleTicksPer3s}${r.idleTicksPer3s ? ` (${r.idleModes.join("/")})` : ""}  ${r.onTextSamples.map((s) => JSON.stringify(s)).join(" ")}${r.errors.length ? "  ERR " + r.errors[0] : ""}`,
      );
    }
await b.close();
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 2));
