// Wessel's engine: one cursor that travels down the page and does one small,
// real design job per section (a "beat"), and the night bots that do the
// chores while he sleeps. DESIGN.md §7, motion-tokens.json `wessel`.
//
// Not React: it runs on requestAnimationFrame and touches the DOM directly,
// so his travel never re-renders anything. <CursorLayer> attaches his
// element; sections register their beats with useBeat().
//
// Rules it keeps:
// - one Wessel, never following your pointer; one beat at a time
// - beats play in full, once per mode, when ~40% of a section is in view;
//   on a fast scroll he waits a breath, on a flick past he skips and the
//   beat replays when you come back
// - between beats he parks where he worked, then drifts after you a beat
//   behind (the page drags him at 55%) and re-enters from the edge he left
// - calm (Pause motion or reduced motion): no travel, end states only

import motionTokens from "../../design/motion-tokens.json";
import { getMotion, subscribeMotion } from "./motion";
import { smileySvg } from "./smiley";

const { wessel: T } = motionTokens;
const S = T.spring;

export type XY = [number, number];
type Target = XY | (() => XY | null);
type Spring = { k: number; z: number };

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const calm = () => getMotion().calm;
// The sticky header's height (--spacing-header), read once.
let hdr = 0;
const header = () => (hdr ||= parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--spacing-header")) || 90);
const mobile = () => innerWidth < 900;

// ---------- generations ----------
// A mode change or a page change starts a new generation; a running beat
// checks in with live(g) between steps and stops quietly when it's stale.
const STALE = Symbol("stale");
let gen = 0;
export const live = (g: number) => {
  if (g !== gen) throw STALE;
};

// ---------- the page-coordinate layer (#ovl, inside .page) ----------
const page = () => document.querySelector<HTMLElement>(".page");
const ovl = () => document.getElementById("ovl");

/** An element's box in page coordinates (scrolls with the page). */
export function pageBox(el: Element) {
  const r = el.getBoundingClientRect();
  const p = page()?.getBoundingClientRect() ?? { left: 0, top: 0 };
  return { x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height };
}

/** Puts a mark on the page layer. Box is [x, y, w?, h?] in page coordinates. */
export function put(className: string, text = "", box?: [number, number, number?, number?]) {
  const d = document.createElement("div");
  d.className = className;
  d.textContent = text;
  if (box) place(d, box);
  ovl()?.appendChild(d);
  return d;
}
function place(d: HTMLElement, [x, y, w, h]: [number, number, number?, number?]) {
  d.style.left = `${x}px`;
  d.style.top = `${y}px`;
  if (w != null) d.style.width = `${w}px`;
  if (h != null) d.style.height = `${h}px`;
}
export const clearMarks = () => ovl()?.replaceChildren();

/** Fades a set of marks out after a while. */
export function fade(marks: HTMLElement[], after: number) {
  setTimeout(() => {
    for (const m of marks) {
      m.style.transition = "opacity .4s";
      m.style.opacity = "0";
      setTimeout(() => m.remove(), 420);
    }
  }, after);
}

// ---------- selections: glued to their element, gone by themselves ----------
type Sel = {
  el: HTMLElement;
  box: HTMLElement;
  /** How far the box is drawn open from its top-left corner (0–1), for a drag-select. */
  grow: number;
  done: () => void;
  /** Pops the size pill in after a drag-select. */
  size: () => void;
};
const sels = new Set<Sel>();
let selRaf = 0;
function fitSels() {
  for (const s of sels) {
    // Layout size, so the magnetism's transform can't throw it off.
    const r = pageBox(s.el);
    const w = s.el.offsetWidth;
    const h = s.el.offsetHeight;
    place(s.box, [r.x + r.w / 2 - w / 2, r.y + r.h / 2 - h / 2, w * s.grow, h * s.grow]);
  }
  selRaf = sels.size ? requestAnimationFrame(fitSels) : 0;
}
export function select(el: HTMLElement, { label = true, ms = 1500, bot = false, grow = 1 } = {}) {
  const box = put("sel");
  box.dataset.bot = String(bot);
  box.innerHTML = "<i></i><i></i><i></i><i></i>";
  const sizePill = (pop = false) => {
    const z = document.createElement("span");
    z.className = `szp text-micro${pop ? " pop" : ""}`;
    z.textContent = `${el.offsetWidth} × ${el.offsetHeight}`;
    box.appendChild(z);
  };
  if (label) sizePill();
  const s: Sel = {
    el,
    box,
    grow,
    size: () => sizePill(true),
    done: () => {
      box.style.opacity = "0";
      setTimeout(() => {
        box.remove();
        sels.delete(s);
      }, 380);
    },
  };
  sels.add(s);
  selRaf ||= requestAnimationFrame(fitSels);
  if (ms) setTimeout(s.done, ms);
  return s;
}

// ---------- pins: one on screen at a time ----------
export function showPin(pin: HTMLElement) {
  document.querySelectorAll<HTMLElement>(".pin[data-live]").forEach((p) => {
    if (p !== pin) p.hidden = true;
  });
  pin.hidden = false;
  pin.classList.remove("pop");
  void pin.offsetWidth;
  pin.classList.add("pop");
}

/** A comment pin Wessel drops on the page layer at a page point. It pops
 *  in empty; say() types into its bubble. */
export function putPin(at: XY, text = "") {
  const pin = put("pin hi-pin", "", at);
  pin.innerHTML = `<span class="av">${smileySvg()}</span><span class="bub text-small"></span>`;
  const bub = pin.querySelector<HTMLElement>(".bub")!;
  bub.textContent = text;
  return { pin, bub };
}

// ---------- cursor markup (shared with <Cursor>) ----------
// Figma-style multiplayer pointer: a rounded arrowhead, no stem (Wons,
// 2026-10-27). TIP is where it points, in CSS px from its top-left.
export const POINTER =
  "M3.4 2.6c-.5-.3-1.1.2-.9.8l4.6 13.9c.2.6 1 .7 1.3.1l2.4-4.7c.1-.3.4-.5.7-.5l5.2-.7c.6-.1.8-.9.3-1.3z";
export const POINTER_BOX = "0 0 20 20";
export const TIP: XY = [3, 3];
function cursorEl(kind: "bot", name: string) {
  const el = document.createElement("div");
  el.className = `cur ${kind}`;
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<svg class="ptr" viewBox="${POINTER_BOX}"><path d="${POINTER}"/></svg><span class="lab"><span class="tag text-cursor-tag"></span></span>`;
  el.querySelector(".tag")!.textContent = name;
  return el;
}

// ---------- bots: they live on the page, do one job and leave ----------
export class Bot {
  el: HTMLElement;
  x = -400;
  y = -400;
  private vx = 0;
  private vy = 0;
  private raf = 0;
  constructor(name: string) {
    this.el = cursorEl("bot", name);
    ovl()?.appendChild(this.el);
    this.draw();
  }
  private fitX(x: number) {
    const w = page()?.clientWidth ?? innerWidth;
    return Math.max(4, Math.min(x, w - (this.el.offsetWidth || 110) - 6));
  }
  private draw() {
    this.el.style.transform = `translate(${(this.x - TIP[0]).toFixed(1)}px,${(this.y - TIP[1]).toFixed(1)}px)`;
  }
  place(x: number, y: number) {
    cancelAnimationFrame(this.raf);
    this.x = this.fitX(x);
    this.y = y;
    this.vx = this.vy = 0;
    this.draw();
  }
  private inView() {
    const top = page()?.getBoundingClientRect().top ?? 0;
    const vy = this.y + top;
    return vy > -60 && vy < innerHeight + 60;
  }
  /** Travels to a page point; enters from the side if it was off screen. */
  async to(x: number, y: number, { k = S.bot.k, max = 1200 } = {}) {
    if (!this.inView()) this.place(x - innerWidth * 0.3, y + 60);
    x = this.fitX(x);
    if (calm()) return this.place(x, y);
    cancelAnimationFrame(this.raf);
    return new Promise<void>((res) => {
      const t0 = performance.now();
      let last = t0;
      const z = S.bot.z;
      const ky = k * S.yScale;
      const f = (n: number) => {
        const dt = Math.min(0.032, (n - last) / 1000);
        last = n;
        this.vx += (-k * (this.x - x) - 2 * z * Math.sqrt(k) * this.vx) * dt;
        this.vy += (-ky * (this.y - y) - 2 * z * Math.sqrt(ky) * this.vy) * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.draw();
        const near = Math.hypot(this.x - x, this.y - y) < 0.6 && Math.hypot(this.vx, this.vy) < 8;
        if (near || n - t0 > max) {
          this.place(x, y);
          res();
        } else this.raf = requestAnimationFrame(f);
      };
      this.raf = requestAnimationFrame(f);
    });
  }
  press(on: boolean) {
    this.el.dataset.press = String(on);
  }
  async leave() {
    this.el.dataset.hide = "true";
    await wait(220);
    this.el.remove();
  }
}

// ---------- Wessel ----------
const W = {
  el: null as HTMLElement | null,
  tag: null as HTMLElement | null,
  note: null as string | null,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  drive: null as (() => XY | null) | null,
  spring: S.beat as Spring,
  anchor: null as XY | null,
  /** After a page change: the screen spot he holds until his next job. */
  hold: null as XY | null,
  parked: false,
  asleep: false,
  shown: false,
  dist: 0,
  sp: 0,
  /** Tag on the left of the pointer, so a parked Wessel covers his own work, not the next column. */
  lean: false,
};

// Scroll speed: SV now, SP the recent peak (decays fast).
let lastSY = 0;
let SV = 0;
let SP = 0;
let raf = 0;
let hero: HTMLElement | null = null;

const inView = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.bottom > 60 && r.top < innerHeight - 60;
};

// Where he goes when he has no job.
function home(): XY {
  if (W.asleep) {
    if (hero && inView(hero)) {
      const r = hero.getBoundingClientRect();
      // Phones: just under the hero, never on the name.
      return mobile()
        ? [r.left + 20, Math.max(100, Math.min(r.bottom + 28, innerHeight - 150))]
        : [r.left + r.width * 0.8, r.top + r.height * 0.17];
    }
    return [innerWidth - (mobile() ? 70 : 110), innerHeight - (mobile() ? 150 : 110)];
  }
  if (W.hold) {
    W.parked = true;
    return W.hold;
  }
  if (W.anchor) {
    // He stays where he last worked, like a collaborator in a shared file…
    const y = W.anchor[1] - scrollY;
    W.parked = y > header() + 24 && y < innerHeight - 40;
    if (W.parked) return [W.anchor[0] - scrollX, y];
    // …and once that has scrolled away he wanders after you, a beat behind.
    return [W.anchor[0] - scrollX, y < 0 ? innerHeight * 0.22 : innerHeight * 0.78];
  }
  W.parked = false;
  return [innerWidth - (mobile() ? 64 : 120), innerHeight * 0.74];
}

let lastT: number | null = null;

function tick(n: number) {
  const el = W.el;
  if (!el) return;
  const dt = Math.min(0.033, (n - (tick.last || n)) / 1000) || 0.016;
  tick.last = n;
  const d = scrollY - lastSY;
  lastSY = scrollY;
  SV += (Math.abs(d) / dt - SV) * 0.2;
  SP = Math.max(SV, SP * Math.pow(0.2, dt));
  const still = calm();

  let t = W.drive?.() ?? null;
  const driving = !!t;
  // A job that scrolls away: he reaches for it from the edge instead of leaving.
  // Never on the sticky header: his target stays below it.
  if (t && !W.asleep) t = [t[0], cl(t[1], header() + 24, innerHeight - 40)];
  if (!t) t = home();
  const parked = !driving && W.parked && !W.asleep;

  // The page drags him a little; he resists and catches up. Not when his
  // job holds still on screen while you scroll (a sticky panel): then he
  // stays put with it instead of bobbing up and back.
  const pinned = driving && lastT !== null && Math.abs(t[1] - lastT) < 0.5;
  lastT = driving ? t[1] : null;
  if (!still && !parked && !pinned) W.y -= driving ? d : d * 0.55;
  if (still || parked) {
    W.x = t[0];
    W.y = t[1];
    W.vx = W.vy = 0;
  } else {
    const sp = driving ? W.spring : W.asleep ? S.asleep : S.free;
    const k = sp.k * Math.min(S.maxBoost, 1 + SV / S.boostPerPxSec);
    const ky = k * S.yScale;
    W.vx += (-k * (W.x - t[0]) - 2 * sp.z * Math.sqrt(k) * W.vx) * dt;
    W.vy += (-ky * (W.y - t[1]) - 2 * sp.z * Math.sqrt(ky) * W.vy) * dt;
    W.x += W.vx * dt;
    W.y += W.vy * dt;
  }
  W.dist = Math.hypot(W.x - t[0], W.y - t[1]);
  W.sp = Math.hypot(W.vx, W.vy);

  const lab = el.querySelector<HTMLElement>(".lab");
  el.dataset.flip = String(W.lean || W.x + (lab?.offsetWidth ?? 0) + 20 > innerWidth);
  const heroIn = !!hero && inView(hero);
  el.dataset.note = String(W.asleep && heroIn);
  el.dataset.dock = String(W.asleep && !heroIn);
  el.style.transform = `translate(${(W.x - TIP[0]).toFixed(1)}px,${(W.y - TIP[1]).toFixed(1)}px)`;
  raf = requestAnimationFrame(tick);
}
tick.last = 0;

export const wessel = {
  /** Point at part of an element (fx, fy are fractions of its box). */
  at:
    (el: Element, fx = 0.5, fy = 0.5, dx = 0, dy = 0) =>
    (): XY => {
      const r = el.getBoundingClientRect();
      return [r.left + r.width * fx + dx, r.top + r.height * fy + dy];
    },

  /** Travels to a viewport point (or a function that tracks one). */
  go(target: Target, { k = S.beat.k, timeout = 700, lean = false } = {}) {
    W.lean = lean;
    W.drive = typeof target === "function" ? target : () => target;
    W.spring = { k, z: S.beat.z };
    const t = W.drive();
    // Lost off screen: he comes back in from the edge he left by.
    if (t && !calm() && W.shown && (W.y < -60 || W.y > innerHeight + 60)) {
      W.y = W.y < 0 ? -40 : innerHeight + 40;
      W.x = cl(t[0] + 80, 20, innerWidth - 20);
      W.vx = W.vy = 0;
    }
    return new Promise<void>((res) => {
      const t0 = performance.now();
      const check = () => {
        if (calm() || (W.dist < 2 && W.sp < 14) || performance.now() - t0 > timeout) res();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  },

  /** Drags from a to b over ms; step(e) runs with the eased progress. */
  drag(a: () => XY, b: () => XY, ms: number, step?: (e: number) => void) {
    return new Promise<void>((res) => {
      const t0 = performance.now();
      W.spring = { k: 1400, z: S.beat.z };
      W.drive = () => {
        const e = easeInOut(calm() ? 1 : cl((performance.now() - t0) / ms));
        step?.(e);
        const A = a();
        const B = b();
        return [lerp(A[0], B[0], e), lerp(A[1], B[1], e)];
      };
      setTimeout(res, calm() ? 0 : ms + 50);
    });
  },

  press(on: boolean) {
    if (W.el) W.el.dataset.press = String(on);
  },

  /** Lets go: he parks right where he is. */
  free() {
    W.drive = null;
    W.lean = false;
    wessel.press(false);
    W.hold = null;
    W.anchor = [W.x + scrollX, W.y + scrollY];
  },

  /** Where he is now, on screen. */
  pos: (): XY => [W.x, W.y],

  /** A keyboard chip (⌘C, ⌘V) that rides along with his pointer for a moment. */
  chip(text: string) {
    if (!W.el) return;
    const c = document.createElement("span");
    c.className = "kchip wchip text-micro";
    c.textContent = text;
    W.el.appendChild(c);
    setTimeout(() => {
      c.dataset.out = "";
      setTimeout(() => c.remove(), 300);
    }, 650);
  },

  /** A short note after his name in the tag ("Wessel · 42%"); null clears it. */
  note(text: string | null) {
    W.note = text;
    if (W.tag && !W.asleep) W.tag.textContent = text ? `Wessel · ${text}` : "Wessel";
  },

  show() {
    if (W.shown || !W.el) return;
    W.shown = true;
    W.el.dataset.hide = "false";
  },
};

/** <CursorLayer> hands over his element; returns the cleanup. */
export function attachWessel(el: HTMLElement) {
  W.el = el;
  W.tag = el.querySelector(".tag b");
  W.x = innerWidth + 80;
  W.y = innerHeight * 0.5;
  lastSY = scrollY;
  el.dataset.hide = "true";
  raf = requestAnimationFrame(tick);
  // Pause (or the system's reduce motion) mid-beat: drop what's running and
  // put every section straight into its end state.
  let wasCalm = calm();
  const off = subscribeMotion(() => {
    if (calm() === wasCalm) return;
    wasCalm = calm();
    if (!wasCalm) return;
    newGeneration();
    beats.forEach((b) => {
      b.done = {};
      b.q = false;
      trigger(b);
    });
  });
  return () => {
    off();
    cancelAnimationFrame(raf);
    W.el = null;
  };
}

/** Night puts him to bed (bots take over); day wakes him. */
export function setWesselAsleep(asleep: boolean) {
  if (W.asleep === asleep && W.el?.dataset.asleep === String(asleep)) return;
  W.asleep = asleep;
  newGeneration();
  W.lean = false;
  if (!W.el) return;
  W.el.dataset.asleep = String(asleep);
  if (W.tag) W.tag.textContent = asleep ? "Wessel · asleep" : W.note ? `Wessel · ${W.note}` : "Wessel";
  // Asleep he's a real button (wake him); awake he's decoration.
  W.el.tabIndex = asleep ? 0 : -1;
  if (asleep) {
    W.el.removeAttribute("aria-hidden");
    W.el.setAttribute("role", "button");
    W.el.setAttribute("aria-label", "Wake Wessel (switches to day mode)");
    W.el.inert = false;
    wessel.show();
  } else {
    W.el.setAttribute("aria-hidden", "true");
    W.el.removeAttribute("role");
    W.el.removeAttribute("aria-label");
    W.el.inert = true;
  }
  // Let each beat replay in the new mode once its section is seen.
  requestAnimationFrame(() => beats.forEach(trigger));
}

/** A page is about to change: he stays where he is on screen. Taken before
 *  the route swaps, as a shorter new page can clamp the scroll under him. */
export function holdWessel() {
  W.hold = W.el && W.el.dataset.hide !== "true" ? [W.x, W.y] : null;
}

/** A page change: new generation, fresh marks, he forgets his parking spot
 *  but holds still on screen (like the header) until the new page gives him a job. */
export function newPage() {
  newGeneration();
  W.lean = false;
  W.anchor = null;
  if (!W.hold) holdWessel();
  W.drive = null;
  hero = document.querySelector<HTMLElement>("[data-hero]");
}

function newGeneration() {
  gen++;
  W.drive = null;
  wessel.press(false);
  sels.clear();
  clearMarks();
  beats.forEach((b) => b.reset?.());
  chain = Promise.resolve();
  busy = false;
}

// ---------- beats ----------
export type BeatFn = (g: number) => Promise<void>;
export type BeatSpec = {
  day: BeatFn;
  night?: BeatFn;
  /** How much of the section must be in view (0–1). */
  need?: number;
  /** Keep holding the pose after the beat (he doesn't let go). */
  keep?: boolean;
  /** Back to the start state (mode or page change). */
  reset?: () => void;
  /** Paused or reduced motion: no beat runs (DESIGN.md §8). This puts the
   *  section straight into the state the beat would have left it in. */
  still?: (mode: "day" | "night") => void;
};
type Beat = BeatSpec & { el: HTMLElement; done: { day?: boolean; night?: boolean }; q?: boolean };

const beats = new Set<Beat>();
let chain = Promise.resolve();
let busy = false;
/** True at night, once the engine has put him to bed. */
export const isAsleep = () => W.asleep;
/** True while Wessel or a bot is mid-job (entrances can wait a moment). */
export const isBusy = () => busy;

function seen(el: Element, f: number) {
  const r = el.getBoundingClientRect();
  if (!r.height) return false;
  return Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) >= Math.min(r.height * f, innerHeight * f);
}

function trigger(b: Beat) {
  const mode = W.asleep ? "night" : "day";
  const need = b.need ?? T.need.default;
  if (b.done[mode] || b.q || !W.el) return;
  if (W.asleep && !b.night) return;
  b.q = true;
  chain = chain.then(async () => {
    b.q = false;
    // Calm: no beat, just its end state, whether or not it's on screen yet.
    if (b.done[mode] || !beats.has(b) || (!calm() && !seen(b.el, need))) return;
    b.done[mode] = true;
    if (calm()) return b.still?.(mode);
    const g = gen;
    // He always plays his full beat. If you're moving fast he waits a
    // breath; a flick past skips it, and it plays when you come back.
    for (let i = 0; i < T.fastScroll.waitMs / 60 && !calm() && SP > T.fastScroll.waitAbovePxPerSec; i++)
      await wait(60);
    if (g !== gen || !beats.has(b) || !b.el.isConnected) return;
    if (!calm() && (SP > T.fastScroll.skipAbovePxPerSec || !seen(b.el, need))) {
      b.done[mode] = false;
      // Flicked past: it plays when you come back, or once you stop here.
      setTimeout(() => trigger(b), 500);
      return;
    }
    busy = true;
    if (!W.asleep) wessel.show();
    try {
      await (W.asleep ? b.night! : b.day)(g);
    } catch (e) {
      // A section that left mid-beat (page change) just stops.
      if (e !== STALE && b.el.isConnected) console.error(e);
    }
    busy = false;
    if (g === gen && !W.asleep && !b.keep) wessel.free();
  });
}

const thresholds = Array.from({ length: 11 }, (_, i) => i / 10);
let io: IntersectionObserver | null = null;
const byEl = new Map<Element, Beat>();

/** Registers a section's beat; returns the cleanup. */
export function registerBeat(el: HTMLElement, spec: BeatSpec) {
  io ||= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const b = byEl.get(e.target);
        if (b && e.isIntersecting) trigger(b);
      }
    },
    { threshold: thresholds },
  );
  const b: Beat = { ...spec, el, done: {} };
  beats.add(b);
  byEl.set(el, b);
  io.observe(el);
  if (calm()) requestAnimationFrame(() => trigger(b));
  return () => {
    beats.delete(b);
    byEl.delete(el);
    io?.unobserve(el);
  };
}

/** Shows Wessel after a moment, even before his first beat. */
export function arrive(ms = 600) {
  const g = gen;
  const wait = calm() ? 0 : ms;
  setTimeout(() => wessel.show(), wait);
  // No job on the new page after a moment: he stops holding his old spot
  // (which may now be over copy) and goes back to resting.
  setTimeout(() => {
    if (g === gen && !W.drive && !busy) W.hold = null;
  }, wait + 1200);
}
