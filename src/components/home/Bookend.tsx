"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useBeat } from "@/components/canvas/useBeat";
import { Smiley } from "@/components/shell/Smiley";
import { useMotion } from "@/components/useMotion";
import { getMotion } from "@/lib/motion";
import { isBusy, live, select, wait, wessel } from "@/lib/wessel";
import { NAME } from "./name-paths";


const pieces = (n: HTMLElement | null) => [...(n?.children ?? [])] as HTMLElement[];
const paste = (n: HTMLElement | null, on: boolean) => pieces(n).forEach((p) => p.toggleAttribute("data-in", on));

function Word({ w }: { w: (typeof NAME)[keyof typeof NAME] }) {
  const [x0, y0, x1, y1] = w.b;
  return (
    <svg className="wd" viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`} style={{ aspectRatio: `${x1 - x0}/${y1 - y0}` }}>
      <path d={w.d} />
    </svg>
  );
}

/**
 * Bookend (DESIGN.md §6): the name again, Wessel ☺ Oud. It starts empty and
 * Wessel copy-pastes it in: ⌘C on the header wordmark, then ⌘V three times.
 * If his beat can't run while it's on screen, it shows by itself after 3s.
 */
export function Bookend() {
  const { calm } = useMotion();
  const bkn = useRef<HTMLDivElement>(null);
  const parts = () => pieces(bkn.current);
  const show = (on: boolean) => paste(bkn.current, on);

  // Fill the row: both words plus the smiley (1.04em) and the gaps.
  useLayoutEffect(() => {
    const n = bkn.current;
    if (!n) return;
    const fit = () => {
      const units =
        Object.values(NAME).reduce((a, w) => a + ((w.b[2] - w.b[0]) / (w.b[3] - w.b[1])) * 0.716, 0) + 1.04 + 0.5;
      n.style.fontSize = `${Math.min(240, n.clientWidth / units)}px`;
    };
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  // Hidden until pasted, so you never see it before he does it; calm shows
  // it at once. The fallback: 3s on screen without a beat running.
  useEffect(() => {
    const n = bkn.current!;
    if (calm) return paste(n, true);
    let waited = 0;
    const id = setInterval(() => {
      const r = n.getBoundingClientRect();
      const on = r.top < innerHeight && r.bottom > 0;
      if (!isBusy() && on && pieces(n).every((p) => !p.hasAttribute("data-in"))) {
        if (++waited >= 6) paste(n, true);
      } else waited = 0;
    }, 500);
    return () => clearInterval(id);
  }, [calm]);

  const cell = useBeat<HTMLDivElement>({
    async day(g) {
      show(false);
      const src = document.querySelector<HTMLElement>(".hd .wm");
      if (src && src.offsetWidth) {
        await wessel.go(wessel.at(src, 0.5, 0.55));
        live(g);
        wessel.press(true);
        await wait(90);
        wessel.press(false);
        const s0 = select(src, { label: false, ms: 0 });
        await wait(260);
        wessel.chip("⌘C");
        await wait(520);
        s0.done();
        live(g);
      }
      for (const el of parts()) {
        await wessel.go(wessel.at(el, 0.5, 0.6), { k: 200 });
        live(g);
        wessel.chip("⌘V");
        wessel.press(true);
        await wait(80);
        wessel.press(false);
        el.setAttribute("data-in", "");
        const s = select(el, { label: false, ms: 0 });
        await wait(getMotion().calm ? 0 : 480);
        s.done();
        live(g);
      }
      const mob = innerWidth < 900;
      // He rests under the smiley, clear of both words.
      await wessel.go(wessel.at(bkn.current!, 0.5, 1, mob ? -6 : -8, mob ? 26 : 34));
    },
    still() {
      show(true);
    },
    reset() {
      if (!getMotion().calm) show(false);
    },
  });

  return (
    <section className="frame" data-row aria-label="Wessel Oud">
      <div className="side" />
      <div ref={cell} className="cell bk bg-dots">
        <div ref={bkn} className="bkn" aria-hidden="true">
          <Word w={NAME.Wessel} />
          <span className="smi">
            <Smiley follow />
          </span>
          <Word w={NAME.Oud} />
        </div>
      </div>
      <div className="side" />
    </section>
  );
}
