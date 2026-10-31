import motionTokens from "../../design/motion-tokens.json";
import { cssBezier } from "./math";

const { easing, transition } = motionTokens;

/** What the entrance needs from the tokens, passed in so it can run as an inline script. */
const config = {
  band: transition.loadEntrance.rowStaggerMs,
  line: transition.loadEntrance.listStaggerMs,
  maxSteps: transition.loadEntrance.maxSteps,
  fade: { ms: easing["enter-opacity"].ms, ease: cssBezier(easing["enter-opacity"].bezier) },
  rise: { ms: easing["enter-rise"].ms, ease: cssBezier(easing["enter-rise"].bezier), distance: easing["enter-rise"].distance },
};
type EntranceConfig = typeof config;

/**
 * The house entrance on load: the first screen's rows rise 16px and fade in,
 * top to bottom, 120ms apart (a list's rows 60ms), 8 steps at most. Rows are
 * main's [data-row]s; a row can name its own blocks with [data-enter],
 * otherwise its content cell moves. `hold` keeps the case bar still (case to case).
 *
 * It runs twice over: as an inline script right after the page's HTML, so
 * the first screen starts entering on first paint instead of waiting for the
 * JS to load (that wait was most of the phone LCP), and from <Entrance> on
 * every page change after that. So it must stay self-contained: no imports,
 * nothing from outside its own body, as it's sent as source.
 */
function houseEntrance(c: EntranceConfig, hold = false) {
  const root = document.documentElement;
  // Tiles never move themselves, only their content (the rule in lib/hairline,
  // repeated here because this runs before any module has loaded).
  const probe = document.createElement("i");
  probe.style.color = "var(--line)";
  document.body.append(probe);
  const line = getComputedStyle(probe).color;
  probe.remove();
  const onHairline = (el: Element) => !!el.parentElement && getComputedStyle(el.parentElement).backgroundColor === line;
  const movers = (el: HTMLElement): HTMLElement[] =>
    onHairline(el) ? [...el.children].flatMap((k) => (k instanceof HTMLElement ? movers(k) : [])) : [el];

  const fold = innerHeight * 0.92;
  const seen = (el: Element) => {
    const b = el.getBoundingClientRect();
    return b.top < fold && b.bottom > 0;
  };
  // Each step is a band: a row's own [data-enter] blocks, or its content
  // cell. A ruled list (Work's rows, project rows) steps line by line, so
  // the list builds band by band like About instead of rising as one block.
  // Each step waits `gap` after the one before: a band waits the row
  // stagger, a list's next line half that, so a long list doesn't drag.
  const steps: { blocks: HTMLElement[]; gap: number }[] = [];
  for (const row of document.querySelectorAll<HTMLElement>("main [data-row]")) {
    if (!seen(row) || (hold && row.classList.contains("crumb"))) continue;
    const named = [...row.querySelectorAll<HTMLElement>("[data-enter]")];
    // Only the blocks on the first screen: the rest get the scroll entrance.
    const own = named.filter(seen).flatMap(movers);
    if (named.length && !own.length) continue;
    const cell = row.children[1] as HTMLElement | undefined;
    // A row marked [data-steps] (the case opening) steps through its
    // blocks line by line too: blocks that start on the same line share one.
    if (own.length && row.hasAttribute("data-steps")) {
      const lines = new Map<number, HTMLElement[]>();
      for (const el of own) {
        const top = el.getBoundingClientRect().top;
        const key = [...lines.keys()].find((k) => Math.abs(k - top) < 24) ?? top;
        lines.set(key, [...(lines.get(key) ?? []), el]);
      }
      [...lines.keys()].sort((a, b) => a - b).forEach((k) => steps.push({ blocks: lines.get(k)!, gap: c.band }));
    } else if (own.length) steps.push({ blocks: own, gap: c.band });
    else if (cell?.classList.contains("ruled")) {
      const rows = [...cell.children].filter((el): el is HTMLElement => el instanceof HTMLElement && seen(el));
      rows.forEach((el, i) => steps.push({ blocks: movers(el), gap: i ? c.line : c.band }));
    } else if (cell && movers(cell).length) steps.push({ blocks: movers(cell), gap: c.band });
  }
  let d = 0;
  steps.slice(0, 12).forEach(({ blocks, gap }, i) => {
    if (i > 0 && i <= c.maxSteps) d += gap;
    for (const el of blocks) {
      // From 0.01, like the CSS that held it: looks the same, and the
      // browser takes the first paint as the largest one.
      el.animate([{ opacity: 0.01 }, { opacity: 1 }], { duration: c.fade.ms, delay: d, easing: c.fade.ease, fill: "backwards" });
      el.animate([{ translate: `0 ${c.rise.distance}` }, { translate: "0 0" }], {
        duration: c.rise.ms,
        delay: d,
        easing: c.rise.ease,
        fill: "backwards",
      });
    }
  });
  root.classList.remove("entering");
}

export const runEntrance = (hold = false) => houseEntrance(config, hold);

// Inline, right after the page's HTML. Only when the head script hid the
// first screen (html.entering: full motion, not home's first-visit intro).
// It notes the path it entered, so <Entrance> doesn't play it again.
export const entranceScript = `try{var h=document.documentElement;if(h.classList.contains("entering")&&!h.dataset.boot&&document.querySelector("main [data-row]")){(${houseEntrance.toString()})(${JSON.stringify(config)});window.__wslEntered=location.pathname}}catch(e){}`;
