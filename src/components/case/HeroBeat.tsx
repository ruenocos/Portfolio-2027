"use client";

import { useBeat } from "@/components/canvas/useBeat";
import { live, select, wait, wessel } from "@/lib/wessel";

/**
 * The case's opening job: by day Wessel clicks the project video and
 * selects it, size pill and all, like opening the frame in Figma.
 */
export function HeroBeat({ children }: { children: React.ReactNode }) {
  const beat = useBeat<HTMLDivElement>({
    need: 0.4,
    async day(g) {
      const el = beat.current?.querySelector<HTMLElement>("figure") ?? beat.current!;
      await wait(500);
      live(g);
      await wessel.go(wessel.at(el, 0.78, 0.7), { k: 240 });
      live(g);
      wessel.press(true);
      select(el, { ms: 1800 });
      await wait(120);
      wessel.press(false);
      await wait(1400);
      live(g);
      wessel.free();
    },
  });
  return (
    <div ref={beat} className="cell chero">
      {children}
    </div>
  );
}
