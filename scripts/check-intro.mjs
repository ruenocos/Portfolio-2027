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
    // Wessel's cursor is held back (opacity 0) only while data-boot is set.
    wes: !document.querySelector("html[data-boot] .cur.wes"),
  }));
const clean = (s) => !s.boot && !s.layer && s.logo === "1" && s.wes;

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

// A host that adds a comment and line breaks to <head> (Netlify did) makes
// React's hydration fail and reset <html>: the intro, the mode and the
// motion state must come back (lib/html).
{
  const { p, ctx } = await page({ colorScheme: "dark" }, (p) =>
    p.route(BASE + "/", async (r) => {
      const res = await r.fetch();
      const html = (await res.text()).replace('<meta charSet="utf-8"/>', '$&\n<!-- hosted on Netlify -->\n');
      await r.fulfill({ response: res, body: html });
    }),
  );
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForTimeout(1500);
  const mid = await p.evaluate(() => ({ ...document.documentElement.dataset }));
  check("head comment: intro still playing at 1.5s", mid.boot === "playing", JSON.stringify(mid));
  check("head comment: mode and motion kept", mid.mode === "dark" && mid.motion === "full", JSON.stringify(mid));
  await p.waitForTimeout(3500);
  const s = await state(p);
  check("head comment: ends clean", clean(s), JSON.stringify(s));
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
  check("Skip pill is first in tab order", await p.evaluate(() => document.body.firstElementChild?.classList.contains("iskip")));
  await p.keyboard.press("Tab");
  await p.waitForTimeout(500);
  const s = await state(p);
  check("key press skips", clean(s), JSON.stringify(s));
  check("focus doesn't stay on the pill", await p.evaluate(() => !document.activeElement?.classList.contains("iskip")));
  await p.keyboard.press("Tab");
  const next = await p.evaluate(() => document.activeElement?.textContent?.trim());
  check("next Tab starts at the top (skip link)", next === "Skip to content", next);
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
  const { p, ctx } = await page({}, (p) => p.route(/\/_next\/static\/(immutable\/)?chunks\/.*\.js/, (r) => r.abort()));
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(4200);
  const v = await p.evaluate(() => {
    const s = getComputedStyle(document.body, "::before");
    return { boot: document.documentElement.dataset.boot, content: s.content, vis: s.visibility, op: s.opacity };
  });
  check("no JS: failsafe clears the sheet at 4s", v.boot === "pending" && v.content !== "none" && v.vis === "hidden", JSON.stringify(v));
  await p.waitForTimeout(800);
  const s = await state(p);
  check("no JS: the boot flag clears itself at 4.5s", s.boot === null && s.wes, JSON.stringify(s));
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

// Leaving home mid-intro ends it; switching on reduced motion mid-intro skips it.
{
  const { p, ctx } = await page();
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForSelector('html[data-boot="playing"]', { timeout: 4000 });
  await p.evaluate(() => document.querySelector('a[href="/work"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  // Time from the route change: over a real network /work takes a beat to fetch.
  await p.waitForURL(/\/work$/, { timeout: 4000 }).catch(() => {});
  await p.waitForTimeout(600);
  const s = await state(p);
  check("navigating away ends it", p.url().endsWith("/work") && !s.boot && !s.layer, JSON.stringify(s));
  await ctx.close();
}
{
  const { p, ctx } = await page();
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForSelector('html[data-boot="playing"]', { timeout: 4000 });
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.waitForTimeout(500);
  const s = await state(p);
  check("reduced motion mid-intro skips it", clean(s), JSON.stringify(s));
  await ctx.close();
}
// Pause pressed mid-intro (a click with no pointer, as a screen reader sends) skips it.
{
  const { p, ctx } = await page();
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForSelector('html[data-boot="playing"]', { timeout: 4000 });
  await p.getByRole("button", { name: "Pause motion" }).first().evaluate((el) => el.click());
  await p.waitForTimeout(500);
  const s = await state(p);
  check("Pause mid-intro skips it", clean(s), JSON.stringify(s));
  await ctx.close();
}
// A scroll with no input (find in page, an anchor jump) skips it.
{
  const { p, ctx } = await page();
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForSelector('html[data-boot="playing"]', { timeout: 4000 });
  await p.evaluate(() => scrollTo(0, 400));
  await p.waitForTimeout(500);
  const s = await state(p);
  check("scroll mid-intro skips it", clean(s), JSON.stringify(s));
  await ctx.close();
}
// A hidden tab mid-intro ends it.
{
  const { p, ctx } = await page();
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForSelector('html[data-boot="playing"]', { timeout: 4000 });
  await p.evaluate(() => {
    Object.defineProperty(document, "hidden", { get: () => true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await p.waitForTimeout(400);
  const s = await state(p);
  check("hidden tab mid-intro ends it", !s.boot && s.logo === "1", JSON.stringify(s));
  await ctx.close();
}
// JS 2.5s late: no ready gate, so the sheet is gone well before 2.5 + 1.2 + 2.32s.
{
  const { p, ctx } = await page({}, (p) =>
    p.route(/\/_next\/static\/(immutable\/)?chunks\/.*\.js/, async (r) => {
      await new Promise((res) => setTimeout(res, 2500));
      r.continue().catch(() => {});
    }),
  );
  await p.goto(BASE + "/", { waitUntil: "commit" });
  // Over a real network the <head> lands after "commit": time from the flag.
  await p.waitForSelector("html[data-boot]", { timeout: 4000 }).catch(() => {});
  const t0 = Date.now();
  await p.waitForFunction(() => !document.documentElement.dataset.boot, null, { timeout: 9000 }).catch(() => {});
  const ms = Date.now() - t0;
  await p.waitForTimeout(400);
  const s = await state(p);
  check("late JS: no gate, ends clean", clean(s) && ms < 5600, `${ms}ms ${JSON.stringify(s)}`);
  await ctx.close();
}
// A throw mid-frame still leaves the page.
{
  const { p, ctx } = await page({}, (p) =>
    p.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      let n = 0;
      window.requestAnimationFrame = (f) => raf((t) => (document.querySelector(".ilayer") && ++n === 20 ? (() => { const st = CSSStyleDeclaration.prototype; const d = Object.getOwnPropertyDescriptor(st, "maskImage"); Object.defineProperty(st, "maskImage", { set() { throw new Error("boom"); }, configurable: true }); f(t); if (d) Object.defineProperty(st, "maskImage", d); else delete st.maskImage; })() : f(t)));
    }),
  );
  await p.goto(BASE + "/", { waitUntil: "commit" });
  await p.waitForTimeout(4000);
  const s = await state(p);
  check("a throw mid-frame: page clean", clean(s), JSON.stringify(s));
  await ctx.close();
}

await b.close();
let fail = 0;
for (const r of results) {
  if (!r.ok) fail++;
  console.log(`${r.ok ? "ok  " : "FAIL"} ${r.name}${r.info ? `  ${r.info}` : ""}`);
}
process.exit(fail ? 1 : 0);
