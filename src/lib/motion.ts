// The motion store: one place that knows whether things may move.
// paused  = the visitor pressed Pause motion (WCAG 2.2.2). Remembered for the
//           visit in localStorage, on every page.
// reduced = the system asks for reduced motion.
// calm    = either of them: end states, no travel, no entrances, posters
//           instead of loops (DESIGN.md §8). Colour changes still fade.
//
// <html> mirrors it before the first paint (see motionScript), so CSS can
// read it too: .pz while paused, data-motion="calm" while calm.

export const PAUSE_KEY = "wsl-pause";

export type MotionState = { paused: boolean; reduced: boolean; calm: boolean };

const SERVER: MotionState = { paused: false, reduced: false, calm: false };
let state: MotionState = SERVER;
let started = false;
const listeners = new Set<() => void>();

function readPaused() {
  try {
    return localStorage.getItem(PAUSE_KEY) === "1";
  } catch {
    return false;
  }
}

function commit(paused: boolean, reduced: boolean) {
  if (paused === state.paused && reduced === state.reduced && state !== SERVER) return;
  state = { paused, reduced, calm: paused || reduced };
  const root = document.documentElement;
  root.classList.toggle("pz", paused);
  root.dataset.motion = state.calm ? "calm" : "full";
  listeners.forEach((fn) => fn());
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  commit(readPaused(), query.matches);
  query.addEventListener("change", () => commit(state.paused, query.matches));
  // Another tab pressed Pause.
  addEventListener("storage", (e) => e.key === PAUSE_KEY && commit(readPaused(), state.reduced));
}

export function subscribeMotion(fn: () => void) {
  start();
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export const getMotion = () => (start(), state);
export const getServerMotion = () => SERVER;

export function setPaused(paused: boolean) {
  start();
  try {
    if (paused) localStorage.setItem(PAUSE_KEY, "1");
    else localStorage.removeItem(PAUSE_KEY);
  } catch {}
  commit(paused, state.reduced);
  announce(paused ? "Motion paused" : "Motion back on");
}

// One polite live region for the whole site (it sits in the root layout).
export function announce(text: string) {
  const live = document.getElementById("live");
  if (!live) return;
  // Clear first so the same message twice is read twice.
  live.textContent = "";
  window.setTimeout(() => (live.textContent = text), 40);
}

// Runs in <head> before the first paint, next to the mode script.
// "entering" hides the first screen until the house entrance picks it up;
// it removes itself after 1.5s in case scripts never run.
export const motionScript = `try{var h=document.documentElement,p=localStorage.getItem("${PAUSE_KEY}")==="1",r=matchMedia("(prefers-reduced-motion: reduce)").matches;h.classList.toggle("pz",p);h.dataset.motion=p||r?"calm":"full";if(!p&&!r&&!h.dataset.boot){h.classList.add("entering");setTimeout(function(){h.classList.remove("entering")},1500)}}catch(e){}`;
