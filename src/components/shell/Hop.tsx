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
        {/* Letters sit in word groups, so a wrap never splits a word. */}
        {text.split(/(\s+)/).map((word, w, all) => {
          if (/^\s+$/.test(word)) return word;
          const start = all.slice(0, w).join("").length;
          return (
            <span key={w} className="hw">
              {[...word].map((ch, i) => (
                <i key={i} style={{ "--i": start + i } as React.CSSProperties}>
                  {ch}
                </i>
              ))}
            </span>
          );
        })}
      </span>
    </>
  );
}
