"use client";

import { useEffect, useRef } from "react";
import { useBeat } from "@/components/canvas/useBeat";
import { useMotion } from "@/components/useMotion";
import type { Post } from "@/content/playground";
import { announce, isCalm, subscribeMotion } from "@/lib/motion";
import { live, wait, wessel, type XY } from "@/lib/wessel";
import { clamp, easeInOutCubic } from "@/lib/math";
import { narrow, pickVideo } from "@/lib/media";
import { SIZES, srcSet } from "@/lib/image";
import { openViewer, type ViewerItem } from "@/lib/viewer";

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
  /** The last written spot, so a still tile isn't written again. */
  wx: number;
  wy: number;
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
const calm = isCalm;

function postEl(post: Post) {
  const f = document.createElement("figure");
  f.className = "post";
  // Your tag says what a click does (CursorLayer reads [data-you]); a prompt card doesn't open.
  if (!post.mock) f.dataset.you = "Open";
  f.setAttribute("aria-label", post.title);
  const tile = document.createElement("div");
  tile.className = "pi";
  if (post.tint) tile.dataset.tint = post.tint;
  if (post.video) {
    const video = document.createElement("video");
    Object.assign(video, { muted: true, loop: true, playsInline: true, preload: "none" });
    // Fetched the first time the tile comes on screen (the board repeats
    // tiles, so loading them all up front pulled the same files many times).
    video.dataset.src = post.tile ? pickVideo(post.tile, post.tileAv1) : pickVideo(post.video, post.videoAv1);
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
  // out, and names the open post for screen readers.
  f.append(tile);
  return f;
}

/**
 * Playground: one big masonry on a pannable board that loops back to where
 * it started, sideways and down. Drag (with a throw), wheel or trackpad,
 * arrow keys; tap a post (or Enter for the middle one) to lift it open. At
 * rest it settles on whole columns. Wessel drives it, one move per job: he
 * clicks a post that's half out of view (it selects, real size label and
 * all), drags it in, and lets go (the selection goes with it). He never
 * opens one; that's yours. Touch anything and he lets go and waits. Pause:
 * still. Like a Figma canvas, the tile you're over turns grape (yours). His
 * first job is his arrival beat.
 */
type Hello = {
  /** Starts his first job now; resolves once he has let go. */
  run: () => Promise<void>;
  end: () => void;
};

export function Board({ posts }: { posts: Post[] }) {
  const hi = useRef<Hello | null>(null);
  // His arrival beat is his first job: select a post, drag it, let go.
  // Paused or reduced motion: no beat (and no selection).
  const cvRef = useBeat<HTMLDivElement>({
    async day(g) {
      await wait(1000);
      live(g);
      await hi.current?.run();
      live(g);
    },
    still: () => hi.current?.end(),
    reset: () => hi.current?.end(),
  });
  const worldRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<HTMLSpanElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
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
    const zoomBar = zoomRef.current;
    const zoomLabel = zoomBar?.querySelector<HTMLElement>("[data-z='0'] span") ?? null;
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
    // 0 = the loop just woke: its first frame counts as one 60fps frame.
    let last = 0;
    let dragging = false;
    let movingTill = 0;
    let mptr: XY | null = null;
    let first = true;
    let raf = 0;
    // The loop sleeps while nothing moves and while the board is off screen;
    // wake() restarts it (input, Wessel's next job, back in view).
    let inView = true;
    let sleepTimer = 0;
    const wake = () => {
      clearTimeout(sleepTimer);
      if (raf || !inView) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    // A post open in the shared viewer: the board holds still under it.
    let opened = false;
    let hovered: Item | null = null;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    // Zoom: the world scales from its top-left corner and the pan stays in
    // board units, so every measure of the view divides the screen by z.
    const ZMIN = 0.5;
    const ZMAX = 2;
    const STEPS = [0.5, 0.75, 1, 1.5, 2];
    let z = 1;
    let tz = 1;
    let zAt: XY | null = null;
    const vw = () => boardEl.clientWidth / z;
    const vh = () => boardEl.clientHeight / z;
    // At a limit, one more zoom the same way stretches the board a little
    // past it and it springs back, like a rubber band: this is as far as it
    // goes. The stretch is a fraction of the scale, around the pointer.
    const STRETCH = 0.05;
    let bz = 0;
    let bzv = 0;
    let bzPull = 0;
    let bzRaw = 0;
    let bzTill = 0;
    let bzAt: XY | null = null;
    let bOx = 0;
    let bOy = 0;
    // dir: -1 out, 1 in; amt: how far past the limit you tried (log scale),
    // added up while you keep trying, or `set` for a pinch that says it whole.
    const stretch = (dir: number, amt: number, at: XY | null, set = false) => {
      if (calm()) return;
      if (Math.sign(bzPull) !== dir) bzRaw = 0;
      bzRaw = set ? amt : bzRaw + amt;
      bzPull = dir * STRETCH * (1 - Math.exp(-bzRaw / 0.15));
      bzTill = performance.now() + 110;
      bzAt = at;
      wake();
    };
    const paintZoom = () => {
      const s = 1 + bz;
      const [px, py] = bzAt ?? [boardEl.clientWidth / 2, boardEl.clientHeight / 2];
      bOx = bz ? px * (1 - s) : 0;
      bOy = bz ? py * (1 - s) : 0;
      world.style.transform = bz ? `translate(${bOx.toFixed(2)}px,${bOy.toFixed(2)}px) scale(${z * s})` : z === 1 ? "" : `scale(${z})`;
      boardEl.style.setProperty("--z", String(z * s));
    };
    // Keeps the board point under `at` (screen px in the board) in place.
    const zoomTo = (nz: number, at: XY | null) => {
      const [px, py] = at ?? [boardEl.clientWidth / 2, boardEl.clientHeight / 2];
      const k = 1 / nz - 1 / z;
      panX += px * k;
      panY += py * k;
      tx += px * k;
      ty += py * k;
      z = nz;
      paintZoom();
      if (zoomLabel) zoomLabel.textContent = `${Math.round(z * 100)}%`;
    };
    // The first row starts under the title chip, not behind it.
    const TOP = narrow() ? 56 : 64;
    const zoomStep = (d: number) => {
      if (d < 0 ? tz <= ZMIN + 1e-3 : tz >= ZMAX - 1e-3) return stretch(Math.sign(d), 0.3, null);
      tz = d > 0 ? (STEPS.find((s) => s > tz + 0.01) ?? ZMAX) : ([...STEPS].reverse().find((s) => s < tz - 0.01) ?? ZMIN);
      zAt = null;
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
      const viewW = vw();
      const viewH = vh();
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
        col.items.push({ el, tile, post, y, h, video: el.querySelector("video"), x: 0, yy: 0, lx: 0, ly: 0, wx: NaN, wy: NaN, visible: false });
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
    const job = { stage: "rest", t: performance.now() + 900, item: null as Item | null, drop: [0, 0], from: [0, 0], grip: [0, 0], t0: 0, dur: 0 };
    // His arrival beat runs his first job: until then he leaves the board
    // alone (or for a while, if the beat never plays).
    let hello = true;
    later(() => {
      hello = false;
      wake();
    }, 6000);
    // The arrival beat waits on this: it's called once he's back at rest.
    let done: (() => void) | null = null;
    const finish = () => {
      const d = done;
      done = null;
      d?.();
    };
    let pausedTill = 0;
    let target: XY | null = null;
    let driving = false;
    // His target, in board coordinates; the engine springs him there.
    const drive = (): XY | null => {
      if (!target || !wesOn()) return null;
      const r = boardEl.getBoundingClientRect();
      return [r.left + target[0] * z, r.top + target[1] * z];
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
    const sel = (item: Item | null) => {
      if (!item) return wsel.removeAttribute("data-on");
      wsel.style.transform = `translate(${(item.x + item.lx) * z - 4}px,${(item.yy + item.ly) * z - 4}px)`;
      wsel.style.width = `${colW * z + 8}px`;
      wsel.style.height = `${item.h * z + 8}px`;
      szp.textContent = `${colW} × ${item.h}`;
      wsel.dataset.on = "";
    };
    // The post in his hand keeps its size while the rest of the board squashes.
    let held: Item | null = null;
    const hold = (item: Item | null) => {
      held?.el.removeAttribute("data-held");
      item?.el.setAttribute("data-held", "");
      held = item;
    };
    const rest = (t: number) => {
      wessel.press(false);
      hold(null);
      sel(null);
      job.stage = "rest";
      job.item = null;
      job.t = t;
      finish();
    };
    const pause = () => {
      pausedTill = performance.now() + 6000;
      if (job.stage === "drag") {
        tx = panX;
        ty = panY;
      }
      rest(pausedTill);
    };
    hi.current = {
      run: () => {
        hello = false;
        wake();
        if (!wesOn() || opened || dragging || performance.now() < pausedTill) return Promise.resolve();
        finish();
        return new Promise<void>((res) => {
          done = res;
          if (job.stage === "rest") job.t = performance.now();
        });
      },
      end: () => {
        hello = false;
        finish();
        wake();
      },
    };
    // One move per job: reach a post, click it (it selects), drag it in,
    // let go (the selection goes with the release), rest, and again.
    const wTick = (now: number, viewW: number, viewH: number) => {
      if (!wesOn()) {
        if (driving) {
          driving = false;
          target = null;
          wessel.free();
        }
        rest(now + 900);
        return;
      }
      if (now < pausedTill || dragging || opened) {
        sel(null);
        wessel.press(false);
        return;
      }
      if (job.stage === "rest") {
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
          // Nothing to bring in yet: the arrival beat doesn't wait on it.
          finish();
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
      if (!item) return rest(now + 900);
      if (job.stage === "reach") {
        target = [item.x + job.grip[0], item.yy + job.grip[1]];
        if (dist() < 4 || now - job.t0 > 1600) {
          // The click selects it, like in Figma; a beat to read before he drags.
          wessel.press(true);
          hold(item);
          sel(item);
          job.stage = "grab";
          job.t = now + 320;
        }
        return;
      }
      if (job.stage === "grab") {
        target = [item.x + job.grip[0], item.yy + job.grip[1]];
        sel(item);
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
        sel(item);
        if (k >= 1) {
          // He lets go where he dropped it: the selection fades with the
          // release and he parks there until his next job.
          driving = false;
          target = null;
          wessel.free();
          rest(now + 2600);
        }
      }
    };

    // ---------- the board loop ----------
    const frame = (t: number) => {
      // A rAF time can be older than the performance.now() of the wake that
      // asked for it; a dt of zero or less read as "moving fast" and squashed
      // every card for a beat each time the loop woke.
      const dt = last ? clamp(t - last, 1, 48) : 16;
      last = t;
      const ox = panX;
      const oy = panY;
      const quiet = calm();
      if (tz !== z) zoomTo(quiet || Math.abs(tz - z) < 0.002 ? tz : z + (tz - z) * Math.min(1, (0.2 * dt) / 16), zAt);
      if (bz || bzv || bzPull) {
        // Held while you keep pushing, then it springs back with a small overshoot.
        if (t > bzTill) bzPull = bzRaw = 0;
        const s = dt / 1000;
        bzv += (380 * (bzPull - bz) - 20 * bzv) * s;
        bz += bzv * s;
        if (quiet || (!bzPull && Math.abs(bz) < 4e-4 && Math.abs(bzv) < 4e-3)) bz = bzv = bzPull = 0;
        paintZoom();
      }
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
          // Only at 100%: zoomed, the gutters belong to another width.
          const sx = z === 1 ? grid(panX) : panX;
          if (Math.abs(sx - panX) > 0.3) tx = sx;
        }
      }
      // A touch of squash while it moves fast; it springs back as it settles.
      if (dragging || Math.hypot(panX - ox, panY - oy) > (2.5 * dt) / 16) movingTill = t + 140;
      boardEl.toggleAttribute("data-moving", t < movingTill && !quiet);
      const viewW = vw();
      const viewH = vh();
      const lean = mptr && t > movingTill && !opened && !quiet;
      // The board's top on screen: a tile only plays while it's in the window too.
      const boardTop = boardEl.getBoundingClientRect().top;
      let leaning = false;
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
          // Only what moved is written: a still board writes nothing.
          if (x !== item.wx || y !== item.wy) {
            item.wx = x;
            item.wy = y;
            item.el.style.transform = `translate(${x}px,${y}px)`;
            // A column only a few px in reads as a sliver on the frame line.
            item.el.style.visibility = x + colW < 3 || x > viewW - 3 ? "hidden" : "";
          }
          const visible =
            x > -colW && x < viewW && y > -item.h && y < viewH && boardTop + (y + item.h) * z > 0 && boardTop + y * z < innerHeight;
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
            leaning = true;
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
      // The canvas dots move and scale with the board, like Figma's.
      const dots = `${(panX * z * (1 + bz) + bOx).toFixed(1)}px ${(panY * z * (1 + bz) + bOy).toFixed(1)}px`;
      if (dots !== boardEl.style.backgroundPosition) boardEl.style.backgroundPosition = dots;
      wTick(t, viewW, viewH);
      // Asleep once the pan, zoom, lean and squash have settled and Wessel
      // has no job running; if he has one coming, wake for it.
      const settled =
        !dragging && tz === z && !bz && !bzPull && Math.abs(tx - panX) + Math.abs(ty - panY) <= 0.3 && (quiet || Math.abs(vx) + Math.abs(vy) <= 0.02) && t >= movingTill && !leaning;
      const working = wesOn() && !opened && job.stage !== "rest";
      if (!inView || (settled && !working)) {
        raf = 0;
        if (inView && wesOn() && !opened && !hello) sleepTimer = window.setTimeout(wake, Math.max(16, Math.max(job.t, pausedTill) - t));
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    // ---------- open a post in the shared viewer ----------
    // It grows out of its tile; ← → step through every piece once.
    const find = (f: Element) => {
      for (const c of cols) for (const item of c.items) if (item.el === f) return item;
    };
    const pieces = posts.filter((p) => !p.mock && (p.src || p.video));
    const items: ViewerItem[] = pieces.map((p) => ({
      kind: p.video ? "video" : "image",
      src: p.src,
      srcSet: p.src ? srcSet(p.src) : undefined,
      video: p.video ? pickVideo(p.video, p.videoAv1) : undefined,
      alt: p.title,
      width: 1200,
      height: Math.round(1200 / p.ar),
    }));
    // A piece can show more than once: it flies back to the copy nearest the middle.
    const tileOf = (post: Post) => {
      let best: Item | null = null;
      let bd = Infinity;
      for (const c of cols)
        for (const item of c.items) {
          if (item.post !== post || !item.visible) continue;
          const d = Math.hypot(item.x + colW / 2 - vw() / 2, item.yy + item.h / 2 - vh() / 2);
          if (d < bd) {
            bd = d;
            best = item;
          }
        }
      return (best as Item | null)?.tile ?? null;
    };
    const openPost = (f: Element) => {
      const item = find(f);
      const index = item ? pieces.indexOf(item.post) : -1;
      if (!item || opened || index < 0) return;
      opened = openViewer({
        items,
        index,
        from: item.tile,
        tileFor: (i) => tileOf(pieces[i]),
        onClose: () => {
          opened = false;
          wake();
          boardEl.focus({ preventScroll: true });
        },
      });
      if (opened) pause();
    };

    // ---------- input ----------
    const poke = () => {
      pause();
      wake();
    };
    // Two fingers pinch to zoom around their middle.
    const pts = new Map<number, XY>();
    let pinch: { d: number; z: number } | null = null;
    const spread = () => {
      const [a, b] = [...pts.values()];
      return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as XY };
    };
    const down = (e: PointerEvent) => {
      if (opened || e.button > 0) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) {
        pinch = { d: spread().d, z: tz };
        return;
      }
      if (pts.size > 2) return;
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
        if (pts.has(ev.pointerId)) pts.set(ev.pointerId, [ev.clientX, ev.clientY]);
        if (pinch && pts.size === 2) {
          const { d, mid } = spread();
          const r = boardEl.getBoundingClientRect();
          const want = (pinch.z * d) / Math.max(1, pinch.d);
          tz = clamp(want, ZMIN, ZMAX);
          zAt = [mid[0] - r.left, mid[1] - r.top];
          if (want < ZMIN) stretch(-1, Math.log(ZMIN / want), zAt, true);
          else if (want > ZMAX) stretch(1, Math.log(want / ZMAX), zAt, true);
          moved = Infinity;
          return;
        }
        if (ev.pointerId !== e.pointerId) return;
        const now = performance.now();
        const dx = ev.clientX - lx;
        const dy = ev.clientY - ly;
        moved += Math.abs(dx) + Math.abs(dy);
        panX += dx / z;
        panY += dy / z;
        tx = panX;
        ty = panY;
        const k = 16 / Math.max(1, now - lt);
        vx = (dx / z) * k;
        vy = (dy / z) * k;
        lx = ev.clientX;
        ly = ev.clientY;
        lt = now;
      };
      const up = (ev: PointerEvent) => {
        pts.delete(ev.pointerId);
        if (pts.size < 2) pinch = null;
        if (pts.size) {
          // One finger left after a pinch: it carries on panning from here.
          const [p] = [...pts.values()];
          lx = p[0];
          ly = p[1];
          if (ev.pointerId === e.pointerId) e = new PointerEvent("pointerdown", { pointerId: [...pts.keys()][0] });
          return;
        }
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
      if (opened) return;
      if (e.ctrlKey || e.metaKey) {
        // A trackpad pinch (or ⌘/Ctrl + wheel) zooms around the pointer.
        const r = boardEl.getBoundingClientRect();
        const want = tz * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.01));
        zAt = [e.clientX - r.left, e.clientY - r.top];
        if (want < ZMIN && tz <= ZMIN + 1e-3) stretch(-1, Math.log(ZMIN / want), zAt);
        else if (want > ZMAX && tz >= ZMAX - 1e-3) stretch(1, Math.log(want / ZMAX), zAt);
        tz = clamp(want, ZMIN, ZMAX);
        poke();
        return;
      }
      const m = (e.deltaMode === 1 ? 32 : 1) / z;
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
      const viewW = vw();
      const viewH = vh();
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
      if (opened || e.target !== boardEl) return;
      const zk = ({ "+": 1, "=": 1, "-": -1, _: -1 } as Record<string, number>)[e.key];
      if (zk || e.key === "0") {
        e.preventDefault();
        if (zk) zoomStep(zk);
        else [tz, zAt] = [1, null];
        poke();
        return;
      }
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
      mptr = [(e.clientX - r.left) / z, (e.clientY - r.top) / z];
      wake();
    };
    const leave = () => {
      mptr = null;
      wake();
    };
    let rz = 0;
    // Only a new width rebuilds the board (a phone's address bar changes
    // only the height).
    let rw = boardEl.clientWidth;
    const resize = () => {
      clearTimeout(rz);
      rz = window.setTimeout(() => {
        if (boardEl.clientWidth === rw) return;
        rw = boardEl.clientWidth;
        job.stage = "rest";
        job.item = null;
        bz = bzv = bzPull = bzRaw = 0;
        z = tz = 1;
        zoomTo(1, null);
        build();
        panX = tx = offsetX;
        panY = ty = gapY + TOP;
        wake();
      }, 200);
    };

    // The zoom pill: − and + step, the percentage goes back to 100%.
    const zoomClick = (e: MouseEvent) => {
      const b = (e.target as Element).closest<HTMLElement>("[data-z]");
      if (!b || opened) return;
      const d = Number(b.dataset.z);
      if (d) zoomStep(d);
      else [tz, zAt] = [1, null];
      poke();
    };

    build();
    panX = tx = offsetX;
    panY = ty = gapY + TOP;
    zoomBar?.addEventListener("click", zoomClick);
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
          if (item.visible && inView && !q) item.video.play().catch(() => {});
          else item.video.pause();
        }),
      );
      wake();
    });
    // Off screen (scrolled to the footer): every loop pauses and the board
    // loop sleeps. Back in view, the next frame plays what's visible again.
    const seen = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) return wake();
      cols.forEach((c) =>
        c.items.forEach((item) => {
          item.video?.pause();
          item.visible = false;
        }),
      );
    });
    seen.observe(boardEl);
    // Scrolling the page moves the board in and out of Wessel's reach.
    addEventListener("scroll", wake, { passive: true });
    wake();
    return () => {
      offMotion();
      seen.disconnect();
      removeEventListener("scroll", wake);
      clearTimeout(sleepTimer);
      clearTimeout(said);
      cancelAnimationFrame(raf);
      clearTimeout(rz);
      timers.forEach(clearTimeout);
      zoomBar?.removeEventListener("click", zoomClick);
      boardEl.removeEventListener("pointerdown", down);
      boardEl.removeEventListener("wheel", wheel);
      removeEventListener("keydown", key);
      boardEl.removeEventListener("pointermove", hover);
      boardEl.removeEventListener("pointerleave", leave);
      removeEventListener("resize", resize);
      if (driving) wessel.free();
      finish();
      hi.current = null;
      world.textContent = "";
      // Leaving the page keeps this DOM alive but hidden, and coming back
      // runs the effect again from 100%: a zoom left on the nodes would scale
      // a board laid out for 100%, so only part of the view gets tiles.
      world.style.transform = "";
      boardEl.style.removeProperty("--z");
      if (zoomLabel) zoomLabel.textContent = "100%";
    };
  }, [posts, cvRef]);

  return (
    <>
      <div
        ref={cvRef}
        className="pgcv"
        data-lenis-prevent
        tabIndex={0}
        role="region"
        aria-roledescription="board"
        aria-label="Playground board. Drag, scroll or use the arrow keys to move around; it loops back to the start. Plus and minus zoom, 0 goes back to 100%. Enter opens the post in the middle."
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
      <div ref={zoomRef} className="pgzoom" role="toolbar" aria-label="Zoom">
        <button type="button" className="pbtn ghost" data-z="-1" aria-label="Zoom out">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 8h9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" className="pgzl text-micro" data-z="0" aria-label="Zoom to 100%">
          <span>100%</span>
        </button>
        <button type="button" className="pbtn ghost" data-z="1" aria-label="Zoom in">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 8h9M8 3.5v9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </>
  );
}
