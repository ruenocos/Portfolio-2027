"use client";

import { useEffect, useSyncExternalStore } from "react";

// PREVIEW ONLY (PR for the project-card hover pick): a switch between the
// three card hovers. Remove with the losing variants once Wons picks.
const PICKS = [
  { id: "a", label: "A Pick up" },
  { id: "b", label: "B Select" },
  { id: "c", label: "C Comment" },
] as const;
const KEY = "wsl-hover";

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn));
const read = () => document.documentElement.dataset.hover || "a";

function choose(id: string) {
  document.documentElement.dataset.hover = id;
  try {
    sessionStorage.setItem(KEY, id);
  } catch {}
  listeners.forEach((fn) => fn());
}

export function HoverPick() {
  const pick = useSyncExternalStore(subscribe, read, () => "a");
  useEffect(() => {
    let p = new URLSearchParams(location.search).get("hover");
    try {
      p ||= sessionStorage.getItem(KEY);
    } catch {}
    choose(PICKS.some((x) => x.id === p) ? p! : "a");
  }, []);
  return (
    <div className="hpick" role="group" aria-label="Card hover preview">
      {PICKS.map((x) => (
        <button key={x.id} type="button" aria-pressed={pick === x.id} onClick={() => choose(x.id)} className="text-micro-caps">
          {x.label}
        </button>
      ))}
    </div>
  );
}
