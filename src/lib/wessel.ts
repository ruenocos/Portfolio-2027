// Wessel's engine: one cursor that travels down the page and does one small,
// real design job per section (a "beat"). DESIGN.md §7, motion-tokens.json `wessel`.
//
// Not React: it runs on requestAnimationFrame and touches the DOM directly,
// so his travel never re-renders anything. <CursorLayer> attaches his
// element; sections register their beats with useBeat().
//
// Rules it keeps:
// - one Wessel, never following your pointer; one beat at a time
// - beats play in full, once, when ~40% of a section is in view;
//   on a fast scroll he waits a breath, on a flick past he skips and the
//   beat replays when you come back
// - between beats he parks where he worked, then drifts after you a beat
//   behind (the page drags him at 55%; on touch he rides the page while
//   your finger scrolls and catches up after) and re-enters from the edge he left
// - he travels like a hand on a mouse: speeds up, tops out, the spring lands him
// - on the way back up he looks over what he made in each section you pass
//   (a dashed box, no size pill), then parks where he left it; once per trip
// - calm (Pause motion or reduced motion): no travel, end states only

import motionTokens from "../../design/motion-tokens.json";
import { getMotion, subscribeMotion } from "./motion";
import { smileySvg } from "./smiley";
import { clamp, easeInOutCubic, lerp } from "./math";
import { narrow, touch } from "./media";

const { wessel: wesselMotion } = motionTokens;
const springs = wesselMotion.spring;

export type XY = [number, number];
type Target = XY | (() => XY | null);
type Spring = { k: number; z: number };

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const calm = () => getMotion().calm;
// The sticky header's height (--spacing-header), read once.
let headerPx = 0;
const header = () => (headerPx ||= parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--spacing-header")) || 90);

// ---------- generations ----------
// A mode change or a page change starts a new generation; a running beat
// checks in with live(g) between steps and stops quietly when it's stale.
const STALE = Symbol("stale");
let generation = 0;
export const live = (g: number) => {
  if (g !== generation) throw STALE;
};

// ---------- the page-coordinate layer (#ovl, inside .page) ----------
const page = () => document.querySelector<HTMLElement>(".page");

// ---------- the screen he works on ----------
// The screen's height for his travel. On touch it only changes with the
// width (a turn of the phone): the browser bar sliding in and out while
// you scroll resizes innerHeight, and his spots would jump with it.
let screenH = 0;
let screenW = 0;
/** A touch screen (asked on resize, not per frame). */
let onTouch = false;
const screenHeight = () => screenH || (screenH = innerHeight);
function measureScreen() {
  onTouch = touch();
  if (!screenH || !onTouch || innerWidth !== screenW) screenH = innerHeight;
  screenW = innerWidth;
}
const overlay = () => document.getElementById("ovl");

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
  overlay()?.appendChild(d);
  return d;
}
function place(d: HTMLElement, [x, y, w, h]: [number, number, number?, number?]) {
  d.style.left = `${x}px`;
  d.style.top = `${y}px`;
  if (w != null) d.style.width = `${w}px`;
  if (h != null) d.style.height = `${h}px`;
}
export const clearMarks = () => overlay()?.replaceChildren();

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
const selections = new Set<Sel>();
let selRaf = 0;
function fitSelections() {
  for (const s of selections) {
    // Layout size, so the magnetism's transform can't throw it off.
    const r = pageBox(s.el);
    const w = s.el.offsetWidth;
    const h = s.el.offsetHeight;
    place(s.box, [r.x + r.w / 2 - w / 2, r.y + r.h / 2 - h / 2, w * s.grow, h * s.grow]);
  }
  selRaf = selections.size ? requestAnimationFrame(fitSelections) : 0;
}
export function select(el: HTMLElement, { label = true, ms = 1500, grow = 1, look = false } = {}) {
  const box = put("sel");
  box.innerHTML = "<i></i><i></i><i></i><i></i>";
  if (look) box.dataset.look = "";
  // What he selects during a beat is what he looks over on the way back up.
  if (playing) playing.made = el;
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
        selections.delete(s);
      }, 380);
    },
  };
  selections.add(s);
  // Fit at once, so the box never paints at 0,0 and jumps (layout shift).
  fitSelections();
  cancelAnimationFrame(selRaf);
  selRaf = requestAnimationFrame(fitSelections);
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
/** A live comment: at is its pointed bottom-left corner. Stamped with his local time. */
export function putPin(at: XY, text = "") {
  const pin = put("pin hi-pin", "", at);
  const now = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" }).format();
  pin.innerHTML = `<span class="av">${smileySvg()}</span><span class="cm"><span class="who">Wessel<time>${now}</time></span><span class="bub text-small"></span></span>`;
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
// ---------- Wessel ----------
const cursor = {
  el: null as HTMLElement | null,
  tag: null as HTMLElement | null,
  note: null as string | null,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  drive: null as (() => XY | null) | null,
  spring: springs.beat as Spring,
  anchor: null as XY | null,
  /** After a page change: the screen spot he holds until his next job. */
  hold: null as XY | null,
  parked: false,
  shown: false,
  distance: 0,
  speed: 0,
  /** Tag on the left of the pointer, so a parked Wessel covers his own work, not the next column. */
  lean: false,
};

// Scroll speed: scrollSpeed now, scrollPeak the recent peak (decays fast).
// scrollDirection: which way you last scrolled (1 down, -1 up).
let lastScrollY = 0;
let scrollSpeed = 0;
let scrollPeak = 0;
let scrollDirection = 1;
let raf = 0;

// Where he goes when he has no job.
function home(): XY {
  if (cursor.hold) {
    cursor.parked = true;
    return cursor.hold;
  }
  if (cursor.anchor) {
    // He stays where he last worked, like a collaborator in a shared file…
    const y = cursor.anchor[1] - scrollY;
    cursor.parked = y > header() + 24 && y < screenHeight() - 40;
    if (cursor.parked) return [cursor.anchor[0] - scrollX, y];
    // …and once that has scrolled away he wanders after you, a beat behind.
    return [cursor.anchor[0] - scrollX, y < 0 ? screenHeight() * 0.22 : screenHeight() * 0.78];
  }
  cursor.parked = false;
  return [innerWidth - (narrow() ? 64 : 120), screenHeight() * 0.74];
}

let lastTargetY: number | null = null;
// When the page last scrolled (ms), for touch: a finger or a fling is still going.
let lastScrollAt = 0;
// The last written transform and tag side, so a still frame writes nothing.
let shownAt = "";
let flipped = false;
// His tag's width, measured when its text changes (never per frame).
let labelW = 0;
const measureLabel = () => (labelW = cursor.el?.querySelector<HTMLElement>(".lab")?.offsetWidth ?? 0);

/** Writes his spot. The layer is in page coordinates, so the engine's
 *  screen spot gets the scroll added: a still Wessel on a scrolling page
 *  is left to the browser and moves with it in the same frame. */
function draw(el: HTMLElement) {
  const at = `translate(${(cursor.x - TIP[0] + scrollX).toFixed(1)}px,${(cursor.y - TIP[1] + scrollY).toFixed(1)}px)`;
  if (at !== shownAt) el.style.transform = shownAt = at;
}


function tick(frameTime: number) {
  const el = cursor.el;
  if (!el) return;
  const dt = Math.min(0.033, (frameTime - (tick.last || frameTime)) / 1000) || 0.016;
  tick.last = frameTime;
  const scrolled = scrollY - lastScrollY;
  lastScrollY = scrollY;
  if (Math.abs(scrolled) > 0.5) {
    scrollDirection = Math.sign(scrolled);
    lastScrollAt = frameTime;
  }
  // Smoothed the same at 60 and 120 frames a second.
  scrollSpeed += (Math.abs(scrolled) / dt - scrollSpeed) * (1 - Math.pow(0.8, dt * 60));
  scrollPeak = Math.max(scrollSpeed, scrollPeak * Math.pow(0.2, dt));
  const still = calm();

  let target = cursor.drive?.() ?? null;
  const driving = !!target;
  // A job that scrolls away: he reaches for it from the edge instead of leaving.
  // Never on the sticky header: his target stays below it.
  if (target) target = [target[0], clamp(target[1], header() + 24, screenHeight() - 40)];
  if (!target) target = home();
  const [tx, ty] = target;
  const parked = !driving && cursor.parked;

  // The page drags him a little; he resists and catches up. Not when his
  // job holds still on screen while you scroll (a sticky panel): then he
  // stays put with it instead of bobbing up and back.
  const pinned = driving && lastTargetY !== null && Math.abs(ty - lastTargetY) < 0.5;
  lastTargetY = driving ? ty : null;
  // After a page change he holds his spot on screen, like the header.
  const holding = !driving && !!cursor.hold;
  // On touch, free and mid-scroll, he rides the page under your finger
  // (the browser carries him, nothing to lag) and catches up once it stops.
  const fingerScroll = onTouch && frameTime - lastScrollAt < wesselMotion.follow.touchSettleMs;
  const riding = !driving && !parked && fingerScroll;
  const drag = driving || parked || riding ? 1 : wesselMotion.follow.drag;
  if (!still && !pinned && !holding) cursor.y -= scrolled * drag;
  const settled = cursor.distance < 0.5 && cursor.speed < 4;
  if (still || holding || (parked && settled)) {
    // At rest on his spot: he holds it exactly (the page carries him).
    cursor.x = tx;
    cursor.y = ty;
    cursor.vx = cursor.vy = 0;
  } else if (riding) {
    cursor.vx = cursor.vy = 0;
  } else {
    // Back to his parking spot after wandering: he glides there, no jump.
    const spring = driving ? cursor.spring : springs.free;
    const stiffness = spring.k * Math.min(springs.maxBoost, 1 + scrollSpeed / springs.boostPerPxSec);
    const stiffnessY = stiffness * springs.yScale;
    // Not on a drag: that path is already eased and must stay on it.
    const hand = spring.k < 1000 ? (narrow() ? wesselMotion.hand.phone : wesselMotion.hand.desktop) : null;
    // Small steps: a stiff spring (a drag, a fast scroll) on a slow frame
    // would otherwise overshoot further each frame and fling him away.
    const steps = Math.ceil((dt * Math.sqrt(stiffnessY)) / 0.25);
    const step = dt / steps;
    for (let i = 0; i < steps; i++) {
      let ax = -stiffness * (cursor.x - tx) - 2 * spring.z * Math.sqrt(stiffness) * cursor.vx;
      let ay = -stiffnessY * (cursor.y - ty) - 2 * spring.z * Math.sqrt(stiffnessY) * cursor.vy;
      if (hand) {
        // A hand on a mouse: he speeds up over a moment instead of being
        // flung, then the spring brakes him in as before.
        const a = Math.hypot(ax, ay);
        if (ax * cursor.vx + ay * cursor.vy >= 0 && a > hand.accel) {
          ax *= hand.accel / a;
          ay *= hand.accel / a;
        }
      }
      cursor.vx += ax * step;
      cursor.vy += ay * step;
      if (hand) {
        const v = Math.hypot(cursor.vx, cursor.vy);
        if (v > hand.top) {
          cursor.vx *= hand.top / v;
          cursor.vy *= hand.top / v;
        }
      }
      cursor.x += cursor.vx * step;
      cursor.y += cursor.vy * step;
    }
  }
  cursor.distance = Math.hypot(cursor.x - tx, cursor.y - ty);
  cursor.speed = Math.hypot(cursor.vx, cursor.vy);

  // The tag swaps to his left near the right edge, with a little slack so
  // it doesn't flick back and forth along the edge.
  const room = innerWidth - cursor.x - labelW;
  const flip = cursor.lean || room < (flipped ? 40 : 20);
  if (flip !== flipped) el.dataset.flip = String((flipped = flip));
  draw(el);
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
  go(target: Target, { k = springs.beat.k, timeout = 700, lean = false } = {}) {
    cursor.lean = lean;
    cursor.drive = typeof target === "function" ? target : () => target;
    cursor.spring = { k, z: springs.beat.z };
    const t = cursor.drive();
    // Lost off screen: he comes back in from the edge he left by.
    if (t && !calm() && cursor.shown && (cursor.y < -60 || cursor.y > screenHeight() + 60)) {
      cursor.y = cursor.y < 0 ? -40 : screenHeight() + 40;
      cursor.x = clamp(t[0] + 80, 20, innerWidth - 20);
      cursor.vx = cursor.vy = 0;
    }
    return new Promise<void>((res) => {
      const t0 = performance.now();
      const check = () => {
        if (calm() || (cursor.distance < 2 && cursor.speed < 14) || performance.now() - t0 > timeout) res();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  },

  /** Drags from a to b over ms; step(e) runs with the eased progress. */
  drag(a: () => XY, b: () => XY, ms: number, step?: (e: number) => void) {
    return new Promise<void>((res) => {
      const t0 = performance.now();
      cursor.spring = { k: 1400, z: springs.beat.z };
      cursor.drive = () => {
        const e = easeInOutCubic(calm() ? 1 : clamp((performance.now() - t0) / ms));
        step?.(e);
        const A = a();
        const B = b();
        return [lerp(A[0], B[0], e), lerp(A[1], B[1], e)];
      };
      setTimeout(res, calm() ? 0 : ms + 50);
    });
  },

  press(on: boolean) {
    if (cursor.el) cursor.el.dataset.press = String(on);
  },

  /** Lets go: he parks right where he is. */
  free() {
    cursor.drive = null;
    cursor.lean = false;
    wessel.press(false);
    cursor.hold = null;
    cursor.anchor = [cursor.x + scrollX, cursor.y + scrollY];
  },

  /** Where he is now, on screen. */
  pos: (): XY => [cursor.x, cursor.y],

  /** A keyboard chip (⌘C, ⌘V) that rides along with his pointer for a moment. */
  chip(text: string) {
    if (!cursor.el) return;
    const c = document.createElement("span");
    c.className = "kchip wchip text-micro";
    c.textContent = text;
    cursor.el.appendChild(c);
    setTimeout(() => {
      c.dataset.out = "";
      setTimeout(() => c.remove(), 300);
    }, 650);
  },

  /** A short note after his name in the tag ("Wessel · 42%"); null clears it. */
  note(text: string | null) {
    cursor.note = text;
    if (cursor.tag) cursor.tag.textContent = text ? `Wessel · ${text}` : "Wessel";
    measureLabel();
  },

  /** Back off-screen right, so his next move glides in from the edge. */
  offstage() {
    cursor.x = innerWidth + 80;
    cursor.y = screenHeight() * 0.5;
    cursor.vx = cursor.vy = 0;
    // Written now, so the frame before his next tick doesn't show the old spot.
    if (cursor.el) draw(cursor.el);
  },

  show() {
    if (cursor.shown || !cursor.el) return;
    cursor.shown = true;
    cursor.el.dataset.hide = "false";
  },
};

/** <CursorLayer> hands over his element; returns the cleanup. */
export function attachWessel(el: HTMLElement) {
  cursor.el = el;
  cursor.tag = el.querySelector(".tag b");
  measureScreen();
  cursor.x = innerWidth + 80;
  cursor.y = screenHeight() * 0.5;
  lastScrollY = scrollY;
  shownAt = "";
  flipped = false;
  el.dataset.hide = "true";
  measureLabel();
  addEventListener("resize", measureScreen);
  // A font swap can change his tag's width.
  document.fonts?.ready.then(measureLabel);
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
      b.done = false;
      b.q = false;
      trigger(b);
    });
  });
  return () => {
    off();
    removeEventListener("resize", measureScreen);
    cancelAnimationFrame(raf);
    cursor.el = null;
  };
}

/** A page is about to change: he stays where he is on screen. Taken before
 *  the route swaps, as a shorter new page can clamp the scroll under him. */
export function holdWessel() {
  cursor.hold = cursor.el && cursor.el.dataset.hide !== "true" ? [cursor.x, cursor.y] : null;
}

/** A page change: new generation, fresh marks, he forgets his parking spot
 *  but holds still on screen (like the header) until the new page gives him a job. */
export function newPage() {
  newGeneration();
  cursor.lean = false;
  cursor.anchor = null;
  if (!cursor.hold) holdWessel();
  cursor.drive = null;
}

function newGeneration() {
  generation++;
  cursor.drive = null;
  wessel.press(false);
  selections.clear();
  clearMarks();
  beats.forEach((b) => b.reset?.());
  chain = Promise.resolve();
  busy = false;
}

// ---------- beats ----------
export type BeatFn = (g: number) => Promise<void>;
export type BeatSpec = {
  day: BeatFn;
  /** How much of the section must be in view (0–1). */
  need?: number;
  /** Keep holding the pose after the beat (he doesn't let go). */
  keep?: boolean;
  /** Back to the start state (page change). */
  reset?: () => void;
  /** Paused or reduced motion: no beat runs (DESIGN.md §8). This puts the
   *  section straight into the state the beat would have left it in. */
  still?: () => void;
  /** What he looks over on the way back up. Defaults to the last thing he
   *  selected in the beat. */
  look?: () => HTMLElement | null;
};
type Beat = BeatSpec & {
  el: HTMLElement;
  done?: boolean;
  q?: boolean;
  /** Looked over on this trip up (the beat itself counts). */
  looked?: boolean;
  made?: HTMLElement;
  /** Where he let go after the beat, in page coordinates, and his tag side. */
  spot?: XY;
  lean?: boolean;
};

const beats = new Set<Beat>();
let chain = Promise.resolve();
let busy = false;
let playing: Beat | null = null;
/** True while Wessel is mid-job (entrances can wait a moment). */
export const isBusy = () => busy;

function seen(el: Element, f: number) {
  const r = el.getBoundingClientRect();
  if (!r.height) return false;
  // Mostly across too: a card slid aside in a swipe deck isn't seen.
  if (Math.min(r.right, innerWidth) - Math.max(r.left, 0) < r.width * 0.5) return false;
  return Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) >= Math.min(r.height * f, innerHeight * f);
}

function trigger(b: Beat) {
  const need = b.need ?? wesselMotion.need.default;
  if (b.done && !b.looked && !b.q && scrollDirection < 0 && !calm()) return lookAgain(b, need);
  if (b.done || b.q || !cursor.el) return;
  b.q = true;
  chain = chain.then(async () => {
    b.q = false;
    // Calm: no beat, just its end state, whether or not it's on screen yet.
    if (b.done || !beats.has(b) || (!calm() && !seen(b.el, need))) return;
    b.done = true;
    if (calm()) return b.still?.();
    const g = generation;
    // He always plays his full beat. If you're moving fast he waits a
    // breath; a flick past skips it, and it plays when you come back.
    for (let i = 0; i < wesselMotion.fastScroll.waitMs / 60 && !calm() && scrollPeak > wesselMotion.fastScroll.waitAbovePxPerSec; i++)
      await wait(60);
    if (g !== generation || !beats.has(b) || !b.el.isConnected) return;
    if (!calm() && (scrollPeak > wesselMotion.fastScroll.skipAbovePxPerSec || !seen(b.el, need))) {
      b.done = false;
      // Flicked past: it plays when you come back, or once you stop here.
      setTimeout(() => trigger(b), 500);
      return;
    }
    busy = true;
    playing = b;
    b.looked = true;
    wessel.show();
    try {
      await b.day(g);
    } catch (e) {
      // A section that left mid-beat (page change) just stops.
      if (e !== STALE && b.el.isConnected) console.error(e);
    }
    playing = null;
    busy = false;
    if (g === generation && !b.keep) {
      b.lean = cursor.lean;
      wessel.free();
      b.spot = cursor.anchor ?? undefined;
    }
  });
}

// On the way back up the beats have all played, so he'd only drift after
// you. Instead he checks his work: glides along the top of what he made in
// the section, a dashed box shows what he's looking at, and he parks where
// he let go after the beat. Same fast-scroll rules as a beat.
function lookAgain(b: Beat, need: number) {
  const { fastScroll, look } = wesselMotion;
  b.q = true;
  chain = chain.then(async () => {
    b.q = false;
    if (b.looked || !beats.has(b) || scrollDirection > 0 || calm() || !seen(b.el, need)) return;
    const g = generation;
    for (let i = 0; i < fastScroll.waitMs / 60 && scrollPeak > fastScroll.waitAbovePxPerSec; i++) await wait(60);
    if (g !== generation || !beats.has(b) || !b.el.isConnected) return;
    if (scrollPeak > fastScroll.skipAbovePxPerSec || !seen(b.el, need)) {
      setTimeout(() => trigger(b), 500);
      return;
    }
    b.looked = true;
    const el = b.look?.() ?? b.made;
    const spot = b.spot;
    busy = true;
    try {
      if (el?.isConnected && el.offsetWidth) {
        await wessel.go(wessel.at(el, 0.1, 0.14), { k: look.k });
        live(g);
        select(el, { label: false, look: true, ms: look.selectMs });
        await wessel.go(wessel.at(el, 0.9, 0.14), { k: look.glideK, timeout: look.glideMs });
        live(g);
        await wait(look.holdMs);
        live(g);
      }
      if (spot) await wessel.go(() => [spot[0] - scrollX, spot[1] - scrollY], { k: look.k, lean: b.lean });
    } catch (e) {
      if (e !== STALE) console.error(e);
    }
    busy = false;
    if (g === generation) wessel.free();
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
        // Scrolled down past it: it gets a look-over on your next trip up.
        else if (b?.done && scrollDirection > 0 && e.boundingClientRect.bottom <= 0) b.looked = false;
      }
    },
    { threshold: thresholds },
  );
  const b: Beat = { ...spec, el };
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
  const g = generation;
  const wait = calm() ? 0 : ms;
  setTimeout(() => wessel.show(), wait);
  // No job on the new page after a moment: he stops holding his old spot
  // (which may now be over copy) and goes back to resting.
  setTimeout(() => {
    if (g === generation && !cursor.drive && !busy) cursor.hold = null;
  }, wait + 1200);
}
