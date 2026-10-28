"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getMotion } from "@/lib/motion";
import motionTokens from "../../../design/motion-tokens.json";
import { cssBezier } from "@/lib/math";

const { easing, transition } = motionTokens;

// The house entrance on load: the first screen's rows rise 16px and fade in,
// top to bottom, 80ms apart, 8 steps at most. Rows are main's [data-row]s;
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
    const steps: HTMLElement[][] = [];
    for (const row of document.querySelectorAll<HTMLElement>("main [data-row]")) {
      if (!seen(row)) continue;
      const own = [...row.querySelectorAll<HTMLElement>("[data-enter]")];
      const cell = row.children[1] as HTMLElement | undefined;
      if (own.length) steps.push(own);
      else if (cell?.classList.contains("ruled")) {
        for (const line of cell.children)
          if (line instanceof HTMLElement && seen(line)) steps.push([line]);
      } else if (cell) steps.push([cell]);
    }
    steps.slice(0, 12).forEach((blocks, i) => {
      const d =
        Math.min(i, transition.loadEntrance.maxSteps) *
          transition.loadEntrance.rowStaggerMs;
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
