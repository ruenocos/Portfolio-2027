"use client";

import { useEffect, useRef } from "react";
import { useMotion } from "@/components/useMotion";
import { FACE, FEATURES } from "@/lib/smiley";

// Wessel's smiley, traced from his sharpie sketch. The features (eyes and
// mouth) look toward the pointer. Calm = they rest.

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

export function Smiley({
  follow = false,
  className,
}: {
  follow?: boolean;
  className?: string;
}) {
  const feat = useRef<SVGGElement>(null);
  const { calm } = useMotion();

  useEffect(() => {
    const g = feat.current;
    if (!g) return;
    const svg = g.ownerSVGElement!;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const ptr = { x: innerWidth / 2, y: innerHeight / 2 };
    const cur = [0, 0];
    let raf = 0;

    const draw = () => {
      let aim = [0, 0];
      if (follow && fine && !calm) {
        const r = svg.getBoundingClientRect();
        aim = [
          clamp((ptr.x - r.left - r.width / 2) / (innerWidth * 0.5)),
          clamp((ptr.y - r.top - r.height / 2) / (innerHeight * 0.5)),
        ];
      }
      const k = calm ? 1 : 0.12;
      cur[0] += (aim[0] - cur[0]) * k;
      cur[1] += (aim[1] - cur[1]) * k;
      const sy = 1 - Math.abs(cur[1]) * 0.12;
      g.setAttribute(
        "transform",
        `translate(${106 + cur[0] * 16} ${106 + cur[1] * 14}) scale(${1 - Math.abs(cur[0]) * 0.12} ${sy}) translate(-106 -106)`,
      );
      const settled = Math.abs(aim[0] - cur[0]) + Math.abs(aim[1] - cur[1]) < 0.002;
      raf = settled ? 0 : requestAnimationFrame(draw);
    };
    const wake = () => void (raf ||= requestAnimationFrame(draw));
    const move = (e: PointerEvent) => {
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      wake();
    };

    draw();
    if (follow && fine && !calm)
      addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move);
    };
  }, [follow, calm]);

  return (
    <svg
      viewBox="0 0 212 212"
      aria-hidden="true"
      className={className}
      overflow="visible"
    >
      <path fill="currentColor" fillRule="evenodd" d={FACE} />
      <g ref={feat}>
        <path fill="currentColor" d={FEATURES} />
      </g>
    </svg>
  );
}
