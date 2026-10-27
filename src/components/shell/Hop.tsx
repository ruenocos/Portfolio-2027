"use client";

import { useRef } from "react";
import { getMotion } from "@/lib/motion";

// Letter hop: a text link's label springs up letter by letter on hover.
// The house style for every text link (Wons, 2026-10-27). Screen readers
// get the plain text from the hidden copy.
// Words as lists of [letter, stagger index]; the spaces between stay strings.
// One running count per code point, so the stagger has no gaps.
function groups(text: string): (string | [string, number][])[] {
  let n = 0;
  return text.split(/(\s+)/).map((part) => (/^\s*$/.test(part) ? part : [...part].map((ch): [string, number] => [ch, n++])));
}

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
          const letters = e.currentTarget.querySelectorAll("i");
          if (e.target === letters[letters.length - 1]) e.currentTarget.classList.remove("go");
        }}
      >
        {/* Letters sit in word groups, so a wrap never splits a word. */}
        {groups(text).map((g, w) =>
          typeof g === "string" ? (
            g
          ) : (
            <span key={w} className="hw">
              {g.map(([ch, i]) => (
                <i key={i} style={{ "--i": i } as React.CSSProperties}>
                  {ch}
                </i>
              ))}
            </span>
          ),
        )}
      </span>
    </>
  );
}
