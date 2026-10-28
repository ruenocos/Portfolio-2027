// Behaviour checks for home's first-visit intro (build-plan_v03 "Tests").
// Needs Playwright with Chromium, and the site running:
//   npx next build && npx next start -p 3100
//   node scripts/check-intro.mjs [http://localhost:3100]
import { createRequire } from "node:module";

// require, so a global install found through NODE_PATH works too.
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.argv[2] || "http://localhost:3100";
const results = [];
const check = (name, ok, info = "") => results.push({ name, ok, info });

const state = (p) =>
  p.evaluate(() => ({
    boot: document.documentElement.dataset.boot ?? null,
    layer: !!document.querySelector(".ilayer"),
    logo: getComputedStyle(document.querySelector(".hd .home .logo")).opacity,
    wes: getComputedStyle(document.querySelector(".cur.wes")).visibility,
  }));
const clean = (s) => !s.boot && !s.layer && s.logo === "1" && s.wes !== "hidden";

const b = await chromium.launch();
async function page(opts = {}, setup) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/sanity|CORS|ERR_FAILED/i.test(m.text()) && errs.push(m.text()));
  if (setup) await setup(p, ctx);
  return { p, ctx, errs };
}

// Plays, ends clean, no errors.
{
  const { p, ctx, errs } = await page();
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForSelector("html[data-boot]");
  check("first visit: sheet from the first paint", (await state(p)).boot !== null);
  await p.waitForTimeout(5000);
  const s = await state(p);
  check("first visit: ends clean", clean(s), JSON.stringify(s));
  check("first visit: no console errors", !errs.length, errs.join(" | "));
  await p.reload({ waitUntil: "load" });
  check("plays once per session", (await state(p)).boot === null);
  await ctx.close();
}

// Skips at 0.3s, 1.2s and 1.9s after it starts playing.
for (const at of [300, 1200, 1900]) {
  const { p, ctx } = await page();
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForSelector('html[data-boot="playing"]', { timeout: 4000 });
  await p.waitForTimeout(at);
  await p.mouse.wheel(0, 200);
  await p.waitForTimeout(500);
  const s = await state(p);
  check(`skip at ${at}ms: clean`, clean(s), JSON.stringify(s));
  await ctx.close();
}

// The Skip pill.
{
  const { p, ctx } = await page();
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForSelector(".iskip", { timeout: 4000 });
  await p.keyboard.press("Tab");
  check("Skip pill is first in tab order", await p.evaluate(() => document.activeElement?.classList.contains("iskip")));
  await p.waitForTimeout(500);
  const s = await state(p);
  check("key press skips", clean(s), JSON.stringify(s));
  await ctx.close();
}

// Never on reduced motion, Pause, a deep link or another page.
{
  const { p, ctx } = await page({ reducedMotion: "reduce" });
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForLoadState("domcontentloaded");
  check("reduced motion: no intro", (await state(p)).boot === null);
  await ctx.close();
}
{
  const { p, ctx } = await page({}, (p) => p.addInitScript(() => localStorage.setItem("wsl-pause", "1")));
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  check("Pause: no intro", (await state(p)).boot === null);
  await ctx.close();
}
{
  const { p, ctx } = await page();
  await p.goto(BASE + "/#contact", { waitUntil: "domcontentloaded" });
  check("deep link: no intro", (await state(p)).boot === null);
  await p.goto(BASE + "/about", { waitUntil: "domcontentloaded" });
  check("other page: no intro", (await state(p)).boot === null);
  await ctx.close();
}

// The ready gate: a slow poster holds the face (1.2s at most), then it plays on.
{
  const { p, ctx } = await page({}, (p) =>
    p.route(/\.(jpg|png|webp|avif)(\?|$)/, async (r) => {
      await new Promise((res) => setTimeout(res, 6000));
      r.continue().catch(() => {});
    }),
  );
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForSelector('html[data-boot="playing"]', { timeout: 4000 });
  const t0 = Date.now();
  await p.waitForFunction(() => !document.documentElement.dataset.boot, null, { timeout: 8000 });
  const ms = Date.now() - t0;
  check("slow poster: gate gives up at 1.2s", ms > 2300 && ms < 4300, `${ms}ms`);
  await ctx.close();
}

// No JS: the CSS failsafe clears the sheet at 4s.
{
  const { p, ctx } = await page({}, (p) => p.route(/\/_next\/static\/chunks\/.*\.js/, (r) => r.abort()));
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(4500);
  const v = await p.evaluate(() => {
    const s = getComputedStyle(document.body, "::before");
    return { boot: document.documentElement.dataset.boot, content: s.content, vis: s.visibility, op: s.opacity };
  });
  check("no JS: failsafe clears the sheet at 4s", v.boot === "pending" && v.content !== "none" && v.vis === "hidden", JSON.stringify(v));
  await ctx.close();
}

// A real resize and a hidden tab skip.
{
  const { p, ctx } = await page();
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForSelector('html[data-boot="playing"]', { timeout: 4000 });
  await p.setViewportSize({ width: 1000, height: 900 });
  await p.waitForTimeout(500);
  const s = await state(p);
  check("resize skips", clean(s), JSON.stringify(s));
  await ctx.close();
}

await b.close();
let fail = 0;
for (const r of results) {
  if (!r.ok) fail++;
  console.log(`${r.ok ? "ok  " : "FAIL"} ${r.name}${r.info ? `  ${r.info}` : ""}`);
}
process.exit(fail ? 1 : 0);
