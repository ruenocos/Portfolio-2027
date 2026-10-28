"use client";

import { useRef, useState } from "react";
import { useBeat } from "@/components/canvas/useBeat";
import type { Photo } from "@/content/home";
import { announce, getMotion } from "@/lib/motion";
import { live, wait, wessel, type XY } from "@/lib/wessel";
import { SIZES, srcSet } from "@/lib/image";

// Where the three cards rest: the top one nearly straight, the rest peeking.
const REST: [number, number, number][] = [
  [0, 0, -2],
  [14, 10, 4],
  [-12, 18, -7],
];
const TOSS_MS = 260;

/**
 * About's toy (v07): a stack of photos. Drag the top one off (or tap it,
 * or Enter) and it flies away and tucks in at the back. Wessel
 * pulls the top one off once, to show you how.
 */
export function PhotoStack({ photos }: { photos: Photo[] }) {
  const [order, setOrder] = useState(() => photos.map((_, i) => i));
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [gone, setGone] = useState<{ dir: number; dy: number; w: number } | null>(null);
  const stack = useRef<HTMLDivElement>(null);

  const toss = (dx: number, dy: number) => {
    if (gone || photos.length < 2) return setDrag(null);
    const dir = dx === 0 ? 1 : Math.sign(dx);
    const done = () => {
      setGone(null);
      setDrag(null);
      setOrder((o) => [...o.slice(1), o[0]]);
      announce(photos[order[1] ?? order[0]].alt);
    };
    if (getMotion().calm) return done();
    setGone({ dir, dy, w: stack.current?.offsetWidth ?? 280 });
    setTimeout(done, TOSS_MS);
  };

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gone) return;
    const card = e.currentTarget;
    card.setPointerCapture(e.pointerId);
    const sx = e.clientX;
    const sy = e.clientY;
    let d = { x: 0, y: 0 };
    const move = (ev: PointerEvent) => {
      d = { x: ev.clientX - sx, y: ev.clientY - sy };
      setDrag(d);
    };
    const stop = () => {
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", up);
      card.removeEventListener("pointercancel", cancel);
    };
    // The browser took over (a scroll on touch): it settles back, never tosses.
    const cancel = () => {
      stop();
      setDrag(null);
    };
    const up = () => {
      stop();
      // A real throw, or a tap: it goes. A small nudge: it settles back.
      if (Math.abs(d.x) > 90 || Math.hypot(d.x, d.y) < 6) toss(d.x, d.y);
      else setDrag(null);
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", up);
    card.addEventListener("pointercancel", cancel);
  };

  const beat = useBeat<HTMLDivElement>({
    // He shows you the next photo: grabs the top one by its corner,
    // pulls it aside and lets it fly to the back.
    async day(g) {
      const s = stack.current!;
      if (photos.length < 2) return;
      await wait(400);
      live(g);
      const at = (): XY => {
        const r = s.getBoundingClientRect();
        return [r.right - 34, r.bottom - 40];
      };
      await wessel.go(at, { k: 260 });
      live(g);
      wessel.press(true);
      const [x0, y0] = at();
      try {
        await wessel.drag(
          () => [x0, y0],
          () => [x0 + 110, y0 - 24],
          520,
          (e) => setDrag({ x: 110 * e, y: -24 * e }),
        );
        live(g);
        toss(1, -24);
      } catch (e) {
        setDrag(null);
        throw e;
      } finally {
        wessel.press(false);
      }
      await wait(500);
      wessel.free();
    },
    reset() {
      setDrag(null);
    },
  });

  const top = photos[order[0]];
  return (
    <div ref={beat} className="cell stackc bg-dots">
      <div
        ref={stack}
        className="pstk"
        role="button"
        tabIndex={0}
        aria-label={`Photos of Wessel, showing: ${top?.alt ?? ""}. Press to see the next one.`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toss(1, 0);
          }
        }}
        // A screen reader's "activate" sends a click with no pointer behind it
        // (detail 0). Taps and drags are handled on the card itself.
        onClick={(e) => e.detail === 0 && toss(1, 0)}
        data-enter
      >
        {order
          .map((i, k) => ({ p: photos[i], k }))
          .reverse()
          .map(({ p, k }) => {
            const [x, y, r] = REST[Math.min(k, 2)];
            const isTop = k === 0;
            const t =
              isTop && gone
                ? `translate(${gone.dir * gone.w * 1.25}px,${gone.dy * 0.6 - 40}px) rotate(${gone.dir * 24}deg)`
                : isTop && drag
                  ? `translate(${drag.x}px,${drag.y}px) rotate(${-2 + drag.x * 0.06}deg)`
                  : `translate(${x}px,${y}px) rotate(${r}deg)`;
            return (
              <div
                key={p.src}
                className="pcard"
                data-drag={isTop && drag && !gone ? "" : undefined}
                data-gone={isTop && gone ? "" : undefined}
                style={{ transform: t, zIndex: 10 - k }}
                onPointerDown={isTop ? down : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Sanity's CDN sizes these */}
                <img src={p.src} srcSet={srcSet(p.src)} sizes={SIZES.stack} alt="" draggable={false} decoding="async" />
              </div>
            );
          })}
      </div>
      <span className="hint text-micro-caps" aria-hidden="true">
        Toss the top one
      </span>
    </div>
  );
}
