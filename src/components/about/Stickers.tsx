"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useBeat } from "@/components/canvas/useBeat";
import type { Sticker } from "@/content/about";
import { announce } from "@/lib/motion";
import { Bot, live, pageBox, wait, wessel } from "@/lib/wessel";

type Pos = { x: number; y: number; r: number };
// Where each one lands when it's a mess: fractions of the board, and a tilt.
const MESS: [number, number, number][] = [
  [0.08, 0.34, -6],
  [0.3, 0.56, 4],
  [0.52, 0.3, -3],
  [0.64, 0.62, 7],
  [0.18, 0.74, 3],
  [0.42, 0.8, -5],
  [0.74, 0.4, 5],
];
const STEP = 16;
const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Off screen (About v07): a board of hobby stickers you can drag (or move
 * with the arrow keys). "Tidy up" lines them up along the bottom, like
 * auto layout; "Mess it up" throws them back. By day Wessel sits on the
 * button; at night the Tidy up bot does the tidying.
 */
export function Stickers({ items }: { items: Sticker[] }) {
  const board = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const els = useRef<(HTMLButtonElement | null)[]>([]);
  const [pos, setPos] = useState<Pos[]>([]);
  const [tidy, setTidy] = useState(false);
  const [z, setZ] = useState<number[]>(() => items.map((_, i) => i));
  const [dragging, setDragging] = useState<number | null>(null);

  const mess = useCallback(() => {
    const b = board.current;
    if (!b) return;
    const W = b.clientWidth;
    const H = b.clientHeight;
    const s = els.current;
    // Phones: loose rows from the top, still a little crooked.
    if (W < 600) {
      let x = 16;
      let y = 100;
      setPos(
        items.map((_, i) => {
          const w = s[i]?.offsetWidth ?? 120;
          if (x + w > W - 16) {
            x = 16 + (i % 2) * 18;
            y += (s[i]?.offsetHeight ?? 48) + 30;
          }
          const p = { x, y, r: MESS[i % MESS.length][2] * 0.8 };
          x += w + 18;
          return p;
        }),
      );
    } else
      setPos(
        items.map((_, i) => {
          const [fx, fy, r] = MESS[i % MESS.length];
          const w = s[i]?.offsetWidth ?? 120;
          const h = s[i]?.offsetHeight ?? 48;
          return { x: cl(fx * W, 16, W - w - 16), y: cl(fy * H, 90, H - h - 16), r };
        }),
      );
    setTidy(false);
  }, [items]);

  const neat = useCallback(() => {
    const b = board.current;
    if (!b) return;
    const W = b.clientWidth;
    const H = b.clientHeight;
    const pad = innerWidth < 900 ? 20 : 40;
    const gap = 10;
    const s = els.current;
    const rows: number[][] = [[]];
    let rw = pad;
    items.forEach((_, i) => {
      const w = s[i]?.offsetWidth ?? 120;
      if (rw + w > W - pad && rows.at(-1)!.length) {
        rows.push([]);
        rw = pad;
      }
      rows.at(-1)!.push(i);
      rw += w + gap;
    });
    const sh = s[0]?.offsetHeight ?? 48;
    let y = H - pad - rows.length * (sh + gap) + gap;
    const next: Pos[] = [];
    rows.forEach((r) => {
      let x = pad;
      r.forEach((i) => {
        next[i] = { x, y, r: 0 };
        x += (s[i]?.offsetWidth ?? 120) + gap;
      });
      y += sh + gap;
    });
    setPos(next);
    setTidy(true);
  }, [items]);

  useLayoutEffect(mess, [mess]);
  useEffect(() => {
    const rs = () => (tidy ? neat() : mess());
    addEventListener("resize", rs);
    return () => removeEventListener("resize", rs);
  }, [tidy, mess, neat]);

  const lift = (i: number) => setZ((o) => [...o.filter((k) => k !== i), i]);

  const down = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    const b = board.current!;
    el.setPointerCapture(e.pointerId);
    lift(i);
    setDragging(i);
    const p = pos[i];
    const sx = e.clientX;
    const sy = e.clientY;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const x = cl(p.x + dx, 0, b.clientWidth - el.offsetWidth);
      const y = cl(p.y + ev.clientY - sy, 0, b.clientHeight - el.offsetHeight);
      setPos((o) => o.map((q, k) => (k === i ? { x, y, r: p.r + cl(dx * 0.04, -12, 12) } : q)));
      setTidy(false);
    };
    const up = () => {
      setDragging(null);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const key = (i: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const d = ({ ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] } as Record<string, number[]>)[e.key];
    if (!d) return;
    e.preventDefault();
    const b = board.current!;
    const el = e.currentTarget;
    lift(i);
    setPos((o) =>
      o.map((q, k) =>
        k === i ? { ...q, x: cl(q.x + d[0], 0, b.clientWidth - el.offsetWidth), y: cl(q.y + d[1], 0, b.clientHeight - el.offsetHeight) } : q,
      ),
    );
    setTidy(false);
  };

  const toggle = () => {
    if (tidy) mess();
    else neat();
    announce(tidy ? "Stickers scattered" : "Stickers tidied");
  };

  const beat = useBeat<HTMLElement>({
    need: 0.5,
    async day(g) {
      const t = btn.current!;
      await wessel.go(wessel.at(t, 1, 1, -18, -12));
      live(g);
      wessel.press(true);
      setTimeout(() => wessel.press(false), 160);
    },
    async night(g) {
      const t = btn.current!;
      const T = new Bot("Tidy up");
      const r = pageBox(t);
      await T.to(r.x + r.w - 18, r.y + r.h - 12);
      live(g);
      T.press(true);
      await wait(140);
      neat();
      T.press(false);
      await wait(700);
      live(g);
      await T.leave();
    },
    still(mode) {
      if (mode === "night") neat();
    },
    reset() {
      mess();
    },
  });

  return (
    <section ref={beat} className="frame" data-row aria-label="Off screen">
      <div className="side" />
      <div ref={board} className="cell board bg-dots">
        <div className="btop">
          <p className="sr-only">Stickers you can drag, or move with the arrow keys.</p>
          <button ref={btn} type="button" className="tidy text-micro-caps" onClick={toggle}>
            {tidy ? "Mess it up" : "Tidy up"}
          </button>
        </div>
        {items.map((s, i) => (
          <button
            key={s.text}
            ref={(el) => {
              els.current[i] = el;
            }}
            type="button"
            className="stk text-lead"
            data-tone={s.tone}
            data-drag={dragging === i ? "" : undefined}
            aria-label={`${s.text}, sticker. Arrow keys move it.`}
            style={{
              transform: pos[i] ? `translate(${pos[i].x}px,${pos[i].y}px) rotate(${pos[i].r}deg)` : undefined,
              visibility: pos[i] ? undefined : "hidden",
              zIndex: 5 + z.indexOf(i),
            }}
            onPointerDown={down(i)}
            onKeyDown={key(i)}
          >
            {s.text}
          </button>
        ))}
      </div>
      <div className="side" />
    </section>
  );
}
