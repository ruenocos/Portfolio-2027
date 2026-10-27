"use client";

import { setPaused } from "@/lib/motion";
import { useMotion } from "@/components/useMotion";

// Pause motion (WCAG 2.2.2): stops everything that moves by itself, on every
// page, for the rest of the visit. Status goes to the live region.
export function PauseButton() {
  const { paused } = useMotion();
  const label = paused ? "Play motion" : "Pause motion";
  return (
    <button
      type="button"
      className="pzb"
      aria-pressed={paused}
      aria-label={label}
      onClick={() => setPaused(!paused)}
    >
      {paused ? (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4.5 2.9v10.2c0 .6.6.9 1.1.6l8-5.1c.5-.3.5-.9 0-1.2l-8-5.1c-.5-.3-1.1 0-1.1.6z" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
          <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
        </svg>
      )}
      <span className="tip" aria-hidden="true">
        {label}
      </span>
    </button>
  );
}
