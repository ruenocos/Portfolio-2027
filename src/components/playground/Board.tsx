"use client";

import { useEffect, useRef } from "react";
import { useBeat } from "@/components/canvas/useBeat";
import { useMotion } from "@/components/useMotion";
import type { Post } from "@/content/playground";
import { announce, getMotion, subscribeMotion } from "@/lib/motion";
import { live, wait, wessel, type XY } from "@/lib/wessel";

type Item = {
  el: HTMLElement;
  pi: HTMLElement;
  fl: HTMLElement;
  p: Post;
  y: number;
  h: number;
  v: HTMLVideoElement | null;
  x: number;
  yy: number;
  lx: number;
  ly: number;
  vis: boolean;
};
type Col = { x: number; items: Item[]; H: number };

const mod = (a: number, n: number) => ((a % n) + n) % n;
// A seeded random (mulberry32): the same posts lay out the same board on
// every visit, so the spacing below is a promise, not luck.
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const calm = () => getMotion().calm;
const wide = () => innerWidth >= 900;

function postEl(p: Post) {
  const f = document.createElement("figure");
  f.className = "post";
  // Your cursor names what you're over (CursorLayer reads [data-you]).
  f.dataset.you = p.title;
  const pi = document.createElement("div");
  pi.className = "pi";
  if (p.tint) pi.dataset.tint = p.tint;
  if (p.video) {
    const v = document.createElement("video");
    Object.assign(v, { muted: true, loop: true, playsInline: true, preload: "metadata" });
    v.src = p.video;
    if (p.src) v.poster = p.src;
    v.setAttribute("aria-hidden", "true");
    v.addEventListener("loadeddata", () => v.classList.add("ok"));
    pi.appendChild(v);
  } else if (p.src) {
    const i = document.createElement("img");
    i.src = p.src;
    i.alt = "";
    i.draggable = false;
    i.loading = "lazy";
    const ok = () => i.classList.add("ok");
    if (i.complete && i.naturalWidth) ok();
    else i.addEventListener("load", ok);
    pi.appendChild(i);
  }
  if (p.mock) {
    const m = document.createElement("span");
    m.className = "mock text-micro-caps";
    m.dataset.mock = "";
    m.textContent = "mock";
    pi.appendChild(m);
  }
  // Its frame name, like Figma's: just above the top-left corner.
  const fl = document.createElement("figcaption");
  fl.className = "fl text-micro-caps";
  fl.textContent = p.title;
  f.append(fl, pi);
  return f;
}

/**
 * Playground (v08, approved): one big masonry on a pannable board that loops
 * back to where it started, sideways and down. Drag (with a throw), wheel or
 * trackpad, arrow keys; tap a post (or Enter for the middle one) to lift it
 * open. Idle, it drifts down. Wessel drives it: he grabs a post that's
 * half out of view, drags it in, and selects it. He never opens one; that's
 * yours. Touch anything and he lets go and waits. Pause: still.
 * Like a Figma canvas: every tile wears its frame name, the one you're over
 * turns grape (yours) and your cursor names it. On arrival Wessel says hello
 * by selecting one tile in view, real size label and all.
 */
type Hello = {
  pick: () => Item | null;
  ok: (it: Item) => boolean;
  at: (it: Item) => XY | null;
  show: () => void;
  end: () => void;
};

export function Board({ posts }: { posts: Post[] }) {
  const hi = useRef<Hello | null>(null);
  // His arrival beat: glide to a tile in view, select it, hold, let go.
  // Paused or reduced motion: no beat (and no selection).
  const cvRef = useBeat<HTMLDivElement>({
    async day(g) {
      await wait(1000);
      live(g);
      const b = hi.current;
      const it = b?.pick();
      if (!b || !it) return b?.end();
      try {
        await wessel.go(() => b.at(it), { k: 220, timeout: 1400 });
        live(g);
        if (!b.ok(it)) return;
        wessel.press(true);
        b.show();
        await wait(120);
        wessel.press(false);
        await wait(1200);
        live(g);
      } finally {
        b.end();
      }
    },
    still: () => hi.current?.end(),
    reset: () => hi.current?.end(),
  });
  const worldRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<HTMLSpanElement>(null);
  const { calm: still } = useMotion();
  const mode = useRef({ still });
  useEffect(() => {
    mode.current = { still };
  }, [still]);

  useEffect(() => {
    const cv = cvRef.current!;
    const world = worldRef.current!;
    const wsel = selRef.current!;
    const szp = wsel.querySelector<HTMLElement>(".szp")!;
    let CW = 300;
    let G = 24;
    let TW = 0;
    let cols: Col[] = [];
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;
    let vx = 0;
    let vy = 0;
    let last = performance.now();
    let idle = last;
    let dragging = false;
    let movingTill = 0;
    let mptr: XY | null = null;
    let first = true;
    let raf = 0;
    type Open = { it: Item; lb: HTMLElement; m: HTMLElement; s: number; R: number; x: HTMLButtonElement; closing?: boolean };
    let opened: Open | null = null;
    let hov: Item | null = null;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    // The row gap (it holds the frame names on desktop) and the left inset
    // that centres the columns that fit: at rest the gutters left and right
    // match, and no tile is cut at the sides.
    let GY = 24;
    let OX = 24;
    const build = () => {
      world.textContent = "";
      cols = [];
      hov = null;
      const mob = !wide();
      const W = cv.clientWidth;
      const H = cv.clientHeight;
      G = mob ? 12 : 24;
      GY = mob ? G : 52;
      const fit = Math.max(2, Math.round((W - G) / ((mob ? 170 : 300) + G)));
      CW = Math.floor((W - G * (fit + 1)) / fit);
      OX = Math.round((W - fit * CW - (fit - 1) * G) / 2);
      // Twice the screen each way, so a post can repeat a screen away.
      const n = Math.max(8, fit * 2 + 2);
      TW = n * (CW + G);
      const minH = Math.max(1800, H * 2 + 400);
      const lift = Math.round(CW * 0.35);
      const tops = Array.from({ length: n }, (_, c) => (c % 2 ? lift : 0));
      for (let c = 0; c < n; c++) cols.push({ x: c * (CW + G), items: [], H: 0 });
      // Deterministic placement. The shortest column fills next (the board
      // grows like one sheet), with the post whose nearest twin is furthest
      // away, counted in screens and across the wrap. A twin a whole screen
      // away or more is far enough; among those the least used post goes, so
      // the mix stays even. The first row keeps the Studio's order, so the
      // post Wons put first opens the board, whole, top left.
      const rnd = seeded(posts.length * 7919 + 17);
      const used = new Map<Post, number>();
      const twins = new Map<Post, XY[]>();
      const apart = (p: Post, cx: number, cy: number) => {
        let d = Infinity;
        for (const [x, y] of twins.get(p) ?? []) {
          const dx = Math.abs(cx - x);
          const dy = Math.abs(cy - y);
          d = Math.min(d, Math.max(Math.min(dx, TW - dx) / W, Math.min(dy, minH - dy) / H));
        }
        return d;
      };
      while (true) {
        let c = -1;
        for (let i = 0; i < n; i++) if (tops[i] < minH && (c < 0 || tops[i] < tops[c])) c = i;
        if (c < 0) break;
        const col = cols[c];
        const y = tops[c];
        let p = posts[c];
        if (col.items.length || c >= Math.min(fit, posts.length)) {
          let best: Post[] = [];
          let top = -Infinity;
          for (const q of posts) {
            const sc = Math.min(1, apart(q, col.x + CW / 2, y + CW / q.ar / 2)) * 1000 - (used.get(q) ?? 0);
            if (sc > top + 1e-6) {
              top = sc;
              best = [q];
            } else if (sc > top - 1e-6) best.push(q);
          }
          p = best[Math.floor(rnd() * best.length)];
        }
        const h = Math.round(CW / p.ar);
        used.set(p, (used.get(p) ?? 0) + 1);
        twins.set(p, [...(twins.get(p) ?? []), [col.x + CW / 2, y + h / 2]]);
        const el = postEl(p);
        el.style.width = `${CW}px`;
        el.style.height = `${h}px`;
        world.appendChild(el);
        // Load-in: a wave from the top-left corner, on first paint only.
        el.style.setProperty("--d", first && !calm() ? `${Math.min(900, Math.hypot(col.x, y) * 0.45)}ms` : "0ms");
        const pi = el.querySelector<HTMLElement>(".pi")!;
        const fl = el.querySelector<HTMLElement>(".fl")!;
        col.items.push({ el, pi, fl, p, y, h, v: el.querySelector("video"), x: 0, yy: 0, lx: 0, ly: 0, vis: false });
        tops[c] = y + h + GY;
      }
      cols.forEach((col, c) => (col.H = tops[c]));
      first = false;
      requestAnimationFrame(() => requestAnimationFrame(() => cols.forEach((c) => c.items.forEach((it) => it.el.classList.add("in")))));
      later(() => cols.forEach((c) => c.items.forEach((it) => it.el.style.removeProperty("--d"))), 1700);
    };

    // ---------- Wessel drives the board (desktop, not paused) ----------
    // Only while the board is mostly on screen: scrolled away to the footer,
    // he lets go instead of hanging on at the edge.
    const onScreen = () => {
      const r = cv.getBoundingClientRect();
      return r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.6;
    };
    const wesOn = () => !mode.current.still && wide() && onScreen();
    const S = { s: "rest", t: performance.now() + 900, it: null as Item | null, D: [0, 0], from: [0, 0], g: [0, 0], t0: 0, dur: 0, shown: false };
    // His hello comes first (the arrival beat below): he leaves the board
    // alone until it's done, or after a while if it never plays.
    let hello = true;
    later(() => (hello = false), 6000);
    let pausedTill = 0;
    let target: XY | null = null;
    let driving = false;
    // His target, in board coordinates; the engine springs him there.
    const drive = (): XY | null => {
      if (!target || !wesOn()) return null;
      const r = cv.getBoundingClientRect();
      return [r.left + target[0], r.top + target[1]];
    };
    const steer = (x: number, y: number, k = 180) => {
      target = [x, y];
      if (!driving || k !== S.t0) {
        driving = true;
        void wessel.go(drive, { k });
      }
    };
    const dist = () => {
      const t = drive();
      if (!t) return 0;
      const [x, y] = wessel.pos();
      return Math.hypot(t[0] - x, t[1] - y);
    };
    const pause = () => {
      pausedTill = performance.now() + 6000;
      if (S.s === "drag") {
        tx = px;
        ty = py;
      }
      wessel.press(false);
      S.s = "rest";
      S.t = pausedTill;
      S.it = null;
    };
    const sel = (it: Item | null) => {
      if (!it) return wsel.removeAttribute("data-on");
      wsel.style.transform = `translate(${it.x + it.lx - 4}px,${it.yy + it.ly - 4}px)`;
      wsel.style.width = `${CW + 8}px`;
      wsel.style.height = `${it.h + 8}px`;
      szp.textContent = `${CW} × ${it.h}`;
      wsel.dataset.on = "";
    };
    // The hello beat's handles: a tile to pick, where to point, show, done.
    hi.current = {
      pick: () => {
        if (!wesOn() || opened || dragging) return null;
        const W = cv.clientWidth;
        const H = cv.clientHeight;
        let best: Item | null = null;
        let bd = Infinity;
        // A real piece, whole on screen, near the middle; not the one you're on.
        for (const col of cols)
          for (const it of col.items) {
            if (it === hov || !(it.p.src || it.p.video) || it.p.mock) continue;
            if (it.x < 24 || it.x + CW > W - 24 || it.yy < 24 || it.yy + it.h > H - 48) continue;
            const d = Math.hypot(it.x + CW / 2 - W * 0.55, it.yy + it.h / 2 - H * 0.45);
            if (d < bd) {
              bd = d;
              best = it;
            }
          }
        if (best) Object.assign(S, { s: "hello", it: best, shown: false });
        return best;
      },
      ok: (it) => S.s === "hello" && S.it === it && wesOn(),
      at: (it) => {
        if (S.s !== "hello" || S.it !== it || !wesOn()) return null;
        const r = cv.getBoundingClientRect();
        return [r.left + it.x + it.lx + CW * 0.72, r.top + it.yy + it.ly + it.h * 0.8];
      },
      show: () => (S.shown = S.s === "hello"),
      end: () => {
        hello = false;
        if (S.s !== "hello") return;
        Object.assign(S, { s: "rest", it: null, shown: false, t: performance.now() + 900 });
      },
    };
    const wTick = (now: number, W: number, H: number) => {
      if (!wesOn()) {
        sel(null);
        if (driving) {
          driving = false;
          target = null;
          wessel.free();
        }
        S.s = "rest";
        S.t = now + 900;
        return;
      }
      if (now < pausedTill || dragging || opened) {
        sel(null);
        wessel.press(false);
        return;
      }
      if (S.s === "hello") {
        sel(S.shown ? S.it : null);
        return;
      }
      if (S.s === "rest") {
        sel(null);
        if (now < S.t || hello) return;
        // A post that's half out of view, and a calm spot to bring it to.
        const c: Item[] = [];
        cols.forEach((col) =>
          col.items.forEach((it) => {
            const ow = Math.max(0, Math.min(W, it.x + CW) - Math.max(0, it.x));
            const oh = Math.max(0, Math.min(H, it.yy + it.h) - Math.max(0, it.yy));
            const f = (ow * oh) / (CW * it.h);
            if (it.h < H * 0.62 && f > 0.2 && f < 0.8) c.push(it);
          }),
        );
        if (!c.length) {
          S.t = now + 700;
          return;
        }
        const it = c[Math.floor(Math.random() * c.length)];
        const dx = cl(W * (0.25 + Math.random() * 0.4) - CW / 2, 80, W - CW - 80);
        const dy = cl(H * (0.3 + Math.random() * 0.3) - it.h / 2, 80, H - it.h - 80);
        Object.assign(S, { it, D: [dx - it.x, dy - it.yy], g: [CW * (0.35 + Math.random() * 0.3), it.h * (0.35 + Math.random() * 0.3)], s: "reach", t0: now });
        steer(it.x + S.g[0], it.yy + S.g[1], 160);
        return;
      }
      const it = S.it;
      if (!it) {
        S.s = "rest";
        return;
      }
      if (S.s === "reach") {
        target = [it.x + S.g[0], it.yy + S.g[1]];
        if (dist() < 4 || now - S.t0 > 1600) {
          wessel.press(true);
          S.s = "grab";
          S.t = now + 180;
        }
        return;
      }
      if (S.s === "grab") {
        target = [it.x + S.g[0], it.yy + S.g[1]];
        if (now > S.t) {
          S.s = "drag";
          S.t0 = now;
          S.from = [px, py];
          S.dur = 700 + Math.hypot(S.D[0], S.D[1]) * 0.9;
          // Glued to the post while he drags it.
          void wessel.go(drive, { k: 2400 });
        }
        return;
      }
      if (S.s === "drag") {
        const k = ease(Math.min(1, (now - S.t0) / S.dur));
        px = tx = S.from[0] + S.D[0] * k;
        py = ty = S.from[1] + S.D[1] * k;
        target = [it.x + S.g[0], it.yy + S.g[1]];
        if (k >= 1) {
          wessel.press(false);
          S.s = "select";
          S.t = now + 2000;
          void wessel.go(drive, { k: 180 });
        }
        return;
      }
      if (S.s === "select") {
        if (now < movingTill) return;
        sel(it);
        target = [it.x + it.lx + CW - 14, it.yy + it.ly + it.h - 10];
        if (now > S.t) {
          sel(null);
          S.s = "rest";
          S.t = now + 900;
        }
      }
    };

    // ---------- the board loop ----------
    const frame = (t: number) => {
      const dt = Math.min(48, t - last);
      last = t;
      const ox = px;
      const oy = py;
      const quiet = calm();
      if (!dragging && !opened) {
        if (Math.abs(tx - px) + Math.abs(ty - py) > 0.3) {
          // Smooth wheel.
          const f = quiet ? 1 : Math.min(1, (0.18 * dt) / 16);
          px += (tx - px) * f;
          py += (ty - py) * f;
        } else if (Math.abs(vx) + Math.abs(vy) > 0.02 && !quiet) {
          px += (vx * dt) / 16;
          py += (vy * dt) / 16;
          vx *= Math.pow(0.92, dt / 16);
          vy *= Math.pow(0.92, dt / 16);
          tx = px;
          ty = py;
        } else if (!quiet && !wesOn() && t - idle > 2600 && !document.hidden) {
          // Idle: a slow drift down (when Wessel isn't driving).
          py -= (0.35 * dt) / 16;
          tx = px;
          ty = py;
        }
      }
      // A touch of squash while it moves fast; it springs back as it settles.
      if (dragging || Math.hypot(px - ox, py - oy) > (2.5 * dt) / 16) movingTill = t + 140;
      cv.toggleAttribute("data-moving", t < movingTill && !quiet);
      const W = cv.clientWidth;
      const H = cv.clientHeight;
      const lean = mptr && t > movingTill && !opened && !quiet;
      // The tile under your pointer, worked out here: the board moves under a
      // still mouse too (wheel, drift), and CSS :hover only catches up on the
      // next mouse move.
      let over: Item | null = null;
      for (const col of cols) {
        const x = mod(col.x + px + CW, TW) - CW;
        for (const it of col.items) {
          const y = mod(it.y + py + it.h, col.H) - it.h;
          it.x = x;
          it.yy = y;
          it.el.style.transform = `translate(${x}px,${y}px)`;
          const vis = x > -CW && x < W && y > -it.h && y < H;
          if (it.v && vis !== it.vis) {
            if (vis && !quiet) it.v.play().catch(() => {});
            else it.v.pause();
          }
          it.vis = vis;
          if (vis && mptr && !dragging && !opened && mptr[0] >= x && mptr[0] < x + CW && mptr[1] >= y && mptr[1] < y + it.h)
            over = it;
          // Lean: posts near your pointer drift a few px toward it.
          let lx = 0;
          let ly = 0;
          if (lean && vis && mptr) {
            const dx = mptr[0] - (x + CW / 2);
            const dy = mptr[1] - (y + it.h / 2);
            const d = Math.hypot(dx, dy);
            const R = Math.max(CW, it.h) * 0.75;
            if (d < R && d > 0) {
              const k = 1 - d / R;
              lx = (dx / d) * k * 8;
              ly = (dy / d) * k * 8;
            }
          }
          if (Math.abs(lx - it.lx) + Math.abs(ly - it.ly) > 0.3) {
            it.lx = lx;
            it.ly = ly;
            it.pi.style.translate = it.fl.style.translate = `${lx.toFixed(1)}px ${ly.toFixed(1)}px`;
          }
        }
      }
      if (over !== hov) {
        hov?.el.removeAttribute("data-hover");
        over?.el.setAttribute("data-hover", "");
        hov = over;
        // Your cursor's tag reads the title (or "You" again).
        dispatchEvent(new Event("wsl:look"));
      }
      wTick(t, W, H);
      raf = requestAnimationFrame(frame);
    };

    // ---------- open a post: it lifts out and springs to the middle ----------
    const find = (f: Element) => {
      for (const c of cols) for (const it of c.items) if (it.el === f) return it;
    };
    const openPost = (f: Element) => {
      const it = find(f);
      if (!it || opened) return;
      const W = cv.clientWidth;
      const H = cv.clientHeight;
      const mob = !wide();
      // Room under the media for its caption, so the pair sits centred.
      const CAP = 40;
      const s = Math.min((W * (mob ? 0.9 : 0.8)) / CW, (H * (mob ? 0.7 : 0.8) - CAP) / it.h);
      const w = CW * s;
      const h = it.h * s;
      const top = (H - h - CAP) / 2;
      const lb = document.createElement("div");
      lb.className = "lb";
      lb.setAttribute("role", "dialog");
      lb.setAttribute("aria-modal", "true");
      lb.setAttribute("aria-label", it.p.title);
      const m = document.createElement("div");
      m.className = "lbm";
      if (it.p.tint) m.dataset.tint = it.p.tint;
      m.style.width = `${w}px`;
      m.style.height = `${h}px`;
      if (it.p.video) {
        const v = document.createElement("video");
        Object.assign(v, { muted: true, loop: true, playsInline: true });
        v.src = it.p.video;
        v.currentTime = it.v?.currentTime ?? 0;
        if (!calm()) v.play().catch(() => {});
        m.appendChild(v);
      } else if (it.p.src) {
        const i = document.createElement("img");
        i.src = it.p.src;
        i.alt = "";
        i.draggable = false;
        m.appendChild(i);
      }
      if (it.p.mock) {
        const t = document.createElement("span");
        t.className = "mock text-micro-caps";
        t.dataset.mock = "";
        t.textContent = "mock";
        m.appendChild(t);
      }
      const cap = document.createElement("p");
      cap.className = "lbc text-label";
      cap.textContent = it.p.title;
      // Directly under the opened media, on its left edge.
      Object.assign(cap.style, { left: `${(W - w) / 2}px`, top: `${top + h + 12}px`, width: `${w}px` });
      if (it.p.mock) cap.dataset.mock = "";
      const x = document.createElement("button");
      x.type = "button";
      x.className = "lbx gpill text-micro-caps";
      x.dataset.size = "tap";
      x.textContent = "Close";
      lb.append(m, cap, x);
      cv.appendChild(lb);
      const R = mob ? 16 : 24;
      m.style.borderRadius = `${R / s}px`;
      m.style.transform = `translate(${it.x + it.lx}px,${it.yy + it.ly}px) scale(${1 / s})`;
      it.pi.style.visibility = "hidden";
      opened = { it, lb, m, s, R, x };
      pause();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          lb.dataset.on = "";
          m.style.transform = `translate(${(W - w) / 2}px,${top}px) scale(1)`;
          m.style.borderRadius = `${R}px`;
          x.focus({ preventScroll: true });
        }),
      );
      lb.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        if (e.target === lb || e.target === x) closePost();
      });
      x.addEventListener("keydown", (e) => {
        // One control in the dialog: Tab stays on it.
        if (e.key === "Tab") e.preventDefault();
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          closePost();
        }
      });
    };
    const closePost = () => {
      const o = opened;
      if (!o || o.closing) return;
      o.closing = true;
      delete o.lb.dataset.on;
      o.m.style.transform = `translate(${o.it.x + o.it.lx}px,${o.it.yy + o.it.ly}px) scale(${1 / o.s})`;
      o.m.style.borderRadius = `${o.R / o.s}px`;
      later(
        () => {
          o.it.pi.style.visibility = "";
          o.lb.remove();
          opened = null;
          idle = performance.now();
          cv.focus({ preventScroll: true });
        },
        calm() ? 0 : 560,
      );
    };

    // ---------- input ----------
    const poke = () => {
      idle = performance.now();
      pause();
    };
    const down = (e: PointerEvent) => {
      if (opened || e.button > 0) return;
      cv.setPointerCapture(e.pointerId);
      dragging = true;
      cv.dataset.drag = "";
      poke();
      vx = vy = 0;
      tx = px;
      ty = py;
      let lx = e.clientX;
      let ly = e.clientY;
      let lt = performance.now();
      let moved = 0;
      const t0 = lt;
      const mv = (ev: PointerEvent) => {
        const now = performance.now();
        const dx = ev.clientX - lx;
        const dy = ev.clientY - ly;
        moved += Math.abs(dx) + Math.abs(dy);
        px += dx;
        py += dy;
        tx = px;
        ty = py;
        const k = 16 / Math.max(1, now - lt);
        vx = dx * k;
        vy = dy * k;
        lx = ev.clientX;
        ly = ev.clientY;
        lt = idle = now;
      };
      const up = (ev: PointerEvent) => {
        dragging = false;
        delete cv.dataset.drag;
        if (performance.now() - lt > 80) vx = vy = 0;
        cv.removeEventListener("pointermove", mv);
        cv.removeEventListener("pointerup", up);
        cv.removeEventListener("pointercancel", up);
        // A tap without moving opens the post under it.
        if (ev.type === "pointerup" && moved < 6 && performance.now() - t0 < 500) {
          const f = document.elementsFromPoint(ev.clientX, ev.clientY).find((n) => n.classList.contains("post"));
          if (f) openPost(f);
        }
      };
      cv.addEventListener("pointermove", mv);
      cv.addEventListener("pointerup", up);
      cv.addEventListener("pointercancel", up);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (opened) {
        if (Math.abs(e.deltaY) + Math.abs(e.deltaX) > 4) closePost();
        return;
      }
      const m = e.deltaMode === 1 ? 32 : 1;
      if (Math.abs(tx - px) + Math.abs(ty - py) < 0.3) {
        tx = px;
        ty = py;
      }
      tx -= e.deltaX * m;
      ty -= e.deltaY * m;
      vx = vy = 0;
      poke();
    };
    // The post nearest the middle: the one Enter opens.
    const middle = () => {
      const W = cv.clientWidth;
      const H = cv.clientHeight;
      let best: Item | null = null;
      let bd = Infinity;
      cols.forEach((c) =>
        c.items.forEach((it) => {
          // Real work first: a blank placeholder only when nothing else is near.
          const d =
            Math.hypot(it.x + CW / 2 - W / 2, it.yy + it.h / 2 - H / 2) + (it.p.src || it.p.video ? 0 : CW);
          if (d < bd) {
            bd = d;
            best = it;
          }
        }),
      );
      return best as Item | null;
    };
    // After a keyboard pan, say which post is in the middle now.
    let said = 0;
    const sayMiddle = () => {
      clearTimeout(said);
      said = window.setTimeout(() => {
        const it = middle();
        if (it && !opened) announce(`${it.p.title}. Enter opens it.`);
      }, 500);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && opened) return closePost();
      if (opened || e.target !== cv) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const it = middle();
        if (it) openPost(it.el);
        return;
      }
      const d = ({ ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] } as Record<string, number[]>)[e.key];
      if (!d) return;
      e.preventDefault();
      sayMiddle();
      tx = px;
      ty = py;
      if (calm()) {
        px = tx += d[0] * 120;
        py = ty += d[1] * 120;
      } else {
        vx = d[0] * 14;
        vy = d[1] * 14;
      }
      poke();
    };
    const hover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = cv.getBoundingClientRect();
      mptr = [e.clientX - r.left, e.clientY - r.top];
    };
    const leave = () => (mptr = null);
    let rz = 0;
    // Only a new width rebuilds the board (a phone's address bar changes
    // only the height).
    let rw = cv.clientWidth;
    const resize = () => {
      clearTimeout(rz);
      rz = window.setTimeout(() => {
        if (cv.clientWidth === rw) return;
        rw = cv.clientWidth;
        if (opened) {
          opened.it.pi.style.visibility = "";
          opened.lb.remove();
          opened = null;
        }
        S.s = "rest";
        S.it = null;
        build();
        px = tx = OX;
        py = ty = GY;
      }, 200);
    };

    build();
    px = tx = OX;
    py = ty = GY;
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("wheel", wheel, { passive: false });
    addEventListener("keydown", key);
    cv.addEventListener("pointermove", hover);
    cv.addEventListener("pointerleave", leave);
    addEventListener("resize", resize);
    // Pause or reduced motion stops the loops (and lets them play again after).
    const offMotion = subscribeMotion(() => {
      const q = calm();
      cols.forEach((c) =>
        c.items.forEach((it) => {
          if (!it.v) return;
          if (it.vis && !q) it.v.play().catch(() => {});
          else it.v.pause();
        }),
      );
      const lv = opened?.m.querySelector("video");
      if (lv) {
        if (q) lv.pause();
        else lv.play().catch(() => {});
      }
    });
    raf = requestAnimationFrame((t) => {
      last = t;
      // The first screen holds still a while longer before it drifts, so
      // you see the board whole (top row and its first posts) on arrival.
      idle = t + 3400;
      frame(t);
    });
    return () => {
      offMotion();
      clearTimeout(said);
      cancelAnimationFrame(raf);
      clearTimeout(rz);
      timers.forEach(clearTimeout);
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("wheel", wheel);
      removeEventListener("keydown", key);
      cv.removeEventListener("pointermove", hover);
      cv.removeEventListener("pointerleave", leave);
      removeEventListener("resize", resize);
      if (driving) wessel.free();
      hi.current = null;
      world.textContent = "";
      cv.querySelector(".lb")?.remove();
    };
  }, [posts, cvRef]);

  return (
    <div
      ref={cvRef}
      className="pgcv"
      data-lenis-prevent
      tabIndex={0}
      role="region"
      aria-roledescription="board"
      aria-label="Playground board. Drag, scroll or use the arrow keys to move around; it loops back to the start. Enter opens the post in the middle."
      onFocus={() => announce("")}
    >
      <div ref={worldRef} className="world" aria-hidden="true" />
      <span ref={selRef} className="sel pgsel" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <span className="szp text-micro" />
      </span>
    </div>
  );
}
