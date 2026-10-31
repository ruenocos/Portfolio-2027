// Screenshots of every page at desktop (1440) and phone (390), in light and
// dark: a first-screen shot and a full-page shot each, plus an index.html
// contact sheet and log.json (console errors, sideways scroll, page height).
// Needs Playwright with Chromium. Works on a local build, a Vercel preview or
// wesseloud.cv:
//   node scripts/shots.mjs [base] [--out dir] [--pages /,/about] [--calm] [--fold]
// base defaults to http://localhost:3100. Pages come from the base's
// sitemap.xml, so new cases are picked up without editing this file.
// --calm captures with reduced motion (no entrances, Wessel at rest).
// --fold skips the full-page shots.
// Vercel previews sit behind a login: with VERCEL_AUTOMATION_BYPASS_SECRET in
// the environment, requests to the base send it as the bypass header.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// require, so a global install found through NODE_PATH works too.
const { chromium } = createRequire(import.meta.url)("playwright");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const BASE = (args.find((a) => /^https?:\/\//.test(a)) || "http://localhost:3100").replace(/\/$/, "");
const OUT = resolve(option("--out") || join("shots", new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")));
const CALM = flag("--calm");
const FULL = !flag("--fold");
const SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

const SIZES = [
  { name: "1440", viewport: { width: 1440, height: 900 } },
  { name: "390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];
const MODES = ["light", "dark"];
const FALLBACK = ["/", "/work", "/about", "/playground", "/work/de-saak"];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const origin = new URL(BASE).origin;

// Only requests to the site itself carry the bypass header: a custom header on
// Sanity's CDN would turn image and API requests into CORS preflights.
async function bypass(ctx) {
  if (!SECRET) return;
  await ctx.route(
    (url) => url.origin === origin,
    (route) => route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": SECRET } }),
  );
}

async function pages(browser) {
  const only = option("--pages");
  if (only) return only.split(",");
  const ctx = await browser.newContext();
  await bypass(ctx);
  try {
    const res = await ctx.request.get(`${BASE}/sitemap.xml`, {
      headers: SECRET ? { "x-vercel-protection-bypass": SECRET } : {},
    });
    const xml = res.ok() ? await res.text() : "";
    // The sitemap lists production URLs; keep only the paths.
    const found = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/(.)\/$/, "$1"));
    if (found.length) return found;
    console.warn(`No sitemap at ${BASE} (${res.status()}), using the fallback list`);
  } catch (e) {
    console.warn(`Sitemap failed (${e.message}), using the fallback list`);
  } finally {
    await ctx.close();
  }
  return FALLBACK;
}

// Scroll through once so lazy media load and scroll entrances finish, then
// go back to the top for the full-page shot.
async function settle(p, height) {
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += Math.round(height * 0.6)) {
    await p.mouse.wheel(0, Math.round(height * 0.6));
    await wait(300);
  }
  await wait(1200);
  await p.evaluate(() => window.scrollTo(0, 0));
  await wait(800);
}

const slug = (path) => (path === "/" ? "home" : path.slice(1).replace(/\//g, "-"));

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const list = await pages(browser);
const log = [];
console.log(
  `${list.length} pages × ${SIZES.length} sizes × ${MODES.length} modes from ${BASE}${SECRET ? " (bypass on)" : ""}`,
);

// The four size × mode runs go side by side, each in its own browser context.
async function run(size, mode) {
  const { viewport, isMobile, hasTouch } = size;
  const ctx = await browser.newContext({
    viewport,
    isMobile,
    hasTouch,
    colorScheme: mode,
    reducedMotion: CALM ? "reduce" : "no-preference",
  });
  await bypass(ctx);
  // Skip home's first-visit intro so every shot shows the page itself.
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("wsl-boot", "1");
    } catch {}
  });
  for (const path of list) {
    const p = await ctx.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    const file = `${slug(path)}_${size.name}-${mode}`;
    const res = await p.goto(BASE + path, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => {
      errors.push(`goto: ${e.message}`);
      return null;
    });
    await wait(1800);
    await p.screenshot({ path: join(OUT, `${file}_fold.png`) });
    if (FULL) {
      await settle(p, size.viewport.height);
      await p
        .screenshot({ path: join(OUT, `${file}_full.png`), fullPage: true })
        .catch((e) => errors.push(`shot: ${e.message}`));
    }
    const page = await p.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      sideways: document.documentElement.scrollWidth > innerWidth,
    }));
    log.push({ file, path, size: size.name, mode, status: res?.status() ?? null, ...page, errors });
    console.log(
      `${errors.length || page.sideways || (res && !res.ok()) ? "✗" : "✓"} ${file}${page.sideways ? " (scrolls sideways)" : ""}${errors.length ? ` (${errors.length} errors)` : ""}`,
    );
    await p.close();
  }
  await ctx.close();
}
await Promise.all(SIZES.flatMap((size) => MODES.map((mode) => run(size, mode))));
log.sort((a, b) => a.file.localeCompare(b.file));
await browser.close();

writeFileSync(
  join(OUT, "log.json"),
  JSON.stringify({ base: BASE, calm: CALM, at: new Date().toISOString(), shots: log }, null, 1),
);

// Contact sheet: one row per page, its eight first-screen shots side by side.
const cells = (path) =>
  SIZES.flatMap((s) => MODES.map((m) => `${slug(path)}_${s.name}-${m}`))
    .map(
      (f) =>
        `<figure><a href="${f}_${FULL ? "full" : "fold"}.png"><img src="${f}_fold.png" loading="lazy"></a><figcaption>${f}</figcaption></figure>`,
    )
    .join("");
writeFileSync(
  join(OUT, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Shots ${BASE}</title>
<style>body{font:13px system-ui;margin:24px;background:#f4f4f2}h2{margin:32px 0 8px}div{display:flex;gap:12px;align-items:flex-start;overflow-x:auto}figure{margin:0}img{display:block;height:320px;border:1px solid #ccc}figcaption{color:#666;margin-top:4px}</style>
<h1>${BASE}</h1><p>${new Date().toISOString()}${CALM ? " · reduced motion" : ""} · click a shot for the full page</p>
${list.map((path) => `<h2>${path}</h2><div>${cells(path)}</div>`).join("\n")}`,
);

const bad = log.filter((l) => l.errors.length || l.sideways || (l.status && l.status >= 400));
console.log(`\n${log.length} captures in ${OUT}${bad.length ? `, ${bad.length} with problems (see log.json)` : ""}`);
