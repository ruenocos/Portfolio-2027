"use client";

import { useEffect, useRef, useState } from "react";
import type { Body as MBody, Constraint as MConstraint, Engine as MEngine } from "matter-js";
import { useBeat } from "@/components/canvas/useBeat";
import type { Sticker } from "@/content/about";
import { announce, getMotion } from "@/lib/motion";
import { live, wait, wessel, type XY } from "@/lib/wessel";
import { narrow } from "@/lib/media";

type Matter = typeof import("matter-js");
type Pile = {
  M: Matter;
  engine: MEngine;
  bodies: (MBody | null)[];
  walls: MBody[];
  grab: MConstraint | null;
  // Tidy: each sticker springs to its slot, then gravity takes over again.
  tidyTo: { x: number; y: number }[] | null;
  tidyFrom: { x: number; y: number; a: number }[];
  tidyT: number;
  // Tidied stickers stay locked in their rows until someone touches one.
  locked: boolean;
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = (n: number) => Math.floor(Math.random() * n);
const now = () => performance.now();
const calm = () => getMotion().calm;
const DT = 1000 / 60;

// Big ones land at the bottom when tidied, the small ones on top.
const SIZES = ["l", "m", "s"] as const;
const rank = (s: Sticker) => SIZES.indexOf(s.size ?? "m");

/**
 * Off screen: hobby stickers with weight, in three sizes. They fall into
 * the board when it scrolls in, pile up and knock into each other. Grab
 * one and throw it; arrow keys push it, Enter makes it hop. "Tidy up"
 * lines them into rows, biggest at the bottom; "Mess it up" tosses them.
 * Wessel picks one up and drops it.
 * Physics (matter-js) loads only here, when the board is near.
 */
export function Stickers({ items }: { items: Sticker[] }) {
  const board = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const els = useRef<(HTMLButtonElement | null)[]>([]);
  const pile = useRef<Pile | null>(null);
  const [tidy, setTidy] = useState(false);
  const [z, setZ] = useState<number[]>(() => items.map((_, i) => i));
  const [dragging, setDragging] = useState<number | null>(null);
  const tidyRef = useRef(false);
  useEffect(() => {
    tidyRef.current = tidy;
  }, [tidy]);

  const size = (i: number) => {
    const e = els.current[i];
    return { w: e?.offsetWidth ?? 120, h: e?.offsetHeight ?? 48 };
  };

  const draw = () => {
    const P = pile.current;
    if (!P) return;
    P.bodies.forEach((b, i) => {
      const e = els.current[i];
      if (!e) return;
      if (!b) {
        e.style.visibility = "hidden";
        return;
      }
      const { w, h } = size(i);
      e.style.visibility = "";
      // translate and rotate as their own properties, so the CSS scale on
      // hover and drag grows the sticker in place instead of shifting it.
      e.style.translate = `${(b.position.x - w / 2).toFixed(1)}px ${(b.position.y - h / 2).toFixed(1)}px`;
      e.style.rotate = `${b.angle.toFixed(3)}rad`;
    });
  };

  const add = (i: number, x: number, y: number, a = rnd(-0.25, 0.25)) => {
    const P = pile.current!;
    const { w, h } = size(i);
    const b = P.M.Bodies.rectangle(x, y, w, h, {
      chamfer: { radius: h / 2 - 1 },
      angle: a,
      restitution: 0.25,
      friction: 0.5,
      frictionAir: 0.012,
      density: 0.0016,
    });
    b.plugin = { w, h };
    P.bodies[i] = b;
    P.M.Composite.add(P.engine.world, b);
    return b;
  };

  const walls = (P: Pile) => {
    const b = board.current!;
    const W = b.clientWidth;
    const H = b.clientHeight;
    const { Bodies, Composite } = P.M;
    if (P.walls.length) Composite.remove(P.engine.world, P.walls);
    const t = 200;
    P.walls = [
      Bodies.rectangle(W / 2, H + t / 2, W + 2 * t, t, { isStatic: true }),
      Bodies.rectangle(-t / 2, H / 2 - H, t, H * 4, { isStatic: true }),
      Bodies.rectangle(W + t / 2, H / 2 - H, t, H * 4, { isStatic: true }),
      Bodies.rectangle(W / 2, -H * 1.5 - t / 2, W + 2 * t, t, { isStatic: true }),
    ];
    Composite.add(P.engine.world, P.walls);
  };

  // Calm: no falling to watch. The pile is worked out at once and drawn.
  const settle = (steps = 360) => {
    const P = pile.current!;
    for (let k = 0; k < steps; k++) {
      P.bodies.forEach((bd) => bd && !bd.isStatic && P.M.Body.setAngularVelocity(bd, bd.angularVelocity - Math.sin(bd.angle) * 0.006));
      P.M.Engine.update(P.engine, DT);
    }
    draw();
  };

  // The slots "Tidy up" lines them into: rows along the bottom, left
  // first, big before small. Each row sits on the one below it.
  const slots = () => {
    const b = board.current!;
    const W = b.clientWidth;
    const H = b.clientHeight;
    const pad = narrow() ? 20 : 40;
    const gap = 10;
    const order = items.map((_, i) => i).sort((x, y) => rank(items[x]) - rank(items[y]));
    const rows: number[][] = [[]];
    let rw = pad;
    order.forEach((i) => {
      const { w } = size(i);
      if (rw + w > W - pad && rows.at(-1)!.length) {
        rows.push([]);
        rw = pad;
      }
      rows.at(-1)!.push(i);
      rw += w + gap;
    });
    const out: { x: number; y: number }[] = [];
    let base = H - pad;
    rows.forEach((r) => {
      let x = pad;
      r.forEach((i) => {
        const { w, h } = size(i);
        out[i] = { x: x + w / 2, y: base - h / 2 };
        x += w + gap;
      });
      base -= Math.max(...r.map((i) => size(i).h)) + gap;
    });
    // How tall the board has to be for the top row to clear "Tidy up".
    const bt = b.querySelector<HTMLElement>(".btop");
    const need = H - base - gap + (bt ? bt.offsetTop + bt.offsetHeight : 0) + gap * 2;
    return { out, need };
  };

  const release = () => {
    const P = pile.current;
    if (!P) return;
    P.tidyTo = null;
    P.locked = false;
    P.bodies.forEach((b) => {
      if (!b) return;
      P.M.Body.setStatic(b, false);
      P.M.Body.setVelocity(b, { x: 0, y: 0 });
      P.M.Body.setAngularVelocity(b, 0);
    });
  };

  const neat = () => {
    const P = pile.current;
    if (!P) return;
    let { out: to, need } = slots();
    // A narrow board can't hold every row: it grows to fit, then stays.
    if (need > board.current!.clientHeight) {
      board.current!.style.minHeight = `${Math.ceil(need)}px`;
      walls(P);
      ({ out: to, need } = slots());
    }
    items.forEach((_, i) => {
      if (!P.bodies[i]) add(i, to[i].x, to[i].y - 400, 0);
    });
    P.bodies.forEach((b) => b && P.M.Body.setStatic(b, true));
    P.tidyFrom = P.bodies.map((b) => ({ x: b!.position.x, y: b!.position.y, a: b!.angle }));
    P.tidyTo = to;
    P.tidyT = now();
    P.locked = true;
    setTidy(true);
    if (calm()) {
      P.bodies.forEach((b, i) => {
        P.M.Body.setPosition(b!, to[i]);
        P.M.Body.setAngle(b!, 0);
      });
      P.tidyTo = null;
      draw();
    }
  };

  const mess = () => {
    const P = pile.current;
    if (!P) return;
    release();
    setTidy(false);
    const W = board.current!.clientWidth;
    P.bodies.forEach((b) => {
      if (!b) return;
      if (calm()) {
        P.M.Body.setPosition(b, { x: rnd(60, W - 60), y: rnd(-300, 0) });
        P.M.Body.setAngle(b, rnd(-0.4, 0.4));
      } else {
        const dir = b.position.x < W / 2 ? 1 : -1;
        P.M.Body.setVelocity(b, { x: dir * rnd(2, 9), y: rnd(-17, -10) });
        P.M.Body.setAngularVelocity(b, rnd(-0.25, 0.25));
      }
    });
    if (calm()) settle();
  };

  const lift = (i: number) => setZ((o) => [...o.filter((k) => k !== i), i]);

  // ---------- the engine: loads when the board is near, runs while seen ----------
  useEffect(() => {
    const b = board.current;
    if (!b) return;
    let raf = 0;
    let seen = false;
    let dead = false;
    let w = innerWidth;

    const frame = () => {
      raf = 0;
      const P = pile.current;
      if (!P || !seen || dead) return;
      if (P.tidyTo) {
        // Each sticker glides from where it lay to its slot (ease-out
        // quart), 24ms apart, so the sort reads as a wave.
        let done = true;
        P.bodies.forEach((bd, i) => {
          if (!bd) return;
          const t = Math.min(1, Math.max(0, (now() - P.tidyT - i * 24) / 560));
          if (t < 1) done = false;
          const e = 1 - Math.pow(1 - t, 4);
          const f = P.tidyFrom[i];
          const to = P.tidyTo![i];
          P.M.Body.setPosition(bd, { x: f.x + (to.x - f.x) * e, y: f.y + (to.y - f.y) * e });
          P.M.Body.setAngle(bd, f.a * (1 - e));
        });
        if (done) P.tidyTo = null;
      }
      // Weighted like a roly-poly: a sticker always rights itself, so
      // none ends up upside down and unreadable.
      P.bodies.forEach((bd) => {
        if (bd && !bd.isStatic && P.grab?.bodyB !== bd) P.M.Body.setAngularVelocity(bd, bd.angularVelocity - Math.sin(bd.angle) * 0.006);
      });
      P.M.Engine.update(P.engine, DT);
      draw();
      raf = requestAnimationFrame(frame);
    };
    const run = () => {
      if (!raf && seen && !dead) raf = requestAnimationFrame(frame);
    };

    const start = async () => {
      const M = await import("matter-js");
      if (dead || pile.current) return;
      const engine = M.Engine.create({ gravity: { x: 0, y: 1.1 } });
      const P: Pile = { M, engine, bodies: items.map(() => null), walls: [], grab: null, tidyTo: null, tidyFrom: [], tidyT: 0, locked: false };
      pile.current = P;
      walls(P);
      const W = b.clientWidth;
      // In they fall, one after another, from just above the board.
      const order = items.map((_, i) => i).sort(() => Math.random() - 0.5);
      if (calm() || tidyRef.current) {
        order.forEach((i, k) => add(i, rnd(80, W - 80), -60 - k * 70));
        settle();
        if (tidyRef.current) neat();
      } else {
        order.forEach((i, k) =>
          setTimeout(() => {
            if (dead || P.bodies[i]) return;
            const bd = add(i, rnd(80, W - 80), -size(i).h - rnd(0, 60));
            M.Body.setVelocity(bd, { x: rnd(-2, 2), y: rnd(0, 3) });
            M.Body.setAngularVelocity(bd, rnd(-0.08, 0.08));
          }, k * 110),
        );
      }
      run();
    };

    const io = new IntersectionObserver(
      ([e]) => {
        seen = e.isIntersecting;
        if (seen) {
          if (!pile.current) void start();
          run();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(b);

    // Only a change of width moves the walls: a phone's address bar
    // showing or hiding shouldn't shake the pile.
    const rs = () => {
      if (innerWidth === w) return;
      w = innerWidth;
      const P = pile.current;
      if (!P) return;
      // A tidy may have grown the board; start from its own height again.
      b.style.minHeight = "";
      walls(P);
      const W = b.clientWidth;
      P.bodies.forEach((bd, i) => {
        if (!bd) return;
        // Past the phone breakpoint the stickers change size: the bodies follow.
        const { w: nw, h: nh } = size(i);
        if (Math.abs(nw - bd.plugin.w) > 1 || Math.abs(nh - bd.plugin.h) > 1) {
          if (P.grab?.bodyB === bd) letGo();
          P.M.Composite.remove(P.engine.world, bd);
          add(i, bd.position.x, bd.position.y, bd.angle);
        }
        const nb = P.bodies[i]!;
        if (nb.position.x > W - 20) P.M.Body.setPosition(nb, { x: W - 80, y: -40 });
      });
      if (tidyRef.current) neat();
      if (calm()) settle(120);
    };
    addEventListener("resize", rs);
    return () => {
      dead = true;
      io.disconnect();
      cancelAnimationFrame(raf);
      removeEventListener("resize", rs);
      const P = pile.current;
      if (P) {
        P.M.Engine.clear(P.engine);
        P.M.Composite.clear(P.engine.world, false);
      }
      pile.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the pile is built once per mount
  }, []);

  // ---------- your hands ----------
  const local = (x: number, y: number) => {
    const r = board.current!.getBoundingClientRect();
    return { x: x - r.left, y: y - r.top };
  };
  const grabAt = (i: number, at: { x: number; y: number }) => {
    const P = pile.current!;
    const bd = P.bodies[i]!;
    if (P.locked) release();
    if (P.grab) P.M.Composite.remove(P.engine.world, P.grab);
    P.grab = P.M.Constraint.create({
      pointA: at,
      bodyB: bd,
      pointB: { x: at.x - bd.position.x, y: at.y - bd.position.y },
      stiffness: 0.2,
      damping: 0.08,
      length: 0,
    });
    P.M.Composite.add(P.engine.world, P.grab);
    setTidy(false);
  };
  const letGo = () => {
    const P = pile.current;
    if (!P?.grab) return;
    P.M.Composite.remove(P.engine.world, P.grab);
    P.grab = null;
  };
  const hop = (i: number) => {
    const P = pile.current;
    const bd = P?.bodies[i];
    if (!P || !bd) return;
    if (P.locked) release();
    setTidy(false);
    P.M.Body.setVelocity(bd, { x: rnd(-1.5, 1.5), y: -11 });
    P.M.Body.setAngularVelocity(bd, rnd(-0.12, 0.12));
    if (calm()) settle(120);
  };

  const down = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    const P = pile.current;
    if (!P?.bodies[i] || e.button > 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    lift(i);
    setDragging(i);
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = 0;
    grabAt(i, local(sx, sy));
    const move = (ev: PointerEvent) => {
      moved = Math.max(moved, Math.hypot(ev.clientX - sx, ev.clientY - sy));
      if (P.grab) P.grab.pointA = local(ev.clientX, ev.clientY);
      if (calm()) settle(8);
    };
    // A cancel is the page taking the swipe as a scroll: no hop then.
    const up = (ev: PointerEvent) => {
      setDragging(null);
      letGo();
      if (moved < 4 && ev.type === "pointerup") hop(i);
      if (calm()) settle();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const key = (i: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const d = ({ ArrowLeft: [-7, -3], ArrowRight: [7, -3], ArrowUp: [0, -12], ArrowDown: [0, 8] } as Record<string, number[]>)[e.key];
    const P = pile.current;
    const bd = P?.bodies[i];
    if (!d || !P || !bd) return;
    e.preventDefault();
    lift(i);
    if (P.locked) release();
    setTidy(false);
    P.M.Body.setVelocity(bd, { x: d[0], y: d[1] });
    P.M.Body.setAngularVelocity(bd, d[0] * 0.012);
    if (calm()) settle(120);
  };

  const toggle = () => {
    if (tidy) mess();
    else neat();
    announce(tidy ? "Stickers tossed" : "Stickers tidied");
  };

  // Where a sticker is on screen right now (viewport coordinates).
  const onScreen = (i: number): XY | null => {
    const bd = pile.current?.bodies[i];
    const r = board.current?.getBoundingClientRect();
    return bd && r ? [r.left + bd.position.x, r.top + bd.position.y] : null;
  };

  const beat = useBeat<HTMLElement>({
    need: 0.5,
    // He picks one up, carries it over and lets it drop on the pile.
    async day(g) {
      // Let them land first.
      for (let k = 0; k < 40 && (!pile.current || pile.current.bodies.some((b) => !b)); k++) {
        await wait(100);
        live(g);
      }
      const P = pile.current;
      if (!P || P.bodies.some((b) => !b)) return;
      await wait(900);
      live(g);
      const W = board.current!.clientWidth;
      const i = pick(items.length);
      const bd = P.bodies[i]!;
      await wessel.go(() => onScreen(i), { k: 260, timeout: 800 });
      live(g);
      lift(i);
      wessel.press(true);
      const a = { x: bd.position.x, y: bd.position.y };
      const b = { x: a.x < W / 2 ? a.x + W * 0.25 : a.x - W * 0.25, y: Math.max(60, a.y - 200) };
      grabAt(i, a);
      try {
        const r = board.current!.getBoundingClientRect();
        await wessel.drag(
          () => [r.left + a.x, r.top + a.y],
          () => [r.left + b.x, r.top + b.y],
          900,
          (e) => {
            if (P.grab) P.grab.pointA = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
          },
        );
        live(g);
        await wait(160);
      } finally {
        letGo();
        wessel.press(false);
      }
      wessel.free();
    },
    reset() {
      if (tidyRef.current) mess();
    },
  });

  return (
    <section ref={beat} className="frame" data-row aria-label="Off screen">
      <div className="side" />
      <div ref={board} className="cell board bg-dots">
        <div className="btop">
          <p id="stk-help" className="sr-only">Stickers you can throw around. Arrow keys push the one in focus, Enter makes it hop.</p>
          <button ref={btn} type="button" className="tidy text-micro-caps" aria-pressed={tidy} onClick={toggle}>
            {tidy ? "Mess it up" : "Tidy up"}
          </button>
        </div>
        {items.map((s, i) => {
          return (
            <button
              key={`${s.text}-${i}`}
              ref={(el) => {
                els.current[i] = el;
              }}
              type="button"
              className={`stk ${s.size === "s" ? "text-body" : "text-lead"}`}
              data-tone={s.tone}
              data-size={s.size ?? "m"}
              data-drag={dragging === i ? "" : undefined}
              aria-describedby="stk-help"
              style={{ visibility: "hidden", zIndex: 5 + z.indexOf(i) }}
              onPointerDown={down(i)}
              onKeyDown={key(i)}
              onClick={(e) => e.detail === 0 && hop(i)}
            >
              {s.text}
            </button>
          );
        })}
      </div>
      <div className="side" />
    </section>
  );
}
