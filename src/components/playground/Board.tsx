"use client";

import { useEffect, useRef } from "react";
import { useBeat } from "@/components/canvas/useBeat";
import { useMotion } from "@/components/useMotion";
import type { Post } from "@/content/playground";
import { announce, getMotion, subscribeMotion } from "@/lib/motion";
import { live, wait, wessel, type XY } from "@/lib/wessel";
import { clamp, easeInOutCubic } from "@/lib/math";
import { narrow, pickVideo } from "@/lib/media";
import { SIZES, srcSet } from "@/lib/image";

type Item = {
  el: HTMLElement;
  tile: HTMLElement;
  post: Post;
  y: number;
  h: number;
  video: HTMLVideoElement | null;
  x: number;
  yy: number;
  lx: number;
  ly: number;
  visible: boolean;
};
type Col = { x: number; items: Item[]; height: number };

const mod = (a: number, n: number) => ((a % n) + n) % n;
// A seeded random (mulberry32): the same posts lay out the same board on
// every visit, so the spacing below is a promise, not luck.
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const calm = () => getMotion().calm;

function postEl(post: Post) {
  const f = document.createElement("figure");
  f.className = "post";
  // Your tag says what a click does (CursorLayer reads [data-you]).
  f.dataset.you = "Open";
  f.setAttribute("aria-label", post.title);
  const tile = document.createElement("div");
  tile.className = "pi";
  if (post.tint) tile.dataset.tint = post.tint;
  if (post.video) {
    const video = document.createElement("video");
    Object.assign(video, { muted: true, loop: true, playsInline: true, preload: "none" });
    // Fetched the first time the tile comes on screen (the board repeats
    // tiles, so loading them all up front pulled the same files many times).
    video.dataset.src = pickVideo(post.video, post.videoAv1);
    if (post.src) video.poster = post.src;
    video.setAttribute("aria-hidden", "true");
    video.addEventListener("loadeddata", () => video.classList.add("ok"));
    tile.appendChild(video);
  } else if (post.src) {
    const i = document.createElement("img");
    i.src = post.src;
    const set = srcSet(post.src);
    if (set) {
      i.srcset = set;
      i.sizes = SIZES.post;
    }
    i.alt = "";
    i.draggable = false;
    i.loading = "lazy";
    const ok = () => i.classList.add("ok");
    if (i.complete && i.naturalWidth) ok();
    else i.addEventListener("load", ok);
    tile.appendChild(i);
  }
  if (post.mock) {
    const m = document.createElement("span");
    m.className = "mock text-micro-caps";
    m.dataset.mock = "";
    m.textContent = "mock";
    tile.appendChild(m);
    // The prompt itself, so the empty card says what belongs there.
    const idea = document.createElement("span");
    idea.className = "idea text-small";
    const text = post.title.replace(/^(Loop|Picture) idea: /, "");
    idea.textContent = text[0].toUpperCase() + text.slice(1);
    idea.dataset.kind = post.title.startsWith("Loop") ? "Loop" : "Picture";
    tile.appendChild(idea);
  }
  // No frame name above it (the board is purely visual); the name is read
  // out and captions the open post.
  f.append(tile);
  return f;
}

/**
 * Playground: one big masonry on a pannable board that loops back to where
 * it started, sideways and down. Drag (with a throw), wheel or trackpad,
 * arrow keys; tap a post (or Enter for the middle one) to lift it open. At
 * rest it settles on whole columns. Wessel drives it: he grabs a post that's
 * half out of view, drags it in, and selects it. He never opens one; that's
 * yours. Touch anything and he lets go and waits. Pause: still. Like a Figma
 * canvas, the tile you're over turns grape (yours). On arrival Wessel says
 * hello by selecting one tile in view, real size label and all.
 */
type Hello = {
  pick: () => Item | null;
  ok: (item: Item) => boolean;
  at: (item: Item) => XY | null;
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
      const item = b?.pick();
      if (!b || !item) return b?.end();
      try {
        await wessel.go(() => b.at(item), { k: 220, timeout: 1400 });
        live(g);
        if (!b.ok(item)) return;
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
    const boardEl = cvRef.current!;
    const world = worldRef.current!;
    const wsel = selRef.current!;
    const szp = wsel.querySelector<HTMLElement>(".szp")!;
    let colW = 300;
    let gap = 24;
    let worldW = 0;
    let cols: Col[] = [];
    let panX = 0;
    let panY = 0;
    let tx = 0;
    let ty = 0;
    let vx = 0;
    let vy = 0;
    let last = performance.now();
    let dragging = false;
    let movingTill = 0;
    let mptr: XY | null = null;
    let first = true;
    let raf = 0;
    type Open = { item: Item; lightbox: HTMLElement; media: HTMLElement; scale: number; radius: number; closeButton: HTMLButtonElement; closing?: boolean };
    let opened: Open | null = null;
    let hovered: Item | null = null;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    // The row gap (same as the column gap: no frame names) and the left inset
    // that centres the columns that fit: at rest the gutters left and right
    // match, and no tile is cut at the sides.
    let gapY = 24;
    let offsetX = 24;
    // The nearest pan where the columns sit on that gutter grid.
    const grid = (x: number) => offsetX + Math.round((x - offsetX) / (colW + gap)) * (colW + gap);
    const build = () => {
      world.textContent = "";
      cols = [];
      hovered = null;
      const isPhone = !!narrow();
      const viewW = boardEl.clientWidth;
      const viewH = boardEl.clientHeight;
      gap = isPhone ? 12 : 24;
      gapY = gap;
      const fit = Math.max(2, Math.round((viewW - gap) / ((isPhone ? 170 : 300) + gap)));
      colW = Math.floor((viewW - gap * (fit + 1)) / fit);
      offsetX = Math.round((viewW - fit * colW - (fit - 1) * gap) / 2);
      // Twice the screen each way, so a post can repeat a screen away.
      const n = Math.max(8, fit * 2 + 2);
      worldW = n * (colW + gap);
      const minH = Math.max(1800, viewH * 2 + 400);
      const lift = Math.round(colW * 0.35);
      const tops = Array.from({ length: n }, (_, c) => (c % 2 ? lift : 0));
      for (let c = 0; c < n; c++) cols.push({ x: c * (colW + gap), items: [], height: 0 });
      // Deterministic placement. The shortest column fills next (the board
      // grows like one sheet), with the post whose nearest twin is furthest
      // away, counted in screens and across the wrap. A twin a whole screen
      // away or more is far enough; among those the least used post goes, so
      // the mix stays even. The first row keeps the Studio's order, so the
      // post put first opens the board, whole, top left.
      const rng = seeded(posts.length * 7919 + 17);
      const used = new Map<Post, number>();
      const twins = new Map<Post, XY[]>();
      const apart = (post: Post, cx: number, cy: number) => {
        let d = Infinity;
        for (const [x, y] of twins.get(post) ?? []) {
          const dx = Math.abs(cx - x);
          const dy = Math.abs(cy - y);
          d = Math.min(d, Math.max(Math.min(dx, worldW - dx) / viewW, Math.min(dy, minH - dy) / viewH));
        }
        return d;
      };
      while (true) {
        let c = -1;
        for (let i = 0; i < n; i++) if (tops[i] < minH && (c < 0 || tops[i] < tops[c])) c = i;
        if (c < 0) break;
        const col = cols[c];
        const y = tops[c];
        let post = posts[c];
        if (col.items.length || c >= Math.min(fit, posts.length)) {
          let best: Post[] = [];
          let top = -Infinity;
          for (const q of posts) {
            const score = Math.min(1, apart(q, col.x + colW / 2, y + colW / q.ar / 2)) * 1000 - (used.get(q) ?? 0);
            if (score > top + 1e-6) {
              top = score;
              best = [q];
            } else if (score > top - 1e-6) best.push(q);
          }
          post = best[Math.floor(rng() * best.length)];
        }
        const h = Math.round(colW / post.ar);
        used.set(post, (used.get(post) ?? 0) + 1);
        twins.set(post, [...(twins.get(post) ?? []), [col.x + colW / 2, y + h / 2]]);
        const el = postEl(post);
        el.style.width = `${colW}px`;
        el.style.height = `${h}px`;
        world.appendChild(el);
        // Load-in: a wave from the top-left corner, on first paint only.
        el.style.setProperty("--d", first && !calm() ? `${Math.min(900, Math.hypot(col.x, y) * 0.45)}ms` : "0ms");
        const tile = el.querySelector<HTMLElement>(".pi")!;
        col.items.push({ el, tile, post, y, h, video: el.querySelector("video"), x: 0, yy: 0, lx: 0, ly: 0, visible: false });
        tops[c] = y + h + gapY;
      }
      cols.forEach((col, c) => (col.height = tops[c]));
      first = false;
      requestAnimationFrame(() => requestAnimationFrame(() => cols.forEach((c) => c.items.forEach((item) => item.el.classList.add("in")))));
      later(() => cols.forEach((c) => c.items.forEach((item) => item.el.style.removeProperty("--d"))), 1700);
    };

    // ---------- Wessel drives the board (desktop, not paused) ----------
    // Only while the board is mostly on screen: scrolled away to the footer,
    // he lets go instead of hanging on at the edge.
    const onScreen = () => {
      const r = boardEl.getBoundingClientRect();
      return r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.6;
    };
    const wesOn = () => !mode.current.still && !narrow() && onScreen();
    const job = { stage: "rest", t: performance.now() + 900, item: null as Item | null, drop: [0, 0], from: [0, 0], grip: [0, 0], t0: 0, dur: 0, shown: false };
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
      const r = boardEl.getBoundingClientRect();
      return [r.left + target[0], r.top + target[1]];
    };
    const steer = (x: number, y: number, k = 180) => {
      target = [x, y];
      if (!driving || k !== job.t0) {
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
      if (job.stage === "drag") {
        tx = panX;
        ty = panY;
      }
      wessel.press(false);
      job.stage = "rest";
      job.t = pausedTill;
      job.item = null;
    };
    const sel = (item: Item | null) => {
      if (!item) return wsel.removeAttribute("data-on");
      wsel.style.transform = `translate(${item.x + item.lx - 4}px,${item.yy + item.ly - 4}px)`;
      wsel.style.width = `${colW + 8}px`;
      wsel.style.height = `${item.h + 8}px`;
      szp.textContent = `${colW} × ${item.h}`;
      wsel.dataset.on = "";
    };
    // The hello beat's handles: a tile to pick, where to point, show, done.
    hi.current = {
      pick: () => {
        if (!wesOn() || opened || dragging) return null;
        const viewW = boardEl.clientWidth;
        const viewH = boardEl.clientHeight;
        let best: Item | null = null;
        let bd = Infinity;
        // A real piece, whole on screen, near the middle; not the one you're on.
        for (const col of cols)
          for (const item of col.items) {
            if (item === hovered || !(item.post.src || item.post.video) || item.post.mock) continue;
            if (item.x < 24 || item.x + colW > viewW - 24 || item.yy < 24 || item.yy + item.h > viewH - 48) continue;
            const d = Math.hypot(item.x + colW / 2 - viewW * 0.55, item.yy + item.h / 2 - viewH * 0.45);
            if (d < bd) {
              bd = d;
              best = item;
            }
          }
        if (best) Object.assign(job, { stage: "hello", item: best, shown: false });
        return best;
      },
      ok: (item) => job.stage === "hello" && job.item === item && wesOn(),
      at: (item) => {
        if (job.stage !== "hello" || job.item !== item || !wesOn()) return null;
        const r = boardEl.getBoundingClientRect();
        return [r.left + item.x + item.lx + colW * 0.72, r.top + item.yy + item.ly + item.h * 0.8];
      },
      show: () => (job.shown = job.stage === "hello"),
      end: () => {
        hello = false;
        if (job.stage !== "hello") return;
        Object.assign(job, { stage: "rest", item: null, shown: false, t: performance.now() + 900 });
      },
    };
    const wTick = (now: number, viewW: number, viewH: number) => {
      if (!wesOn()) {
        sel(null);
        if (driving) {
          driving = false;
          target = null;
          wessel.free();
        }
        job.stage = "rest";
        job.t = now + 900;
        return;
      }
      if (now < pausedTill || dragging || opened) {
        sel(null);
        wessel.press(false);
        return;
      }
      if (job.stage === "hello") {
        sel(job.shown ? job.item : null);
        return;
      }
      if (job.stage === "rest") {
        sel(null);
        if (now < job.t || hello) return;
        // A post that's half out of view, and a calm spot to bring it to.
        const c: Item[] = [];
        cols.forEach((col) =>
          col.items.forEach((item) => {
            const ow = Math.max(0, Math.min(viewW, item.x + colW) - Math.max(0, item.x));
            const oh = Math.max(0, Math.min(viewH, item.yy + item.h) - Math.max(0, item.yy));
            const f = (ow * oh) / (colW * item.h);
            if (item.h < viewH * 0.62 && f > 0.2 && f < 0.8) c.push(item);
          }),
        );
        if (!c.length) {
          job.t = now + 700;
          return;
        }
        const item = c[Math.floor(Math.random() * c.length)];
        const dx = clamp(viewW * (0.25 + Math.random() * 0.4) - colW / 2, 80, viewW - colW - 80);
        const dy = clamp(viewH * (0.3 + Math.random() * 0.3) - item.h / 2, 80, viewH - item.h - 80);
        // He drops it in a whole column, so the board still rests on the grid.
        Object.assign(job, { item, drop: [grid(panX + dx - item.x) - panX, dy - item.yy], grip: [colW * (0.35 + Math.random() * 0.3), item.h * (0.35 + Math.random() * 0.3)], stage: "reach", t0: now });
        steer(item.x + job.grip[0], item.yy + job.grip[1], 160);
        return;
      }
      const item = job.item;
      if (!item) {
        job.stage = "rest";
        return;
      }
      if (job.stage === "reach") {
        target = [item.x + job.grip[0], item.yy + job.grip[1]];
        if (dist() < 4 || now - job.t0 > 1600) {
          wessel.press(true);
          job.stage = "grab";
          job.t = now + 180;
        }
        return;
      }
      if (job.stage === "grab") {
        target = [item.x + job.grip[0], item.yy + job.grip[1]];
        if (now > job.t) {
          job.stage = "drag";
          job.t0 = now;
          job.from = [panX, panY];
          job.dur = 700 + Math.hypot(job.drop[0], job.drop[1]) * 0.9;
          // Glued to the post while he drags it.
          void wessel.go(drive, { k: 2400 });
        }
        return;
      }
      if (job.stage === "drag") {
        const k = easeInOutCubic(Math.min(1, (now - job.t0) / job.dur));
        panX = tx = job.from[0] + job.drop[0] * k;
        panY = ty = job.from[1] + job.drop[1] * k;
        target = [item.x + job.grip[0], item.yy + job.grip[1]];
        if (k >= 1) {
          wessel.press(false);
          job.stage = "select";
          job.t = now + 2000;
          void wessel.go(drive, { k: 180 });
        }
        return;
      }
      if (job.stage === "select") {
        if (now < movingTill) return;
        sel(item);
        target = [item.x + item.lx + colW - 14, item.yy + item.ly + item.h - 10];
        if (now > job.t) {
          sel(null);
          job.stage = "rest";
          job.t = now + 900;
        }
      }
    };

    // ---------- the board loop ----------
    const frame = (t: number) => {
      const dt = Math.min(48, t - last);
      last = t;
      const ox = panX;
      const oy = panY;
      const quiet = calm();
      if (!dragging && !opened) {
        if (Math.abs(tx - panX) + Math.abs(ty - panY) > 0.3) {
          // Smooth wheel.
          const f = quiet ? 1 : Math.min(1, (0.18 * dt) / 16);
          panX += (tx - panX) * f;
          panY += (ty - panY) * f;
        } else if (Math.abs(vx) + Math.abs(vy) > 0.02 && !quiet) {
          panX += (vx * dt) / 16;
          panY += (vy * dt) / 16;
          vx *= Math.pow(0.92, dt / 16);
          vy *= Math.pow(0.92, dt / 16);
          tx = panX;
          ty = panY;
        } else {
          // At rest the columns settle back on the gutter grid, so no tile is
          // cut at the sides. No idle drift: the board holds its composition.
          const sx = grid(panX);
          if (Math.abs(sx - panX) > 0.3) tx = sx;
        }
      }
      // A touch of squash while it moves fast; it springs back as it settles.
      if (dragging || Math.hypot(panX - ox, panY - oy) > (2.5 * dt) / 16) movingTill = t + 140;
      boardEl.toggleAttribute("data-moving", t < movingTill && !quiet);
      const viewW = boardEl.clientWidth;
      const viewH = boardEl.clientHeight;
      const lean = mptr && t > movingTill && !opened && !quiet;
      // The tile under your pointer, worked out here: the board moves under a
      // still mouse too (wheel, drift), and CSS :hover only catches up on the
      // next mouse move.
      let over: Item | null = null;
      for (const col of cols) {
        const x = mod(col.x + panX + colW, worldW) - colW;
        for (const item of col.items) {
          const y = mod(item.y + panY + item.h, col.height) - item.h;
          item.x = x;
          item.yy = y;
          item.el.style.transform = `translate(${x}px,${y}px)`;
          // A column only a few px in reads as a sliver on the frame line.
          item.el.style.visibility = x + colW < 3 || x > viewW - 3 ? "hidden" : "";
          const visible = x > -colW && x < viewW && y > -item.h && y < viewH;
          if (item.video && visible !== item.visible) {
            if (visible && !quiet) {
              if (!item.video.src && item.video.dataset.src) item.video.src = item.video.dataset.src;
              item.video.play().catch(() => {});
            }
            else item.video.pause();
          }
          item.visible = visible;
          if (visible && mptr && !dragging && !opened && mptr[0] >= x && mptr[0] < x + colW && mptr[1] >= y && mptr[1] < y + item.h)
            over = item;
          // Lean: posts near your pointer drift a few px toward it.
          let lx = 0;
          let ly = 0;
          if (lean && visible && mptr) {
            const dx = mptr[0] - (x + colW / 2);
            const dy = mptr[1] - (y + item.h / 2);
            const d = Math.hypot(dx, dy);
            const R = Math.max(colW, item.h) * 0.75;
            if (d < R && d > 0) {
              const k = 1 - d / R;
              lx = (dx / d) * k * 8;
              ly = (dy / d) * k * 8;
            }
          }
          if (Math.abs(lx - item.lx) + Math.abs(ly - item.ly) > 0.3) {
            item.lx = lx;
            item.ly = ly;
            item.tile.style.translate = `${lx.toFixed(1)}px ${ly.toFixed(1)}px`;
          }
        }
      }
      if (over !== hovered) {
        hovered?.el.removeAttribute("data-hover");
        over?.el.setAttribute("data-hover", "");
        hovered = over;
        // Your cursor's tag reads the title (or "You" again).
        dispatchEvent(new Event("wsl:look"));
      }
      wTick(t, viewW, viewH);
      raf = requestAnimationFrame(frame);
    };

    // ---------- open a post: it lifts out and springs to the middle ----------
    const find = (f: Element) => {
      for (const c of cols) for (const item of c.items) if (item.el === f) return item;
    };
    const openPost = (f: Element) => {
      const item = find(f);
      if (!item || opened) return;
      const viewW = boardEl.clientWidth;
      const viewH = boardEl.clientHeight;
      const isPhone = !!narrow();
      // Room under the media for its caption, so the pair sits centred.
      const CAP = 40;
      const scale = Math.min((viewW * (isPhone ? 0.9 : 0.8)) / colW, (viewH * (isPhone ? 0.7 : 0.8) - CAP) / item.h);
      const w = colW * scale;
      const h = item.h * scale;
      const top = (viewH - h - CAP) / 2;
      const lightbox = document.createElement("div");
      lightbox.className = "lb";
      lightbox.setAttribute("role", "dialog");
      lightbox.setAttribute("aria-modal", "true");
      lightbox.setAttribute("aria-label", item.post.title);
      const media = document.createElement("div");
      media.className = "lbm";
      if (item.post.tint) media.dataset.tint = item.post.tint;
      media.style.width = `${w}px`;
      media.style.height = `${h}px`;
      if (item.post.video) {
        const video = document.createElement("video");
        Object.assign(video, { muted: true, loop: true, playsInline: true });
        video.src = pickVideo(item.post.video, item.post.videoAv1)!;
        video.currentTime = item.video?.currentTime ?? 0;
        if (!calm()) video.play().catch(() => {});
        media.appendChild(video);
      } else if (item.post.src) {
        const i = document.createElement("img");
        i.src = item.post.src;
        i.alt = "";
        i.draggable = false;
        media.appendChild(i);
      }
      if (item.post.mock) {
        const t = document.createElement("span");
        t.className = "mock text-micro-caps";
        t.dataset.mock = "";
        t.textContent = "mock";
        media.appendChild(t);
      }
      const cap = document.createElement("p");
      cap.className = "lbc text-label";
      cap.textContent = item.post.title;
      // Directly under the opened media, on its left edge.
      Object.assign(cap.style, { left: `${(viewW - w) / 2}px`, top: `${top + h + 12}px`, width: `${w}px` });
      if (item.post.mock) cap.dataset.mock = "";
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "lbx gpill text-micro-caps";
      closeButton.dataset.size = "tap";
      closeButton.textContent = "Close";
      lightbox.append(media, cap, closeButton);
      boardEl.appendChild(lightbox);
      const radius = isPhone ? 16 : 24;
      media.style.borderRadius = `${radius / scale}px`;
      media.style.transform = `translate(${item.x + item.lx}px,${item.yy + item.ly}px) scale(${1 / scale})`;
      item.tile.style.visibility = "hidden";
      opened = { item, lightbox, media, scale, radius, closeButton };
      pause();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          lightbox.dataset.on = "";
          media.style.transform = `translate(${(viewW - w) / 2}px,${top}px) scale(1)`;
          media.style.borderRadius = `${radius}px`;
          closeButton.focus({ preventScroll: true });
        }),
      );
      lightbox.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        if (e.target === lightbox || e.target === closeButton) closePost();
      });
      closeButton.addEventListener("keydown", (e) => {
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
      delete o.lightbox.dataset.on;
      o.media.style.transform = `translate(${o.item.x + o.item.lx}px,${o.item.yy + o.item.ly}px) scale(${1 / o.scale})`;
      o.media.style.borderRadius = `${o.radius / o.scale}px`;
      later(
        () => {
          o.item.tile.style.visibility = "";
          o.lightbox.remove();
          opened = null;
          boardEl.focus({ preventScroll: true });
        },
        calm() ? 0 : 560,
      );
    };

    // ---------- input ----------
    const poke = () => {
      pause();
    };
    const down = (e: PointerEvent) => {
      if (opened || e.button > 0) return;
      boardEl.setPointerCapture(e.pointerId);
      dragging = true;
      boardEl.dataset.drag = "";
      poke();
      vx = vy = 0;
      tx = panX;
      ty = panY;
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
        panX += dx;
        panY += dy;
        tx = panX;
        ty = panY;
        const k = 16 / Math.max(1, now - lt);
        vx = dx * k;
        vy = dy * k;
        lx = ev.clientX;
        ly = ev.clientY;
        lt = now;
      };
      const up = (ev: PointerEvent) => {
        dragging = false;
        delete boardEl.dataset.drag;
        if (performance.now() - lt > 80) vx = vy = 0;
        boardEl.removeEventListener("pointermove", mv);
        boardEl.removeEventListener("pointerup", up);
        boardEl.removeEventListener("pointercancel", up);
        // A tap without moving opens the post under it.
        if (ev.type === "pointerup" && moved < 6 && performance.now() - t0 < 500) {
          const f = document.elementsFromPoint(ev.clientX, ev.clientY).find((n) => n.classList.contains("post"));
          if (f) openPost(f);
        }
      };
      boardEl.addEventListener("pointermove", mv);
      boardEl.addEventListener("pointerup", up);
      boardEl.addEventListener("pointercancel", up);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (opened) {
        if (Math.abs(e.deltaY) + Math.abs(e.deltaX) > 4) closePost();
        return;
      }
      const m = e.deltaMode === 1 ? 32 : 1;
      if (Math.abs(tx - panX) + Math.abs(ty - panY) < 0.3) {
        tx = panX;
        ty = panY;
      }
      tx -= e.deltaX * m;
      ty -= e.deltaY * m;
      vx = vy = 0;
      poke();
    };
    // The post nearest the middle: the one Enter opens.
    const middle = () => {
      const viewW = boardEl.clientWidth;
      const viewH = boardEl.clientHeight;
      let best: Item | null = null;
      let bd = Infinity;
      cols.forEach((c) =>
        c.items.forEach((item) => {
          // Real work first: a blank placeholder only when nothing else is near.
          const d =
            Math.hypot(item.x + colW / 2 - viewW / 2, item.yy + item.h / 2 - viewH / 2) + (item.post.src || item.post.video ? 0 : colW);
          if (d < bd) {
            bd = d;
            best = item;
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
        const item = middle();
        if (item && !opened) announce(`${item.post.title}. Enter opens it.`);
      }, 500);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && opened) return closePost();
      if (opened || e.target !== boardEl) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const item = middle();
        if (item) openPost(item.el);
        return;
      }
      const d = ({ ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] } as Record<string, number[]>)[e.key];
      if (!d) return;
      e.preventDefault();
      sayMiddle();
      tx = panX;
      ty = panY;
      if (calm()) {
        panX = tx += d[0] * 120;
        panY = ty += d[1] * 120;
      } else {
        vx = d[0] * 14;
        vy = d[1] * 14;
      }
      poke();
    };
    const hover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = boardEl.getBoundingClientRect();
      mptr = [e.clientX - r.left, e.clientY - r.top];
    };
    const leave = () => (mptr = null);
    let rz = 0;
    // Only a new width rebuilds the board (a phone's address bar changes
    // only the height).
    let rw = boardEl.clientWidth;
    const resize = () => {
      clearTimeout(rz);
      rz = window.setTimeout(() => {
        if (boardEl.clientWidth === rw) return;
        rw = boardEl.clientWidth;
        if (opened) {
          opened.item.tile.style.visibility = "";
          opened.lightbox.remove();
          opened = null;
        }
        job.stage = "rest";
        job.item = null;
        build();
        panX = tx = offsetX;
        panY = ty = gapY;
      }, 200);
    };

    build();
    panX = tx = offsetX;
    panY = ty = gapY;
    boardEl.addEventListener("pointerdown", down);
    boardEl.addEventListener("wheel", wheel, { passive: false });
    addEventListener("keydown", key);
    boardEl.addEventListener("pointermove", hover);
    boardEl.addEventListener("pointerleave", leave);
    addEventListener("resize", resize);
    // Pause or reduced motion stops the loops (and lets them play again after).
    const offMotion = subscribeMotion(() => {
      const q = calm();
      cols.forEach((c) =>
        c.items.forEach((item) => {
          if (!item.video) return;
          if (item.visible && !q) item.video.play().catch(() => {});
          else item.video.pause();
        }),
      );
      const lv = opened?.media.querySelector("video");
      if (lv) {
        if (q) lv.pause();
        else lv.play().catch(() => {});
      }
    });
    raf = requestAnimationFrame((t) => {
      last = t;
      frame(t);
    });
    return () => {
      offMotion();
      clearTimeout(said);
      cancelAnimationFrame(raf);
      clearTimeout(rz);
      timers.forEach(clearTimeout);
      boardEl.removeEventListener("pointerdown", down);
      boardEl.removeEventListener("wheel", wheel);
      removeEventListener("keydown", key);
      boardEl.removeEventListener("pointermove", hover);
      boardEl.removeEventListener("pointerleave", leave);
      removeEventListener("resize", resize);
      if (driving) wessel.free();
      hi.current = null;
      world.textContent = "";
      boardEl.querySelector(".lb")?.remove();
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
