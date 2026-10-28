// Accessibility scan: axe-core (WCAG 2.0–2.2 A + AA, plus best practice) on
// every real page, at desktop and phone width. Fails on any violation.
// Needs Playwright with Chromium, axe-core, and the site running:
//   npx next build && npx next start -p 3100
//   node scripts/check-a11y.mjs [http://localhost:3100]
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

// require, so a global install found through NODE_PATH works too.
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axe = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const BASE = process.argv[2] || "http://localhost:3100";
const PAGES = ["/", "/work", "/about", "/playground", "/work/de-saak"];
const SIZES = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
];

const b = await chromium.launch();
let failed = 0;
for (const s of SIZES) {
  // Reduced motion: the intro and entrances skip, so every page is at rest.
  const ctx = await b.newContext({ viewport: { width: s.width, height: s.height }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  for (const path of PAGES) {
    await p.goto(BASE + path, { waitUntil: "networkidle" });
    await p.addScriptTag({ content: axe });
    const found = await p.evaluate(async () =>
      (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] })).violations.map(
        (v) => `${v.impact} ${v.id} ×${v.nodes.length}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`,
      ),
    );
    failed += found.length;
    console.log(`${found.length ? "✗" : "✓"} ${s.name} ${path}${found.map((f) => `\n    ${f}`).join("")}`);
  }
  await ctx.close();
}
await b.close();
console.log(failed ? `\n${failed} violation(s)` : "\nNo violations");
process.exit(failed ? 1 : 0);
