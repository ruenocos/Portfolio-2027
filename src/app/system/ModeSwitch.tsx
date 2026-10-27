"use client";

import { setAsleep, useMode } from "@/components/ModeProvider";

// Temporary stand-in for the header's day/night switch.
export function ModeSwitch() {
  const mode = useMode();
  const asleep = mode === "night";
  return (
    <button
      type="button"
      aria-pressed={asleep}
      onClick={() => setAsleep(!asleep)}
      className="text-label rounded-pill border border-line bg-fill px-4 min-h-tap transition-colors duration-[var(--dur-ui)] ease-ui hover:border-grape"
    >
      Now: {mode} · {asleep ? "Wake Wessel" : "Put Wessel to bed"}
    </button>
  );
}
