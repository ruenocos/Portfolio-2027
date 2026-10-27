// Light, dark and night ("purple hour").
// Light and dark follow the system by day. Night wins from sunset to sunrise
// in Amsterdam, whatever the system says (DESIGN.md §3). The visitor can put
// Wessel to bed early or wake him at night; that choice lasts until the sun
// next rises or sets, and only for this visit.

export type Mode = "light" | "dark" | "night";

export const MODE_KEY = "wsl-mode";

// Self-contained on purpose: it's also stringified into the <head> script
// so the right mode is set before the first paint.
export function resolveMode(now: number = Date.now()): { mode: Mode; sunDown: boolean } {
  // Sun altitude for Amsterdam (52.37N 4.90E), after suncalc. No API.
  const rad = Math.PI / 180;
  const d = now / 864e5 - 10957.5;
  const M = rad * (357.5291 + 0.98560028 * d);
  const L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
  const e = rad * 23.4397;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const H = rad * (280.16 + 360.9856235 * d) + rad * 4.9 - ra;
  const phi = rad * 52.37;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const sunDown = alt < rad * -0.833;

  let asleep = sunDown;
  try {
    // Stored as "asleep|sunDown" or "awake|sunDown"; stale once the sun moves on.
    const [choice, at] = (sessionStorage.getItem("wsl-mode") || "").split("|");
    if (at === String(sunDown) && (choice === "asleep" || choice === "awake")) asleep = choice === "asleep";
  } catch {}

  const dark = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
  return { mode: asleep ? "night" : dark ? "dark" : "light", sunDown };
}

export const modeScript = `try{document.documentElement.dataset.mode=(${resolveMode.toString()})().mode}catch(e){}`;
