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
  matter: Matter;
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

const between = (a: number, b: number) => a + Math.random() * (b - a);
const pick = (n: number) => Math.floor(Math.random() * n);
const now = () => performance.now();
const calm = () => getMotion().calm;
const STEP_MS = 1000 / 60;

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
  const tidyButton = useRef<HTMLButtonElement>(null);
  const stickerEls = useRef<(HTMLButtonElement | null)[]>([]);
  const pileRef = useRef<Pile | null>(null);
  const [tidy, setTidy] = useState(false);
  const [stack, setStack] = useState<number[]>(() => items.map((_, i) => i));
  const [dragging, setDragging] = useState<number | null>(null);
  const tidyRef = useRef(false);
  useEffect(() => {
    tidyRef.current = tidy;
  }, [tidy]);

  const size = (i: number) => {
    const e = stickerEls.current[i];
    return { w: e?.offsetWidth ?? 120, h: e?.offsetHeight ?? 48 };
  };

  const draw = () => {
    const pile = pileRef.current;
    if (!pile) return;
    pile.bodies.forEach((b, i) => {
      const e = stickerEls.current[i];
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

  const add = (i: number, x: number, y: number, a = between(-0.25, 0.25)) => {
    const pile = pileRef.current!;
    const { w, h } = size(i);
    const b = pile.matter.Bodies.rectangle(x, y, w, h, {
      chamfer: { radius: h / 2 - 1 },
      angle: a,
      restitution: 0.25,
      friction: 0.5,
      frictionAir: 0.012,
      density: 0.0016,
    });
    b.plugin = { w, h };
    pile.bodies[i] = b;
    pile.matter.Composite.add(pile.engine.world, b);
    return b;
  };

  const walls = (pile: Pile) => {
    const b = board.current!;
    const boardW = b.clientWidth;
    const boardH = b.clientHeight;
    const { Bodies, Composite } = pile.matter;
    if (pile.walls.length) Composite.remove(pile.engine.world, pile.walls);
    const t = 200;
    // The side walls stand 16px inside the frame, so no sticker sits on a line.
    const i = 16;
    pile.walls = [
      Bodies.rectangle(boardW / 2, boardH + t / 2, boardW + 2 * t, t, { isStatic: true }),
      Bodies.rectangle(i - t / 2, boardH / 2 - boardH, t, boardH * 4, { isStatic: true }),
      Bodies.rectangle(boardW - i + t / 2, boardH / 2 - boardH, t, boardH * 4, { isStatic: true }),
      Bodies.rectangle(boardW / 2, -boardH * 1.5 - t / 2, boardW + 2 * t, t, { isStatic: true }),
    ];
    Composite.add(pile.engine.world, pile.walls);
  };

  // Calm: no falling to watch. The pile is worked out at once and drawn.
  const settle = (steps = 360) => {
    const pile = pileRef.current!;
    for (let k = 0; k < steps; k++) {
      pile.bodies.forEach((body) => body && !body.isStatic && pile.matter.Body.setAngularVelocity(body, body.angularVelocity - Math.sin(body.angle) * 0.006));
      pile.matter.Engine.update(pile.engine, STEP_MS);
    }
    draw();
  };

  // The slots "Tidy up" lines them into: rows along the bottom, left
  // first, big before small. Each row sits on the one below it.
  const slots = () => {
    const b = board.current!;
    const boardW = b.clientWidth;
    const boardH = b.clientHeight;
    const pad = narrow() ? 20 : 40;
    const gap = 10;
    const order = items.map((_, i) => i).sort((x, y) => rank(items[x]) - rank(items[y]));
    const rows: number[][] = [[]];
    let rowWidth = pad;
    order.forEach((i) => {
      const { w } = size(i);
      if (rowWidth + w > boardW - pad && rows.at(-1)!.length) {
        rows.push([]);
        rowWidth = pad;
      }
      rows.at(-1)!.push(i);
      rowWidth += w + gap;
    });
    const out: { x: number; y: number }[] = [];
    let base = boardH - pad;
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
    const boardTop = b.querySelector<HTMLElement>(".btop");
    const need = boardH - base - gap + (boardTop ? boardTop.offsetTop + boardTop.offsetHeight : 0) + gap * 2;
    return { out, need };
  };

  const release = () => {
    const pile = pileRef.current;
    if (!pile) return;
    pile.tidyTo = null;
    pile.locked = false;
    pile.bodies.forEach((b) => {
      if (!b) return;
      pile.matter.Body.setStatic(b, false);
      pile.matter.Body.setVelocity(b, { x: 0, y: 0 });
      pile.matter.Body.setAngularVelocity(b, 0);
    });
  };

  const neat = () => {
    const pile = pileRef.current;
    if (!pile) return;
    let { out: to, need } = slots();
    // A narrow board can't hold every row: it grows to fit, then stays.
    if (need > board.current!.clientHeight) {
      board.current!.style.minHeight = `${Math.ceil(need)}px`;
      walls(pile);
      ({ out: to, need } = slots());
    }
    items.forEach((_, i) => {
      if (!pile.bodies[i]) add(i, to[i].x, to[i].y - 400, 0);
    });
    pile.bodies.forEach((b) => b && pile.matter.Body.setStatic(b, true));
    pile.tidyFrom = pile.bodies.map((b) => ({ x: b!.position.x, y: b!.position.y, a: b!.angle }));
    pile.tidyTo = to;
    pile.tidyT = now();
    pile.locked = true;
    setTidy(true);
    if (calm()) {
      pile.bodies.forEach((b, i) => {
        pile.matter.Body.setPosition(b!, to[i]);
        pile.matter.Body.setAngle(b!, 0);
      });
      pile.tidyTo = null;
      draw();
    }
  };

  const mess = () => {
    const pile = pileRef.current;
    if (!pile) return;
    release();
    setTidy(false);
    const boardW = board.current!.clientWidth;
    pile.bodies.forEach((b) => {
      if (!b) return;
      if (calm()) {
        pile.matter.Body.setPosition(b, { x: between(60, boardW - 60), y: between(-300, 0) });
        pile.matter.Body.setAngle(b, between(-0.4, 0.4));
      } else {
        const dir = b.position.x < boardW / 2 ? 1 : -1;
        pile.matter.Body.setVelocity(b, { x: dir * between(2, 9), y: between(-17, -10) });
        pile.matter.Body.setAngularVelocity(b, between(-0.25, 0.25));
      }
    });
    if (calm()) settle();
  };

  const lift = (i: number) => setStack((o) => [...o.filter((k) => k !== i), i]);

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
      const pile = pileRef.current;
      if (!pile || !seen || dead) return;
      if (pile.tidyTo) {
        // Each sticker glides from where it lay to its slot (ease-out
        // quart), 24ms apart, so the sort reads as a wave.
        let done = true;
        pile.bodies.forEach((body, i) => {
          if (!body) return;
          const t = Math.min(1, Math.max(0, (now() - pile.tidyT - i * 24) / 560));
          if (t < 1) done = false;
          const e = 1 - Math.pow(1 - t, 4);
          const f = pile.tidyFrom[i];
          const to = pile.tidyTo![i];
          pile.matter.Body.setPosition(body, { x: f.x + (to.x - f.x) * e, y: f.y + (to.y - f.y) * e });
          pile.matter.Body.setAngle(body, f.a * (1 - e));
        });
        if (done) pile.tidyTo = null;
      }
      // Weighted like a roly-poly: a sticker always rights itself, so
      // none ends up upside down and unreadable.
      pile.bodies.forEach((body) => {
        if (body && !body.isStatic && pile.grab?.bodyB !== body) pile.matter.Body.setAngularVelocity(body, body.angularVelocity - Math.sin(body.angle) * 0.006);
      });
      pile.matter.Engine.update(pile.engine, STEP_MS);
      draw();
      raf = requestAnimationFrame(frame);
    };
    const run = () => {
      if (!raf && seen && !dead) raf = requestAnimationFrame(frame);
    };

    const start = async () => {
      const matter = await import("matter-js");
      if (dead || pileRef.current) return;
      const engine = matter.Engine.create({ gravity: { x: 0, y: 1.1 } });
      const pile: Pile = { matter, engine, bodies: items.map(() => null), walls: [], grab: null, tidyTo: null, tidyFrom: [], tidyT: 0, locked: false };
      pileRef.current = pile;
      walls(pile);
      const boardW = b.clientWidth;
      // In they fall, one after another, from just above the board.
      const order = items.map((_, i) => i).sort(() => Math.random() - 0.5);
      if (calm() || tidyRef.current) {
        order.forEach((i, k) => add(i, between(80, boardW - 80), -60 - k * 70));
        settle();
        if (tidyRef.current) neat();
      } else {
        order.forEach((i, k) =>
          setTimeout(() => {
            if (dead || pile.bodies[i]) return;
            const body = add(i, between(80, boardW - 80), -size(i).h - between(0, 60));
            matter.Body.setVelocity(body, { x: between(-2, 2), y: between(0, 3) });
            matter.Body.setAngularVelocity(body, between(-0.08, 0.08));
          }, k * 110),
        );
      }
      run();
    };

    const io = new IntersectionObserver(
      ([e]) => {
        seen = e.isIntersecting;
        if (seen) {
          if (!pileRef.current) void start();
          run();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(b);

    // Only a change of width moves the walls: a phone's address bar
    // showing or hiding shouldn't shake the pile.
    const resized = () => {
      if (innerWidth === w) return;
      w = innerWidth;
      const pile = pileRef.current;
      if (!pile) return;
      // A tidy may have grown the board; start from its own height again.
      b.style.minHeight = "";
      walls(pile);
      const boardW = b.clientWidth;
      pile.bodies.forEach((body, i) => {
        if (!body) return;
        // Past the phone breakpoint the stickers change size: the bodies follow.
        const { w: nw, h: nh } = size(i);
        if (Math.abs(nw - body.plugin.w) > 1 || Math.abs(nh - body.plugin.h) > 1) {
          if (pile.grab?.bodyB === body) letGo();
          pile.matter.Composite.remove(pile.engine.world, body);
          add(i, body.position.x, body.position.y, body.angle);
        }
        const nextBody = pile.bodies[i]!;
        if (nextBody.position.x > boardW - 20) pile.matter.Body.setPosition(nextBody, { x: boardW - 80, y: -40 });
      });
      if (tidyRef.current) neat();
      if (calm()) settle(120);
    };
    addEventListener("resize", resized);
    return () => {
      dead = true;
      io.disconnect();
      cancelAnimationFrame(raf);
      removeEventListener("resize", resized);
      const pile = pileRef.current;
      if (pile) {
        pile.matter.Engine.clear(pile.engine);
        pile.matter.Composite.clear(pile.engine.world, false);
      }
      pileRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the pile is built once per mount
  }, []);

  // ---------- your hands ----------
  const local = (x: number, y: number) => {
    const r = board.current!.getBoundingClientRect();
    return { x: x - r.left, y: y - r.top };
  };
  const grabAt = (i: number, at: { x: number; y: number }) => {
    const pile = pileRef.current!;
    const body = pile.bodies[i]!;
    if (pile.locked) release();
    if (pile.grab) pile.matter.Composite.remove(pile.engine.world, pile.grab);
    pile.grab = pile.matter.Constraint.create({
      pointA: at,
      bodyB: body,
      pointB: { x: at.x - body.position.x, y: at.y - body.position.y },
      stiffness: 0.2,
      damping: 0.08,
      length: 0,
    });
    pile.matter.Composite.add(pile.engine.world, pile.grab);
    setTidy(false);
  };
  const letGo = () => {
    const pile = pileRef.current;
    if (!pile?.grab) return;
    pile.matter.Composite.remove(pile.engine.world, pile.grab);
    pile.grab = null;
  };
  const hop = (i: number) => {
    const pile = pileRef.current;
    const body = pile?.bodies[i];
    if (!pile || !body) return;
    if (pile.locked) release();
    setTidy(false);
    pile.matter.Body.setVelocity(body, { x: between(-1.5, 1.5), y: -11 });
    pile.matter.Body.setAngularVelocity(body, between(-0.12, 0.12));
    if (calm()) settle(120);
  };

  const down = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    const pile = pileRef.current;
    if (!pile?.bodies[i] || e.button > 0) return;
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
      if (pile.grab) pile.grab.pointA = local(ev.clientX, ev.clientY);
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
    const nudge = ({ ArrowLeft: [-7, -3], ArrowRight: [7, -3], ArrowUp: [0, -12], ArrowDown: [0, 8] } as Record<string, number[]>)[e.key];
    const pile = pileRef.current;
    const body = pile?.bodies[i];
    if (!nudge || !pile || !body) return;
    e.preventDefault();
    lift(i);
    if (pile.locked) release();
    setTidy(false);
    pile.matter.Body.setVelocity(body, { x: nudge[0], y: nudge[1] });
    pile.matter.Body.setAngularVelocity(body, nudge[0] * 0.012);
    if (calm()) settle(120);
  };

  const toggle = () => {
    if (tidy) mess();
    else neat();
    announce(tidy ? "Stickers tossed" : "Stickers tidied");
  };

  // Where a sticker is on screen right now (viewport coordinates).
  const onScreen = (i: number): XY | null => {
    const body = pileRef.current?.bodies[i];
    const r = board.current?.getBoundingClientRect();
    return body && r ? [r.left + body.position.x, r.top + body.position.y] : null;
  };

  const beat = useBeat<HTMLElement>({
    need: 0.5,
    // He picks one up, carries it over and lets it drop on the pile.
    async day(g) {
      // Let them land first.
      for (let k = 0; k < 40 && (!pileRef.current || pileRef.current.bodies.some((b) => !b)); k++) {
        await wait(100);
        live(g);
      }
      const pile = pileRef.current;
      if (!pile || pile.bodies.some((b) => !b)) return;
      await wait(900);
      live(g);
      const boardW = board.current!.clientWidth;
      const i = pick(items.length);
      const body = pile.bodies[i]!;
      await wessel.go(() => onScreen(i), { k: 260, timeout: 800 });
      live(g);
      lift(i);
      wessel.press(true);
      const a = { x: body.position.x, y: body.position.y };
      const b = { x: a.x < boardW / 2 ? a.x + boardW * 0.25 : a.x - boardW * 0.25, y: Math.max(60, a.y - 200) };
      grabAt(i, a);
      try {
        const r = board.current!.getBoundingClientRect();
        await wessel.drag(
          () => [r.left + a.x, r.top + a.y],
          () => [r.left + b.x, r.top + b.y],
          900,
          (e) => {
            if (pile.grab) pile.grab.pointA = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
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
          <button ref={tidyButton} type="button" className="tidy text-small" aria-pressed={tidy} onClick={toggle}>
            {tidy ? "Mess it up" : "Tidy up"}
          </button>
        </div>
        {items.map((s, i) => {
          return (
            <button
              key={`${s.text}-${i}`}
              ref={(el) => {
                stickerEls.current[i] = el;
              }}
              type="button"
              className={`stk ${s.size === "s" ? "text-body" : "text-lead"}`}
              data-tone={s.tone}
              data-size={s.size ?? "m"}
              data-drag={dragging === i ? "" : undefined}
              aria-describedby="stk-help"
              style={{ visibility: "hidden", zIndex: 5 + stack.indexOf(i) }}
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
