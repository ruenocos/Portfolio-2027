"use client";

import { useRef } from "react";
import { getMotion } from "@/lib/motion";

// Letter hop: a text link's label springs up letter by letter on hover.
// The house style for every text link (Wons, 2026-10-27). Screen readers
// get the plain text from the hidden copy.
export function Hop({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const go = () => {
    const el = ref.current;
    if (!el || getMotion().calm || el.classList.contains("go")) return;
    el.classList.add("go");
  };
  return (
    <>
      <span className="sr-only">{text}</span>
      <span
        ref={ref}
        className="hop"
        aria-hidden="true"
        onPointerEnter={go}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget.lastElementChild)
            e.currentTarget.classList.remove("go");
        }}
      >
        {[...text].map((ch, i) => (
          <i key={i} style={{ "--i": i } as React.CSSProperties}>
            {ch}
          </i>
        ))}
      </span>
    </>
  );
}
