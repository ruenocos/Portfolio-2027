"use client";

import { useEffect, useSyncExternalStore } from "react";
import motionTokens from "../../design/motion-tokens.json";
import { MODE_KEY, paintThemeColor, resolveMode, type Mode } from "@/lib/mode";

// The current mode lives on <html data-mode>. This keeps it in step with
// the system theme while the page is open, and lets the header switch
// pick one for good.

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn));
const read = () => (document.documentElement.dataset.mode as Mode) || "light";

function apply() {
  const root = document.documentElement;
  const mode = resolveMode();
  if (root.dataset.mode === mode) return;
  // Cross-fade the colour tokens for the length of the mode easing (globals.css).
  root.classList.add("mode-fade");
  root.dataset.mode = mode;
  paintThemeColor(mode);
  window.setTimeout(() => root.classList.remove("mode-fade"), motionTokens.easing.mode.ms);
  listeners.forEach((fn) => fn());
}

/** The header switch. Picking what the system already says forgets the choice. */
export function setMode(mode: Mode) {
  try {
    const system = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    if (mode === system) localStorage.removeItem(MODE_KEY);
    else localStorage.setItem(MODE_KEY, mode);
  } catch {}
  apply();
}

export function useMode(): Mode {
  return useSyncExternalStore(subscribe, read, () => "light");
}

export function ModeProvider() {
  useEffect(() => {
    // A page rendered in the browser after a server error or a not-found
    // (its <head> scripts never ran) starts on the default: set it straight.
    const root = document.documentElement;
    const mode = resolveMode();
    if (root.dataset.mode !== mode) {
      root.dataset.mode = mode;
      paintThemeColor(mode);
      listeners.forEach((fn) => fn());
    }
    const system = matchMedia("(prefers-color-scheme: dark)");
    system.addEventListener("change", apply);
    return () => system.removeEventListener("change", apply);
  }, []);
  return null;
}
