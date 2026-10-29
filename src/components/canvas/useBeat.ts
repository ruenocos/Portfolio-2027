"use client";

import { useEffect, useRef } from "react";
import { registerBeat, type BeatSpec } from "@/lib/wessel";

// Gives a section a beat: Wessel's job there.
// The spec is read fresh each time, so it can close over refs.
export function useBeat<T extends HTMLElement>(spec: BeatSpec) {
  const ref = useRef<T>(null);
  const latest = useRef(spec);
  useEffect(() => {
    latest.current = spec;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return registerBeat(el, {
      day: (g) => latest.current.day(g),
      need: latest.current.need,
      keep: latest.current.keep,
      reset: () => latest.current.reset?.(),
      still: () => latest.current.still?.(),
      look: latest.current.look && (() => latest.current.look?.() ?? null),
    });
  }, []);
  return ref;
}
