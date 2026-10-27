"use client";

import { setAsleep } from "@/components/ModeProvider";
import { useMotion } from "@/components/useMotion";

// Puts Wessel to bed or wakes him. Grape: it's yours to touch.
export function DayNight() {
  const { asleep } = useMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={asleep}
      aria-label="Night mode"
      className="dn"
      onClick={() => setAsleep(!asleep)}
    >
      <i className="k" aria-hidden="true" />
      <svg className="i sun" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="3" fill="currentColor" />
        <path
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M3.2 12.8l1.1-1.1M11.7 4.3l1.1-1.1"
        />
      </svg>
      <svg className="i moon" viewBox="0 0 16 16" aria-hidden="true">
        <path fill="currentColor" d="M10.6 1.4a6.6 6.6 0 1 0 4 10.4A5.6 5.6 0 0 1 10.6 1.4z" />
      </svg>
    </button>
  );
}
