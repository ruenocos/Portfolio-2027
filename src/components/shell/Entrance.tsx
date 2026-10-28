"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getMotion } from "@/lib/motion";
import motionTokens from "../../../design/motion-tokens.json";
import { cssBezier } from "@/lib/math";

const { easing, transition } = motionTokens;

// The house entrance on load: the first screen's rows rise 16px and fade in,
// top to bottom, 120ms apart (a list's rows 60ms), 8 steps at most. Rows are main's [data-row]s;
// a row can name its own blocks with [data-enter], otherwise its content
// cell moves. Skipped while calm, and on home's first visit
// (<html data-boot>), which has its own intro; later visits to home enter
// like every other page, hero first.
export function Entrance() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (getMotion().calm || root.dataset.boot)
      return root.classList.remove("entering");

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
    const band = transition.loadEntrance.rowStaggerMs;
    const line = transition.loadEntrance.listStaggerMs;
    for (const row of document.querySelectorAll<HTMLElement>("main [data-row]")) {
      if (!seen(row)) continue;
      const named = [...row.querySelectorAll<HTMLElement>("[data-enter]")];
      // Only the blocks on the first screen: the rest get the scroll entrance.
      const own = named.filter(seen);
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
        [...lines.keys()].sort((a, b) => a - b).forEach((k) => steps.push({ blocks: lines.get(k)!, gap: band }));
      } else if (own.length) steps.push({ blocks: own, gap: band });
      else if (cell?.classList.contains("ruled")) {
        const rows = [...cell.children].filter((el): el is HTMLElement => el instanceof HTMLElement && seen(el));
        rows.forEach((el, i) => steps.push({ blocks: [el], gap: i ? line : band }));
      } else if (cell) steps.push({ blocks: [cell], gap: band });
    }
    let d = 0;
    steps.slice(0, 12).forEach(({ blocks, gap }, i) => {
      if (i > 0 && i <= transition.loadEntrance.maxSteps) d += gap;
      for (const el of blocks) {
        el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: easing["enter-opacity"].ms,
          delay: d,
          easing: cssBezier(easing["enter-opacity"].bezier),
          fill: "backwards",
        });
        el.animate(
          [
            { translate: `0 ${easing["enter-rise"].distance}` },
            { translate: "0 0" },
          ],
          {
            duration: easing["enter-rise"].ms,
            delay: d,
            easing: cssBezier(easing["enter-rise"].bezier),
            fill: "backwards",
          },
        );
      }
    });
    root.classList.remove("entering");
  }, [pathname]);

  return null;
}
