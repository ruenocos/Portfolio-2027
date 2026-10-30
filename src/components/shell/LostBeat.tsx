"use client";

import { useBeat } from "@/components/canvas/useBeat";
import { live, pageBox, putPin, select, wait, wessel } from "@/lib/wessel";

// The 404's beat: an empty dashed frame where the
// page should be. Wessel selects it (0 × 0), drops a comment, and leaves.
export function LostBeat() {
  const frame = useBeat<HTMLDivElement>({
    need: 0.5,
    async day(g) {
      const f = frame.current;
      if (!f) return;
      await wait(400);
      live(g);
      await wessel.go(wessel.at(f, 0.92, 0.9), { k: 160, timeout: 1200 });
      live(g);
      const s = select(f, { ms: 3600 });
      const z = s.box.querySelector(".szp");
      if (z) z.textContent = "0 × 0";
      await wait(700);
      live(g);
      const r = pageBox(f);
      const { pin, bub } = putPin([r.x + Math.min(r.w * 0.55, r.w - 250), r.y + r.h * 0.2]);
      for (const ch of "Deleted this layer, sorry") {
        bub.textContent += ch;
        await wait(70);
        live(g);
      }
      await wait(2600);
      pin.classList.add("bye");
      setTimeout(() => pin.remove(), 260);
      wessel.free();
    },
  });
  return <div ref={frame} className="lostf" aria-hidden="true" />;
}
