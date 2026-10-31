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
// - between beats he parks where he worked, pinned to the page like a
//   collaborator's cursor in a shared file: your scroll never moves him, the
//   page carries him away with his work; out of view, a marker at the screen
//   edge says where he went, and his next job brings him back in from there
// - he travels like a hand on a mouse: each move is a planned trip on a
//   slightly round curve, timed by its distance; the spring lands him
// - at rest he drifts a pixel or so (CSS only, while his loop sleeps)
// - on the way back up he looks over what he made in each section you pass
//   (a dashed box, no size pill), then parks where he left it; once per trip
// - calm (Pause motion or reduced motion): no travel, end states only

import motionTokens from "../../design/motion-tokens.json";
import { isCalm, subscribeMotion } from "./motion";
import { smileySvg } from "./smiley";
import { bezierAt, clamp, easeInOutCubic, lerp, minJerk } from "./math";
import { headerHeight, narrow } from "./media";
import { getLenis } from "./scroll";

const { wessel: wesselMotion } = motionTokens;
const springs = wesselMotion.spring;
const trips = wesselMotion.trip;

export type XY = [number, number];
type Target = XY | (() => XY | null);
type Spring = { k: number; z: number };

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const calm = isCalm;
const header = headerHeight;

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
const screenHeight = () => screenH || (screenH = innerHeight);
function measureScreen() {
  if (!screenH || !matchMedia("(hover: none)").matches || innerWidth !== screenW) screenH = innerHeight;
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
const clearMarks = () => overlay()?.replaceChildren();

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

// ---------- the visitor's pointer ----------
// Where your mouse last was (screen px), so he can leave alone what you're
// pointing at. Mouse only: a finger isn't resting anywhere.
let visitorAt: XY | null = null;
if (typeof window !== "undefined") {
  addEventListener("pointermove", (e) => void (visitorAt = e.pointerType === "mouse" ? [e.clientX, e.clientY] : null), { passive: true });
  document.addEventListener("mouseleave", () => (visitorAt = null));
}
/** Your pointer is on el (with pad px around it). */
export const pointerOn = (el: Element, pad = 40) => {
  if (!visitorAt) return false;
  const r = el.getBoundingClientRect();
  return visitorAt[0] > r.left - pad && visitorAt[0] < r.right + pad && visitorAt[1] > r.top - pad && visitorAt[1] < r.bottom + pad;
};
/** Your pointer is right of x (screen px). */
export const pointerRightOf = (x: number) => !!visitorAt && visitorAt[0] > x;
/** Waits (up to maxMs) while you're pointing at el: he never works on what you're using. */
export async function waitTillClear(el: Element, maxMs = 1500) {
  const t0 = performance.now();
  while (pointerOn(el) && performance.now() - t0 < maxMs) await wait(100);
}

// ---------- cursor markup (shared with <Cursor>) ----------
// Figma-style multiplayer pointer: a rounded arrowhead, no stem.
// TIP is where it points, in CSS px from its top-left.
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
  aim: null as XY | null,
  /** After a page change: the screen spot he holds until his next job. */
  hold: null as XY | null,
  parked: false,
  shown: false,
  distance: 0,
  speed: 0,
  /** Tag on the left of the pointer, so a parked Wessel covers his own work, not the next column. */
  lean: false,
  /** The move he's on, while it's still on its curve. end is where it goes (screen px). */
  trip: null as { end: XY } | null,
};

// Scroll speed: scrollSpeed now, scrollPeak the recent peak (decays fast).
// scrollDirection: which way you last scrolled (1 down, -1 up).
let lastScrollY = 0;
let scrollSpeed = 0;
let scrollPeak = 0;
let scrollPeakAt = 0;
/** The recent scroll peak, decayed to now: it falls off even while his loop
 *  sleeps (a page change's jump to the top must not hold back every beat). */
const peakNow = () => scrollPeak * Math.pow(0.2, Math.max(0, performance.now() - scrollPeakAt) / 1000);
let scrollDirection = 1;
let raf = 0;
// Quiet frames in a row (no job, settled, page still). After a few the
// loop sleeps, so a parked Wessel costs nothing; wake() restarts it.
let quietFrames = 0;
const SLEEP_AFTER = 12;

/** Restarts his frame loop after it slept. Called by every move, scroll and resize. */
function wake() {
  quietFrames = 0;
  resting(false);
  if (raf || !cursor.el) return;
  catchUp();
  tick.last = 0;
  raf = requestAnimationFrame(tick);
}

// Top speed for stiff springs (drags, snaps, trips), px/s: faster than any
// planned path, slow enough that closing a gap never reads as a jump.
const STIFF_TOP = 4800;
/** Clamped with a soft knee: the last KNEE px before an edge ease into it,
 *  so a target pressing past the edge doesn't pin him flat against it. */
const KNEE = 32;
function softClamp(v: number, lo: number, hi: number) {
  if (hi - lo < KNEE * 2) return clamp(v, lo, hi);
  if (v < lo + KNEE) return lo + KNEE * Math.exp((v - lo - KNEE) / KNEE);
  if (v > hi - KNEE) return hi - KNEE * Math.exp((hi - KNEE - v) / KNEE);
  return v;
}

// Where he goes when he has no job: his parked spot, pinned to the page.
/** How far in from the right edge he parks when he rejoins. */
const parkInset = () => (narrow() ? 32 : 64);

function home(): XY {
  if (cursor.hold) {
    cursor.parked = true;
    return cursor.hold;
  }
  // No spot on this page yet: he takes the resting spot where the page is now.
  cursor.anchor ??= [innerWidth - (narrow() ? 64 : 120) + scrollX, screenHeight() * 0.74 + scrollY];
  cursor.parked = true;
  // A narrower window never leaves his spot off its right edge.
  const x = Math.min(cursor.anchor[0] - scrollX, innerWidth - 16);
  return offText([x, cursor.anchor[1] - scrollY], `p${x},${cursor.anchor[1]},${innerWidth}`);
}

// ---------- keeping off what you read ----------
// His resting spots (parked, after a page change, the spot he starts on) never sit on
// text: once the page is still, the spot is checked against the lines of text
// under his arrow and tag (16px clear), and he steps aside to the nearest
// clear spot. Where no spot is clear (a phone's full-width copy), his tag
// folds away and only the arrow waits in the margin. Jobs point him on
// purpose and aren't moved.
const TEXT = "main :is(p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption,dt,dd), footer :is(p,h1,h2,h3,a)";
const CLEAR = 16;
/** Arrow alone (tag folded): it may wait closer to text, in a margin. */
const ARROW_CLEAR = 8;
type Box = { l: number; r: number; t: number; b: number };
const rest = { key: "", dx: 0, dy: 0 };
let restPending = false;

/** The box his arrow and tag cover with the tip at x, y (screen px). */
function footprint(x: number, y: number, withTag = true): Box {
  if (!withTag) return { l: x - 3 - ARROW_CLEAR, r: x + 20 + ARROW_CLEAR, t: y - 3 - ARROW_CLEAR, b: y + 20 + ARROW_CLEAR };
  // The tag swaps to his left near the right edge (see tick); in the slack
  // band where it could be on either side, both count.
  const room = innerWidth - x - labelW;
  const right = { l: x - 3 - CLEAR, r: x + 17 + labelW + CLEAR, t: y - 3 - CLEAR, b: y + 43 + CLEAR };
  const left = { l: x + 10 - labelW - CLEAR, r: x + 20 + CLEAR, t: y - 3 - CLEAR, b: y + 43 + CLEAR };
  if (cursor.lean || room < 20) return left;
  if (room >= 40) return right;
  return { ...right, l: left.l };
}

/** The line boxes of text between top and bottom (screen px). */
function textLines(top: number, bottom: number) {
  const lines: Box[] = [];
  const range = document.createRange();
  for (const el of document.querySelectorAll(TEXT)) {
    const r = el.getBoundingClientRect();
    if (!r.width || r.bottom < top || r.top > bottom) continue;
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent?.trim()) continue;
      range.selectNodeContents(n);
      for (const q of range.getClientRects())
        if (q.width && q.bottom > top && q.top < bottom) lines.push({ l: q.left, r: q.right, t: q.top, b: q.bottom });
    }
  }
  return lines;
}

/** The nearest spot to at where he covers no text, and whether his tag fits there. */
function clearSpot([x, y]: XY): { at: XY; fold: boolean } {
  const lines = textLines(y - 180, y + 220);
  const hits = (b: Box) => lines.some((q) => q.r > b.l && q.l < b.r && q.b > b.t && q.t < b.b);
  const top = header() + 24;
  const bottom = screenHeight() - 40;
  for (const withTag of [true, false])
    for (const dy of [0, -48, 48, -96, 96]) {
      const cy = y + dy;
      if (dy && (cy < top || cy > bottom)) continue;
      for (let d = 0; d < innerWidth; d += 24)
        for (const cx of d ? [x - d, x + d] : [x])
          if (cx >= 8 && cx <= innerWidth - 22 && !hits(footprint(cx, cy, withTag))) return { at: [cx, cy], fold: !withTag };
    }
  // Nothing clear at all: the arrow waits in the right margin.
  return { at: [innerWidth - 22, y], fold: true };
}

function fold(on: boolean) {
  if (cursor.el && (cursor.el.dataset.fold === "true") !== on) cursor.el.dataset.fold = String(on);
}

/** A resting spot moved off text. key names the spot: it's checked once
 *  the page has been still for a moment, and the step aside is kept while
 *  you scroll, so he never shuffles under a moving page. */
function offText([x, y]: XY, key: string): XY {
  // Not checked yet: keeps his loop awake until it is.
  restPending = key !== rest.key;
  if (restPending && performance.now() - lastScrollAt > 160 && cursor.el) {
    restPending = false;
    const s = clearSpot([x, y]);
    rest.key = key;
    rest.dx = s.at[0] - x;
    rest.dy = s.at[1] - y;
    fold(s.fold);
  }
  return [x + rest.dx, y + rest.dy];
}

let lastTargetY: number | null = null;
let lastTargetX: number | null = null;
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


// ---------- ?wessel=debug ----------
// Logs his state every frame (scripts/check-wessel.mjs reads it) and marks
// his target on screen, so you can see why he moves. Never on by default.
type Frame = { t: number; x: number; y: number; tx: number; ty: number; sy: number; mode: string; out: boolean; trip: boolean };
const debug =
  typeof window !== "undefined" && /[?&]wessel=debug\b/.test(location.search)
    ? { frames: [] as Frame[], ticks: 0, dot: null as HTMLElement | null }
    : null;
if (debug) (window as unknown as { __wessel: unknown }).__wessel = Object.assign(debug, { rest, spot: () => clearSpot([cursor.x, cursor.y]) });
function logFrame(t: number, tx: number, ty: number, mode: string) {
  if (!debug || !cursor.el) return;
  debug.ticks++;
  const out = cursor.el.dataset.hide === "true" || cursor.el.dataset.tuck === "true" || !cursor.el.offsetParent;
  if (debug.frames.length < 50000) debug.frames.push({ t, x: cursor.x, y: cursor.y, tx, ty, sy: scrollY, mode, out, trip: !!cursor.trip });
  if (!debug.dot) {
    debug.dot = document.createElement("div");
    debug.dot.style.cssText =
      "position:fixed;left:0;top:0;z-index:99;width:10px;height:10px;margin:-5px 0 0 -5px;border:2px solid var(--tang);border-radius:50%;pointer-events:none;font:11px monospace;color:var(--tang);white-space:nowrap;text-indent:14px;line-height:6px";
    document.body.appendChild(debug.dot);
  }
  debug.dot.style.transform = `translate(${tx}px,${ty}px)`;
  debug.dot.textContent = mode;
}

/** Scroll bookkeeping (speed, direction, when it last moved): every frame
 *  while his loop runs, and from the scroll event while it sleeps, so the
 *  beats' fast-scroll and look-over rules never read stale values.
 *  Returns how far the page moved since the last call. */
function trackScroll(now: number, dt: number) {
  const scrolled = scrollY - lastScrollY;
  lastScrollY = scrollY;
  if (Math.abs(scrolled) > 0.5) {
    scrollDirection = Math.sign(scrolled);
    lastScrollAt = now;
  }
  // Smoothed the same at 60 and 120 frames a second.
  scrollSpeed += (Math.abs(scrolled) / dt - scrollSpeed) * (1 - Math.pow(0.8, dt * 60));
  scrollPeak = Math.max(scrollSpeed, peakNow());
  scrollPeakAt = performance.now();
  return scrolled;
}
let trackedAt = 0;
/** Asleep, the page carries him but nothing moves his screen spot: it
 *  catches up here, before a scroll or a job reads it. A job can wake him
 *  before the scroll event that moved the page has fired. */
function catchUp() {
  if (raf) return;
  const now = performance.now();
  const dt = Math.min(0.1, Math.max(0.004, (now - (trackedAt || now - 16)) / 1000));
  trackedAt = now;
  cursor.y -= trackScroll(now, dt);
}

function tick(frameTime: number) {
  const el = cursor.el;
  if (!el) {
    raf = 0;
    return;
  }
  const dt = Math.min(0.033, (frameTime - (tick.last || frameTime)) / 1000) || 0.016;
  tick.last = frameTime;
  // Lenis moves the page in its own frame callback. If that ran after this
  // one, he'd be drawn for the old scroll and the page would move under him
  // for a frame (a one-frame hop). Stepping it first settles the scroll for
  // this frame; its own call later in the frame then has nothing left to do.
  getLenis()?.raf(frameTime);
  const scrolled = trackScroll(frameTime, dt);
  const still = calm();

  let target = cursor.drive?.() ?? null;
  const driving = !!target;
  // A job that pauses (the case read panel once the read is behind you)
  // leaves him parked where it last pointed, not back at an old spot.
  if (!target && cursor.drive && cursor.aim) cursor.anchor = cursor.aim;
  // A job that scrolls away: he reaches for it from the edge instead of leaving
  // (easing into the edge, so he doesn't press flat against it).
  // Never on the sticky header: his target stays below it.
  // (A trip clamps its own end: its curve may start off screen.)
  // The page carries him exactly as far as it carried his target this frame:
  // all the way in the open, not at all while the edge holds it (carried by
  // a fast scroll and pulled back to the edge, he'd jolt).
  let carried = -scrolled;
  if (target && !cursor.trip) {
    const lo = header() + 24;
    const hi = screenHeight() - 40;
    const y = softClamp(target[1], lo, hi);
    carried = y - softClamp(target[1] + scrolled, lo, hi);
    target = [target[0], y];
  }
  restPending = false;
  if (target) {
    fold(false);
    rest.key = "";
  } else target = home();
  const [tx, ty] = target;
  const parked = !driving && cursor.parked;
  // Where his job last pointed him, in page coordinates: if he's let go
  // before he's there (a step timed out), that's still where he parks.
  if (driving) {
    const [ax, ay] = cursor.trip?.end ?? target;
    cursor.aim = [ax + scrollX, ay + scrollY];
  }

  // The page drags him a little; he resists and catches up. Not when his
  // job holds still on screen while you scroll (a sticky panel): then he
  // stays put with it instead of bobbing up and back.
  const pinned = driving && lastTargetY !== null && Math.abs(ty - lastTargetY) < 0.5;
  const targetStill = pinned && lastTargetX !== null && Math.abs(tx - lastTargetX) < 0.5;
  lastTargetY = driving ? ty : null;
  lastTargetX = driving ? tx : null;
  // After a page change he holds his spot on screen, like the header.
  const holding = !driving && !!cursor.hold;
  // The page carries him like its content. On a trip the curve alone places
  // him: carried by the page and pulled back by the trip's stiff spring, a
  // fast scroll would jolt him.
  if (!still && !pinned && !holding && !cursor.trip) cursor.y += carried;
  // Settled on this frame's target (a new target, like a job ending, is not).
  const settled = Math.hypot(cursor.x - tx, cursor.y - ty) < 0.5 && cursor.speed < 4;
  if (still || holding || (parked && settled)) {
    // At rest on his spot: he holds it exactly (the page carries him).
    cursor.x = tx;
    cursor.y = ty;
    cursor.vx = cursor.vy = 0;
  } else {
    // Landing on his parking spot after a job: he glides there, no jump.
    const spring = driving ? cursor.spring : springs.free;
    // A fast scroll stiffens his spring so he keeps up; drags and snaps are
    // stiff already, and boosted on a flick they'd yank him across the screen.
    const boost = spring.k < 1000 ? Math.min(springs.maxBoost, 1 + scrollSpeed / springs.boostPerPxSec) : 1;
    const stiffness = spring.k * boost;
    const stiffnessY = stiffness * springs.yScale;
    // Not on a drag: that path is already eased and must stay on it.
    const hand = spring.k < 1000 ? (narrow() ? wesselMotion.hand.phone : wesselMotion.hand.desktop) : null;
    // Small steps: a stiff spring (a drag, a fast scroll) on a slow frame
    // would otherwise overshoot further each frame and fling him away.
    const steps = Math.ceil((dt * Math.sqrt(stiffnessY)) / 0.25);
    const step = dt / steps;
    const [x0, y0] = [cursor.x, cursor.y];
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
    if (!hand) {
      // A drag's own path never moves this fast; only a gap does (its target
      // flung across the screen by a hard flick), and closing that in one
      // frame reads as a jump. He covers it over a few frames instead.
      const max = STIFF_TOP * dt;
      const moved = Math.hypot(cursor.x - x0, cursor.y - y0);
      if (moved > max) {
        cursor.x = x0 + ((cursor.x - x0) * max) / moved;
        cursor.y = y0 + ((cursor.y - y0) * max) / moved;
        cursor.vx *= max / moved;
        cursor.vy *= max / moved;
      }
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
  if (debug) logFrame(frameTime, tx, ty, driving ? "job" : still ? "calm" : holding ? "hold" : "park");
  // A job that holds him still outside a beat (the case read panel resting
  // him beside your layer) counts as quiet too: scroll and the next move wake him.
  const quiet = (!driving || (targetStill && !busy)) && !restPending && Math.abs(scrolled) < 0.5 && cursor.distance < 0.5 && cursor.speed < 4;
  quietFrames = quiet ? quietFrames + 1 : 0;
  raf = quietFrames > SLEEP_AFTER ? 0 : requestAnimationFrame(tick);
  // Asleep: the CSS drift takes over (components.css), never in calm.
  if (!raf && !still) resting(true);
}

function resting(on: boolean) {
  if (cursor.el && (cursor.el.dataset.rest === "true") !== on) cursor.el.dataset.rest = String(on);
}
tick.last = 0;

/** Turns a move into a planned trip: he follows a slightly round curve from
 *  where he is to the target, timed by its distance, then his spring (k)
 *  lands him. The curve starts where he is on screen; its end tracks the target. */
function plan(to: () => XY | null, k: number) {
  const end = to();
  if (!end) return;
  const distance = Math.hypot(end[0] - cursor.x, end[1] - cursor.y);
  if (distance < trips.from) return;
  // A softer spring asked for a slower move; a stiffer one a quicker move.
  const ms =
    clamp(trips.baseMs + trips.perDoublingMs * Math.log2(distance / trips.from + 1), trips.minMs, trips.maxMs) *
    clamp(Math.sqrt(springs.beat.k / k), 0.7, 1.4);
  // The start rides with the page, so a scroll mid-trip doesn't kink the curve.
  const a0: XY = [cursor.x, cursor.y + scrollY];
  const t0 = performance.now();
  const angle = (trips.arcDeg * Math.PI) / 180;
  const along = Math.cos(angle) / 3;
  const across = Math.sin(angle) / 3;
  const trip = { end };
  cursor.trip = trip;
  cursor.spring = { k: trips.k, z: trips.z };
  cursor.drive = () => {
    const t1 = to();
    if (!t1) return null;
    const e: XY = [t1[0], softClamp(t1[1], header() + 24, screenHeight() - 40)];
    trip.end = e;
    const t = (performance.now() - t0) / ms;
    if (t >= 1 || cursor.trip !== trip || calm()) {
      if (cursor.trip === trip) {
        cursor.trip = null;
        cursor.spring = { k, z: springs.beat.z };
      }
      return e;
    }
    // Both handles a third of the way along, turned the same way off the
    // line: the path swings out a little and comes in straight.
    const a: XY = [a0[0], a0[1] - scrollY];
    const dx = e[0] - a[0];
    const dy = e[1] - a[1];
    const h1 = [a[0] + dx * along + dy * across, a[1] + dy * along - dx * across];
    const h2 = [e[0] - dx * along + dy * across, e[1] - dy * along - dx * across];
    const [x, y] = bezierAt(minJerk(Math.max(0, t)), a, h1, h2, e);
    // The swing out never takes him past the side of the screen.
    return [clamp(x, 12, innerWidth - 12), y];
  };
}

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
    wake();
    cursor.lean = lean;
    const to = typeof target === "function" ? target : () => target;
    cursor.drive = to;
    cursor.spring = { k, z: springs.beat.z };
    cursor.trip = null;
    const t = to();
    // Lost off screen: he comes back in from the edge he left by, at the
    // spot along it where he went out (never somewhere new).
    if (t && !calm() && cursor.shown && (cursor.y < -60 || cursor.y > screenHeight() + 60)) {
      cursor.y = cursor.y < 0 ? -40 : screenHeight() + 40;
      cursor.x = clamp(cursor.x, 20, innerWidth - 20);
      cursor.vx = cursor.vy = 0;
    }
    if (t && !calm() && k < 1000) plan(to, k);
    return new Promise<void>((res) => {
      const t0 = performance.now();
      const check = () => {
        if (calm() || (!cursor.trip && cursor.distance < 2 && cursor.speed < 14) || performance.now() - t0 > timeout) res();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  },

  /** Drags from a to b over ms; step(e) runs with the eased progress. */
  drag(a: () => XY, b: () => XY, ms: number, step?: (e: number) => void) {
    return new Promise<void>((res) => {
      const t0 = performance.now();
      // The drive keeps holding b until his next move, but step stops at the
      // end: a beat that resets its object after the drag (the photo stack's
      // toss) would otherwise be pulled back to the drag's end every frame.
      let ended = false;
      wake();
      cursor.trip = null;
      cursor.spring = { k: 1400, z: springs.beat.z };
      cursor.drive = () => {
        const e = easeInOutCubic(calm() ? 1 : clamp((performance.now() - t0) / ms));
        if (!ended) step?.(e);
        ended = e >= 1;
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
    wake();
    cursor.drive = null;
    cursor.trip = null;
    cursor.lean = false;
    wessel.press(false);
    cursor.hold = null;
    cursor.anchor = cursor.aim ?? [cursor.x + scrollX, cursor.y + scrollY];
    cursor.aim = null;
    // He's parked where he let go (no slack yet: that's for coming back).
    cursor.parked = true;
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
    wake();
  },

  /** Back off-screen right, so his next move glides in from the edge. */
  offstage() {
    cursor.x = innerWidth + 80;
    cursor.y = screenHeight() * 0.5;
    cursor.vx = cursor.vy = 0;
    // Written now, so the frame before his next tick doesn't show the old spot.
    if (cursor.el) draw(cursor.el);
    wake();
  },

  show() {
    if (cursor.shown || !cursor.el) return;
    cursor.shown = true;
    cursor.el.dataset.hide = "false";
  },
};

// ---------- out of view: a marker at the screen edge ----------
// Parked off screen, he'd be gone without a trace: a small tag at the top or
// bottom edge, above or below where he is, says where he went. An
// IntersectionObserver tells when he leaves and which way, so scrolling
// costs nothing here either.
function watchEdge(el: HTMLElement, edge: HTMLElement) {
  let last: { isIntersecting: boolean; boundingClientRect: DOMRectReadOnly } | null = null;
  const show = (e: { isIntersecting: boolean; boundingClientRect: DOMRectReadOnly }) => {
    last = e;
    const r = e.boundingClientRect;
    // Off to the side (waiting offstage before his entrance) isn't out of
    // view; calm keeps the page quiet, so no tag there either.
    const away = !e.isIntersecting && r.right > 0 && r.left < innerWidth && el.dataset.hide !== "true" && !calm();
    // The side stays put while it fades out, so it never jumps edges on the way.
    if (away) {
      edge.dataset.side = r.top < header() ? "up" : "down";
      // Phones: the arrow alone, in the side gutter nearest him (the copy
      // runs edge to edge, a tag would sit on it).
      // Desktop: at his x, kept inside the content column by the CSS.
      edge.style.setProperty("--x", narrow() ? `${r.left < innerWidth / 2 ? 4 : innerWidth - 22}px` : `${r.left}px`);
      edge.style.setProperty("--w", `${edge.offsetWidth}px`);
    }
    if (edge.dataset.on !== String(away)) edge.dataset.on = String(away);
  };
  const io = new IntersectionObserver(([e]) => show(e), { rootMargin: `${-header()}px 0px 0px 0px` });
  // His arrow decides: tucked under the header with only his name showing,
  // he's gone as far as you can tell, so the tag shows.
  const arrow = el.querySelector(".ptr") ?? el;
  io.observe(arrow);
  // A resize or a switch to calm changes where (or whether) the tag goes.
  const again = () => {
    if (!last) return;
    const r = arrow.getBoundingClientRect();
    show({ isIntersecting: r.bottom > header() && r.top < innerHeight, boundingClientRect: r });
  };
  // After a resize he re-parks over a few frames: place it again once he has.
  let settle = 0;
  const resized = () => {
    again();
    clearTimeout(settle);
    settle = window.setTimeout(again, 600);
  };
  addEventListener("resize", resized);
  const off = subscribeMotion(again);
  // Hidden (a case page on phones) without leaving the screen: the observer
  // won't hear of it.
  const hidden = new MutationObserver(again);
  hidden.observe(el, { attributes: true, attributeFilter: ["data-hide"] });
  return () => {
    io.disconnect();
    hidden.disconnect();
    clearTimeout(settle);
    removeEventListener("resize", resized);
    off();
  };
}

/** <CursorLayer> hands over his element (and the edge marker); returns the cleanup. */
export function attachWessel(el: HTMLElement, edge?: HTMLElement | null) {
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
  const wakeOnResize = () => {
    measureScreen();
    // A narrower window makes the page longer or shorter: his parked spot
    // stays on the page and on screen.
    if (cursor.anchor) {
      const end = document.documentElement.scrollHeight - 60;
      cursor.anchor = [Math.min(cursor.anchor[0], innerWidth - 16 + scrollX), Math.min(cursor.anchor[1], end)];
    }
    wake();
  };
  addEventListener("resize", wakeOnResize);
  // Parked and settled, the page carries him and scrolling needs no frames.
  // On a job, landing, or holding his screen spot after a page change, it does.
  const wakeOnScroll = () => {
    catchUp();
    if (cursor.drive || cursor.hold || !cursor.parked || cursor.distance >= 0.5 || cursor.speed >= 4) wake();
  };
  addEventListener("scroll", wakeOnScroll, { passive: true });
  // Out of view with no job on the way and the page has come to rest: he
  // rejoins you, a short trip in from the edge he went out by at his x, and
  // parks pinned again just inside it. Never while you scroll. In calm he's
  // simply there (no travel).
  let rejoinSoon = 0;
  let rejoinedAt = -Infinity;
  const rejoin = () => {
    catchUp();
    const H = screenHeight();
    if (cursor.drive || cursor.hold || !cursor.shown || el.dataset.hide === "true") return;
    // Only once he's well out of view: just tucked under an edge, the tag
    // says where he is and a hop back at every stop would read as a tic.
    const top = header();
    const out = Math.max(top - cursor.y, cursor.y - H);
    if (out <= 0 || (!calm() && out < (H - top) * wesselMotion.park.rejoinOut)) return;
    // Not at every stop: once he's caught up, he lets you read a while, then
    // comes back if you're still there. (In calm he can't travel or show a
    // tag, so he's always just there.)
    // Held back, he waits for your next stop, or comes anyway if you've
    // stayed put a long while (arriving mid-read reads as barging in).
    const since = performance.now() - rejoinedAt;
    if (!calm() && since < wesselMotion.park.rejoinCooldownMs) {
      rejoinSoon = window.setTimeout(rejoin, wesselMotion.park.rejoinFallbackMs - wesselMotion.park.rejoinMs);
      return;
    }
    rejoinedAt = performance.now();
    // Deep enough in that the next small scroll doesn't tuck him away again.
    // In calm he doesn't travel, so he can take the far side: the one your
    // scroll moves him away from last.
    const fromTop = cursor.y < top;
    const y = top + (H - top) * (calm() ? (fromTop ? 0.85 : 0.38) : fromTop ? 0.38 : 0.72);
    // He comes in down the right edge (the margin on desktop), off the work
    // and the copy; his own x is often the image column.
    const x = innerWidth - parkInset();
    if (!calm()) cursor.x = x;
    cursor.anchor = [x + scrollX, y + scrollY];
    if (calm()) {
      // No travel in calm: he fades in at the spot (a fade isn't motion).
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: "ease-out" });
      return wake();
    }
    const trip = wessel.go(() => home(), { timeout: 1600 });
    const drive = cursor.drive;
    // A job that starts on the way takes over; otherwise he parks on arrival.
    trip.then(() => cursor.drive === drive && wessel.free());
  };
  const rejoinLater = () => {
    clearTimeout(rejoinSoon);
    rejoinSoon = window.setTimeout(rejoin, wesselMotion.park.rejoinMs);
  };
  addEventListener("scroll", rejoinLater, { passive: true });
  // Pause can leave him far off screen mid-beat.
  const offRejoin = subscribeMotion(rejoinLater);
  const unwatch = edge ? watchEdge(el, edge) : () => {};
  // A font swap can change his tag's width.
  document.fonts?.ready.then(() => (measureLabel(), wake()));
  raf = 0;
  wake();
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
  const offWake = subscribeMotion(wake);
  return () => {
    off();
    offWake();
    removeEventListener("resize", wakeOnResize);
    removeEventListener("scroll", wakeOnScroll);
    removeEventListener("scroll", rejoinLater);
    offRejoin();
    clearTimeout(rejoinSoon);
    unwatch();
    cancelAnimationFrame(raf);
    raf = 0;
    cursor.el = null;
  };
}

/** A page is about to change: he stays where he is on screen. Taken before
 *  the route swaps, as a shorter new page can clamp the scroll under him. */
export function holdWessel() {
  wake();
  cursor.hold = cursor.el && cursor.el.dataset.hide !== "true" ? [cursor.x, cursor.y] : null;
}

/** A page change: new generation, fresh marks, he forgets his parking spot
 *  but holds still on screen (like the header) until the new page gives him a job. */
export function newPage() {
  newGeneration();
  // The jump to the new page's top isn't you scrolling.
  scrollSpeed = scrollPeak = 0;
  lastScrollY = scrollY;
  wake();
  cursor.lean = false;
  cursor.anchor = null;
  if (!cursor.hold) holdWessel();
  cursor.drive = null;
}

function newGeneration() {
  generation++;
  cursor.drive = null;
  cursor.trip = null;
  cursor.aim = null;
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
    for (let i = 0; i < wesselMotion.fastScroll.waitMs / 60 && !calm() && peakNow() > wesselMotion.fastScroll.waitAbovePxPerSec; i++)
      await wait(60);
    if (g !== generation || !beats.has(b) || !b.el.isConnected) return;
    if (!calm() && (peakNow() > wesselMotion.fastScroll.skipAbovePxPerSec || !seen(b.el, need))) {
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
    for (let i = 0; i < fastScroll.waitMs / 60 && peakNow() > fastScroll.waitAbovePxPerSec; i++) await wait(60);
    if (g !== generation || !beats.has(b) || !b.el.isConnected) return;
    if (peakNow() > fastScroll.skipAbovePxPerSec || !seen(b.el, need)) {
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
  // No job on the new page after a moment: the spot he held becomes his
  // parked spot on this page (he steps aside if it's on copy), instead of
  // drifting off to a resting spot that has nothing to do with the page.
  setTimeout(() => {
    if (g === generation && !cursor.drive && !busy) {
      if (cursor.hold) cursor.anchor = [cursor.hold[0] + scrollX, cursor.hold[1] + scrollY];
      cursor.hold = null;
      wake();
    }
  }, wait + 1200);
}
