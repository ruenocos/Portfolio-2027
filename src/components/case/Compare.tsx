"use client";

import { useRef, useState } from "react";
import type { CaseMedia } from "@/content/cases";
import { SIZES, srcSet } from "@/lib/image";

function Pic({ m }: { m: CaseMedia }) {
  // eslint-disable-next-line @next/next/no-img-element -- lib/image does the sizes
  return (
    <img
      src={m.src}
      srcSet={m.src ? srcSet(m.src) : undefined}
      sizes={SIZES.figure}
      alt={m.alt}
      width={m.width}
      height={m.height}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}

/**
 * Before and after in one frame: drag the divider (or use the arrow keys on
 * it); the grape knob is yours.
 */
export function Compare({ before, after, labels }: { before: CaseMedia; after: CaseMedia; labels: [string, string] }) {
  const [at, setAt] = useState(50);
  const box = useRef<HTMLDivElement>(null);

  const move = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setAt(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" && !(e.target as Element).closest(".cknob")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    move(e.clientX);
    const el = e.currentTarget;
    const mv = (ev: PointerEvent) => move(ev.clientX);
    const up = () => {
      el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", mv);
    el.addEventListener("pointerup", up);
  };

  return (
    <figure className="cmp" data-enter>
      <div ref={box} className="cfr" style={{ aspectRatio: `${after.width}/${after.height}` }} onPointerDown={drag}>
        <Pic m={after} />
        <div className="cbefore" style={{ clipPath: `inset(0 ${100 - at}% 0 0)` }}>
          <Pic m={before} />
        </div>
        <span className="clab text-micro-caps" data-side="before" aria-hidden="true">
          {labels[0]}
        </span>
        <span className="clab text-micro-caps" data-side="after" aria-hidden="true">
          {labels[1]}
        </span>
        <div
          className="cdiv"
          style={{ left: `${at}%` }}
          role="slider"
          tabIndex={0}
          aria-label={`${labels[0]} and ${labels[1]}: how much of ${labels[0].toLowerCase()} shows`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(at)}
          onKeyDown={(e) => {
            const d = { ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100 }[e.key];
            if (d == null) return;
            e.preventDefault();
            setAt((v) => Math.max(0, Math.min(100, v + d)));
          }}
        >
          <span className="cknob" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path
                d="M6 4.5 2.5 8 6 11.5M10 4.5 13.5 8 10 11.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </figure>
  );
}
