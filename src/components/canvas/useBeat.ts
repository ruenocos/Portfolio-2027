"use client";

import { useEffect, useRef } from "react";
import { registerBeat, type BeatSpec } from "@/lib/wessel";

// Gives a section a beat: Wessel's job by day, a bot's chore by night.
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
      night: latest.current.night && ((g) => latest.current.night!(g)),
      need: latest.current.need,
      keep: latest.current.keep,
      reset: () => latest.current.reset?.(),
      still: (m) => latest.current.still?.(m),
    });
  }, []);
  return ref;
}
