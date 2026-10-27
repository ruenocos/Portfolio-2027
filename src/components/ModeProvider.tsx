"use client";

import { useEffect, useSyncExternalStore } from "react";
import { MODE_KEY, paintThemeColor, resolveMode, type Mode } from "@/lib/mode";

// The current mode lives on <html data-mode>. This keeps it right while the
// page is open (sunset, system theme changes) and lets the header switch
// put Wessel to bed or wake him.

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn));
const read = () => (document.documentElement.dataset.mode as Mode) || "light";

function apply() {
  const root = document.documentElement;
  const { mode } = resolveMode();
  if (root.dataset.mode === mode) return;
  // Cross-fade every colour token for the length of the mode easing.
  root.classList.add("mode-fade");
  root.dataset.mode = mode;
  paintThemeColor(mode);
  window.setTimeout(() => root.classList.remove("mode-fade"), 900);
  listeners.forEach((fn) => fn());
}

export function setAsleep(asleep: boolean) {
  try {
    sessionStorage.setItem(MODE_KEY, `${asleep ? "asleep" : "awake"}|${resolveMode().sunDown}`);
  } catch {}
  apply();
}

export function useMode(): Mode {
  return useSyncExternalStore(subscribe, read, () => "light");
}

export function ModeProvider() {
  useEffect(() => {
    const system = matchMedia("(prefers-color-scheme: dark)");
    const timer = window.setInterval(apply, 60_000);
    system.addEventListener("change", apply);
    return () => {
      window.clearInterval(timer);
      system.removeEventListener("change", apply);
    };
  }, []);
  return null;
}
