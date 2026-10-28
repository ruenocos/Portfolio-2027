// PREVIEW ONLY (polish pass): switches for the ideas Wons is picking from.
// Each idea is "now" (the live site) or a variant; the pick sits on <html>
// as data-t-<key> so CSS can follow it, and lasts the browser session.
// Remove with the losing variants once Wons picks.

export const TRIES = [
  { key: "menu", label: "Phone menu", opts: [["now", "Now"], ["sheet", "Thumb sheet"]] },
  { key: "pill", label: "Contact pill", opts: [["now", "Now"], ["sheet", "Quick sheet"]] },
  { key: "back", label: "Second visit", opts: [["off", "Off"], ["a", "A"], ["b", "B"], ["c", "C"]] },
  { key: "away", label: "Away tab", opts: [["off", "Off"], ["a", "A"], ["b", "B"], ["c", "C"]] },
  { key: "lost", label: "404", opts: [["now", "Now"], ["beat", "Wessel beat"]] },
  { key: "chips", label: "Work tool chips", opts: [["now", "Now"], ["flat", "One tone"]] },
  { key: "arrow", label: "Row arrow", opts: [["now", "Now"], ["grape", "Grape"]] },
  { key: "lift", label: "Filter chip hover", opts: [["now", "Now"], ["on", "Lift"]] },
  { key: "dim", label: "Dark mode pictures", opts: [["now", "Now"], ["on", "Dimmed"]] },
  { key: "fade", label: "Theme switch", opts: [["now", "0.9s"], ["fast", "0.6s"]] },
  { key: "head", label: "Phone header", opts: [["now", "Now"], ["slim", "Slim on scroll"]] },
] as const;

export type TryKey = (typeof TRIES)[number]["key"];

/** Proposed copy, marked mock until Wons picks the words. */
export const BACK_LINES = { a: "Welcome back!", b: "Back again?", c: "Oh hey, you again" } as const;
export const AWAY_LINES = { a: "Still here", b: "Saved your spot", c: "Wessel is waiting" } as const;

const KEY = "wsl-try";
const listeners = new Set<() => void>();
export const subscribeTry = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn));

const first = (k: TryKey) => TRIES.find((t) => t.key === k)!.opts[0][0];
export const getTry = (k: TryKey): string =>
  typeof document === "undefined" ? first(k) : document.documentElement.getAttribute(`data-t-${k}`) || first(k);

export function setTry(k: TryKey, v: string) {
  document.documentElement.setAttribute(`data-t-${k}`, v);
  try {
    const all = JSON.parse(sessionStorage.getItem(KEY) || "{}");
    all[k] = v;
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
  listeners.forEach((fn) => fn());
}

/** Session picks, then ?try=menu.sheet,pill.sheet on top. */
export function loadTries() {
  let all: Record<string, string> = {};
  try {
    all = JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {}
  const q = new URLSearchParams(location.search).get("try");
  q?.split(",").forEach((p) => {
    const [k, v] = p.split(".");
    if (k && v) all[k] = v;
  });
  for (const t of TRIES) {
    const v = all[t.key];
    if (v && t.opts.some(([o]) => o === v)) setTry(t.key, v);
  }
}
