"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getMotion } from "@/lib/motion";
import motionTokens from "../../../design/motion-tokens.json";

const { easing, transition } = motionTokens;
const bezier = (b: number[]) => `cubic-bezier(${b.join(",")})`;

// The house entrance on load: the first screen's rows rise 16px and fade in,
// top to bottom, 80ms apart, 4 steps at most. Rows are main's [data-row]s;
// a row can name its own blocks with [data-enter], otherwise its content
// cell moves. Skipped while calm, and on home's first visit
// (<html data-boot>), which has its own intro.
export function Entrance() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (getMotion().calm || root.dataset.boot)
      return root.classList.remove("entering");

    const fold = innerHeight * 0.92;
    const rows = [
      ...document.querySelectorAll<HTMLElement>("main [data-row]"),
    ].filter((r) => {
      // The home hero has its own intro.
      if (r.hasAttribute("data-still")) return false;
      const b = r.getBoundingClientRect();
      return b.top < fold && b.bottom > 0;
    });
    rows.slice(0, 12).forEach((row, i) => {
      const own = [...row.querySelectorAll<HTMLElement>("[data-enter]")];
      const blocks = own.length
        ? own
        : [row.children[1] as HTMLElement].filter(Boolean);
      const d =
        Math.min(i, transition.loadEntrance.maxSteps) *
          transition.loadEntrance.rowStaggerMs;
      for (const el of blocks) {
        el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: easing["enter-opacity"].ms,
          delay: d,
          easing: bezier(easing["enter-opacity"].bezier),
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
            easing: bezier(easing["enter-rise"].bezier),
            fill: "backwards",
          },
        );
      }
    });
    root.classList.remove("entering");
  }, [pathname]);

  return null;
}
