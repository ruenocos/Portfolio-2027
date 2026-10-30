// The Focus dioramas (DESIGN.md §6): one tiny isometric scene per track on
// a dotted Figma-frame plate. Neutral blocks in the --d-* figure colours,
// and the tangerine smiley token as the thing that matters. Hover (or tap)
// and each scene does its job:
//   ux      a browser window lifts apart into its layers; a click presses its button
//   motion  the smiley rides a pen-tool bezier; the pointer scrubs it
//   ai      one smiley duplicates into a neat set of nine (also the D key)
// Not React: each scene redraws its SVG from a few springs, only while on
// screen and only while something is moving. Calm shows end states.

import { isCalm } from "@/lib/motion";
import { FEATURES } from "@/lib/smiley";
import { easeInOutCubic } from "@/lib/math";

export type DioKind = "ux" | "motion" | "ai";

type Pt = [number, number];
const calm = isCalm;

function spring(k = 320, z = 0.38) {
  return {
    v: 0,
    vel: 0,
    to: 0,
    step(dt: number) {
      if (calm()) {
        this.v = this.to;
        this.vel = 0;
        return;
      }
      this.vel += (-k * (this.v - this.to) - 2 * z * Math.sqrt(k) * this.vel) * dt;
      this.v += this.vel * dt;
    },
    busy() {
      return Math.abs(this.vel) > 0.002 || Math.abs(this.v - this.to) > 0.002;
    },
  };
}
type Spring = ReturnType<typeof spring>;

// ---------- isometric drawing ----------
const IC = Math.cos(Math.PI / 6);
const U = 14.5;
const OX = 160;
const OY = 44;
const IP = (x: number, y: number, z: number): Pt => [OX + (x - y) * IC * U, OY + (x + y) * 0.5 * U - z * U];
const pts = (a: Pt[]) => a.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
const TANG = [
  "color-mix(in srgb,var(--tang) 90%,#fff)",
  "color-mix(in srgb,var(--tang) 74%,#000)",
  "color-mix(in srgb,var(--tang) 86%,#000)",
];
const NEU = ["var(--d-t)", "var(--d-l)", "var(--d-r)"];
const edge = (t: string[]) => (t === TANG ? "color-mix(in srgb,var(--tang) 58%,#000)" : "var(--d-s)");

/** Any flat shape pushed up: the sides that face us, then the top. */
function prism(poly: Pt[], z: number, h: number, T = NEU, o = 1) {
  const top = poly.map(([x, y]) => IP(x, y, z + h));
  const bot = poly.map(([x, y]) => IP(x, y, z));
  const n = poly.length;
  const side: { i: number; k: number; t: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const nx = b[1] - a[1];
    const ny = a[0] - b[0];
    if (nx + ny <= 1e-6) continue;
    side.push({ i, k: a[0] + a[1] + b[0] + b[1], t: nx > ny ? 2 : 1 });
  }
  let s = "";
  side
    .sort((p, q) => p.k - q.k)
    .forEach(({ i, t }) => {
      const j = (i + 1) % n;
      s += `<polygon points="${pts([top[i], top[j], bot[j], bot[i]])}" fill="${T[t]}" stroke="${T[t]}" stroke-width=".6"/>`;
    });
  // The outer edge of the side band, so edges read crisp.
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    if (b[1] - a[1] + (a[0] - b[0]) <= 1e-6) continue;
    const p1 = IP(a[0], a[1], z);
    const p2 = IP(b[0], b[1], z);
    d += `M${p1[0].toFixed(1)},${p1[1].toFixed(1)}L${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return `<g opacity="${o}">${s}<polygon points="${pts(top)}" fill="${T[0]}" stroke="${edge(T)}" stroke-width=".8" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${edge(T)}" stroke-width=".8" stroke-linecap="round"/></g>`;
}

function rrect(x: number, y: number, w: number, d: number, r: number, seg = 5): Pt[] {
  const P: Pt[] = [];
  const C: [number, number, number][] = [
    [x + w - r, y + r, -90],
    [x + w - r, y + d - r, 0],
    [x + r, y + d - r, 90],
    [x + r, y + r, 180],
  ];
  C.forEach(([cx, cy, a0]) => {
    for (let k = 0; k <= seg; k++) {
      const a = ((a0 + (k * 90) / seg) * Math.PI) / 180;
      P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  });
  return P;
}
const disc = (cx: number, cy: number, r: number, n = 32): Pt[] =>
  Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
const onTop = (z: number, inner: string) =>
  `<g transform="matrix(${(IC * U).toFixed(3)},${(0.5 * U).toFixed(3)},${(-IC * U).toFixed(3)},${(0.5 * U).toFixed(3)},${OX},${(OY - z * U).toFixed(2)})">${inner}</g>`;

/** The smiley token: a tangerine disc with the face cut into its top. */
const token = (cx: number, cy: number, z: number, r = 0.85, h = 0.42, o = 1) =>
  prism(disc(cx, cy, r), z, h, TANG, o) +
  onTop(
    z + h,
    `<g opacity="${o}" transform="translate(${cx - r * 0.92},${cy - r * 0.92}) scale(${((r * 1.84) / 212).toFixed(4)})"><path d="${FEATURES}" fill="color-mix(in srgb,var(--tang) 55%,#000)"/></g>`,
  );
const ghostDisc = (cx: number, cy: number, z: number, r = 0.85, o = 0.6) =>
  `<polygon points="${pts(disc(cx, cy, r).map(([x, y]) => IP(x, y, z)))}" fill="none" stroke="var(--tang)" stroke-width=".9" stroke-dasharray="2 2.4" opacity="${o}"/>`;
const lineOn = (x1: number, y1: number, x2: number, y2: number, z: number, c = "var(--d-h)", w = 1.4) => {
  const a = IP(x1, y1, z);
  const b = IP(x2, y2, z);
  return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
};

// The plate is a Figma frame: square, dotted like the page grid.
let DOTS = "";
for (let x = 1; x < 10; x++)
  for (let y = 1; y < 10; y++) {
    const [px, py] = IP(x, y, 0.45);
    DOTS += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="1.1" ry=".65" fill="var(--d-s)" opacity=".55"/>`;
  }
const plate = () =>
  prism(
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ],
    0,
    0.45,
  ) + DOTS;

// ---------- the three scenes ----------
type Scene = { springs: Spring[]; on: boolean; t: number; scrub: boolean };

function drawUx({ springs: L }: Scene) {
  let s = plate();
  const z0 = 0.45;
  const zw = z0 + L[0].v * 0.2;
  const zc = zw + 0.2 + L[1].v * 1.3;
  const zb = zw + 0.2 + L[2].v * 2.6;
  const zt = zw + 0.2 + L[3].v * 1.9;
  s += prism(rrect(1, 1.2, 8, 7.6, 0.5), zw, 0.2);
  s += lineOn(1, 2.3, 9, 2.3, zw + 0.2, "var(--d-s)", 1);
  for (const [x, y] of [
    [1.6, 1.75],
    [2.2, 1.75],
    [2.8, 1.75],
  ]) {
    const [px, py] = IP(x, y, zw + 0.2);
    s += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="2" ry="1.15" fill="var(--d-h)"/>`;
  }
  s += prism(rrect(1.6, 2.9, 3.6, 4.4, 0.35), zc, 0.35);
  [3.8, 4.5].forEach((y, i) => (s += lineOn(2.2, y, i ? 3.6 : 4.6, y, zc + 0.35)));
  s += prism(rrect(5.8, 2.9, 2.6, 0.9, 0.2), zt, 0.2);
  s += prism(rrect(5.8, 4.1, 2.6, 0.9, 0.2), zt, 0.2);
  s += prism(rrect(5.8, 6.1, 2.6, 1.2, 0.6), zb, 0.5 - L[4].v * 0.3, TANG);
  return s;
}

const A: Pt = [1.6, 8.4];
const C1: Pt = [1.6, 2.4];
const C2: Pt = [4.6, 1.6];
const B: Pt = [8.4, 1.6];
const bez = (u: number): Pt => {
  const m = 1 - u;
  return [
    m * m * m * A[0] + 3 * m * m * u * C1[0] + 3 * m * u * u * C2[0] + u * u * u * B[0],
    m * m * m * A[1] + 3 * m * m * u * C1[1] + 3 * m * u * u * C2[1] + u * u * u * B[1],
  ];
};
function drawMotion({ t }: Scene) {
  let s = plate();
  const z = 0.46;
  const path: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const [x, y] = bez(i / 40);
    path.push(IP(x, y, z));
  }
  s += `<polyline points="${pts(path)}" fill="none" stroke="var(--tang)" stroke-width="1.3" stroke-linecap="round"/>`;
  s += lineOn(A[0], A[1], C1[0], C1[1], z, "var(--tang)", 0.9) + lineOn(B[0], B[1], C2[0], C2[1], z, "var(--tang)", 0.9);
  for (const [x, y] of [C1, C2]) {
    const [px, py] = IP(x, y, z);
    s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.6" fill="var(--canvas)" stroke="var(--tang)" stroke-width="1"/>`;
  }
  for (const [x, y] of [A, B]) {
    const sq = (
      [
        [x - 0.28, y - 0.28],
        [x + 0.28, y - 0.28],
        [x + 0.28, y + 0.28],
        [x - 0.28, y + 0.28],
      ] as Pt[]
    ).map(([a, b]) => IP(a, b, z));
    s += `<polygon points="${pts(sq)}" fill="var(--canvas)" stroke="var(--tang)" stroke-width="1"/>`;
  }
  for (const g of [0.2, 0.4, 0.6, 0.8]) {
    const [x, y] = bez(easeInOutCubic(g));
    s += ghostDisc(x, y, z + Math.sin(Math.PI * g) * 1.4, 0.75, 0.5);
  }
  const [x, y] = bez(easeInOutCubic(t));
  const hop = Math.sin(Math.PI * t) * 1.4;
  const [px, py] = IP(x, y, z);
  s += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${(10 - hop * 2).toFixed(1)}" ry="${(5.6 - hop).toFixed(1)}" fill="var(--ink)" opacity=".08"/>`;
  s += token(x, y, z + hop, 0.75, 0.36);
  return s;
}

function drawAi({ springs: n, on }: Scene) {
  let s = plate();
  const z = 0.45;
  s += prism(rrect(1, 1, 3.2, 3.6, 0.3), z, 0.22);
  [1.9, 2.6, 3.3].forEach((y, i) => (s += lineOn(1.5, y, i === 1 ? 2.9 : 3.6, y, z + 0.22)));
  s += prism(rrect(1.5, 3.75, 2.2, 0.55, 0.27), z + 0.22, 0.12, on ? TANG : NEU);
  s += token(2.6, 6.6, z, 0.85, 0.42);
  let i = 0;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++, i++) {
      const [x, y] = [5.6 + c * 1.45, 5.0 + r * 1.45];
      const v = n[i].v;
      s += v < 0.02 ? ghostDisc(x, y, z + 0.01, 0.55, 0.55) : token(x, y, z + (1 - v) * 2, 0.55, 0.3, Math.min(1, v * 1.4));
    }
  return s;
}

const DRAW = { ux: drawUx, motion: drawMotion, ai: drawAi };
// The motion scene's loop: travel for the first 70%, then rest.
const LOOP_S = 3.4;
const TRAVEL = 0.7;

export type Dio = {
  /** Hover state: lifts, scrubs or duplicates. */
  set(on: boolean): void;
  /** A click: ux presses its button, ai toggles its set. */
  tap(): void;
  /** Scrub the motion scene (0–1), or hand it back to its loop with null. */
  scrub(t: number | null): void;
  readonly on: boolean;
  destroy(): void;
};

export function createDio(kind: DioKind, svg: SVGSVGElement): Dio {
  const S: Scene = { springs: [], on: false, t: 1, scrub: false };
  if (kind === "ux") S.springs = [spring(180, 0.5), spring(170, 0.48), spring(160, 0.45), spring(190, 0.5), spring(500, 0.4)];
  if (kind === "ai") S.springs = Array.from({ length: 9 }, () => spring(260, 0.5));
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  const render = () => (svg.innerHTML = shown = DRAW[kind](S));

  let visible = false;
  let raf = 0;
  let last = 0;
  let shown = "";
  let resting = 0;
  const frame = (n: number) => {
    const dt = last ? Math.min(0.033, (n - last) / 1000) : 0.016;
    last = n;
    S.springs.forEach((s) => s.step(dt));
    const busy = S.springs.some((s) => s.busy());
    // The motion scene loops by itself (3.4s: travel, then a rest at the end).
    const loops = kind === "motion" && !S.scrub && !calm();
    let rest = 0;
    if (loops) {
      const c = ((n / 1000) % LOOP_S) / LOOP_S;
      S.t = c < TRAVEL ? c / TRAVEL : 1;
      if (c >= TRAVEL) rest = (1 - c) * LOOP_S * 1000;
    }
    // Only a changed scene is written; the rest at the end of the loop
    // sleeps on a timer instead of redrawing the same frame.
    const scene = DRAW[kind](S);
    if (scene !== shown) svg.innerHTML = shown = scene;
    if (rest && !busy) {
      raf = 0;
      last = 0;
      clearTimeout(resting);
      resting = window.setTimeout(kick, rest);
      return;
    }
    raf = visible && (loops || busy) ? requestAnimationFrame(frame) : 0;
    if (!raf) last = 0;
  };
  const kick = () => {
    // Calm: springs land on their end state at once.
    if (calm()) {
      S.springs.forEach((s) => s.step(0));
      return render();
    }
    if (visible) raf ||= requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) kick();
  });
  io.observe(svg);
  render();

  return {
    get on() {
      return S.on;
    },
    set(on) {
      S.on = on;
      if (kind === "ux")
        S.springs.slice(0, 4).forEach((s, i) => (on ? later(() => ((s.to = 1), kick()), i * 60) : (s.to = 0)));
      if (kind === "ai")
        S.springs.forEach((s, i) => later(() => ((s.to = on ? 1 : 0), kick()), on ? 120 + i * 80 : (8 - i) * 30));
      if (kind === "motion" && calm()) S.t = 1;
      kick();
      render();
    },
    tap() {
      if (kind === "ux") {
        const p = S.springs[4];
        p.to = 1;
        later(() => ((p.to = 0), kick()), 130);
        kick();
      }
      if (kind === "ai") this.set(!S.on);
    },
    scrub(t) {
      if (kind !== "motion") return;
      S.scrub = t != null;
      if (t != null) S.t = t;
      kick();
      render();
    },
    destroy() {
      io.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(resting);
      timers.forEach(clearTimeout);
    },
  };
}
