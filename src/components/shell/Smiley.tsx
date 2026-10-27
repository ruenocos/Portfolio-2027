"use client";

import { useEffect, useRef } from "react";
import { useMotion } from "@/components/useMotion";

// Wessel's smiley, traced from his sharpie sketch. The features (eyes and
// mouth) look toward the pointer and close at night. Calm = they rest.

const FACE = "M98.8 14.2Q99.0 14.1 108.3 13.9Q117.6 13.7 128.5 15.1Q139.3 16.5 146.3 19.3Q153.4 22.1 156.9 26.0Q160.4 29.9 163.5 30.2Q166.7 30.6 173.7 33.4Q180.7 36.2 183.9 38.3Q187.1 40.4 192.1 45.8Q197.2 51.3 200.7 59.3Q204.2 67.4 205.3 74.4Q206.4 81.4 206.4 91.6Q206.4 101.8 204.9 113.0Q203.5 124.2 200.7 133.0Q197.9 141.8 194.1 149.2Q190.2 156.5 181.6 165.5Q173.0 174.4 162.8 181.1Q152.7 187.8 142.8 192.0Q133.0 196.2 123.5 197.2Q114.1 198.3 105.3 198.3Q96.5 198.3 84.6 196.5Q72.7 194.8 63.5 191.6Q54.4 188.5 46.7 183.9Q39.0 179.3 33.7 175.5Q28.5 171.6 23.7 166.9Q19.0 162.1 17.2 159.3Q15.5 156.5 12.7 150.2Q9.9 143.9 7.8 132.7Q5.6 121.4 6.0 114.4Q6.3 107.4 9.9 95.1Q13.4 82.8 17.2 74.4Q21.1 66.0 26.0 59.3Q30.9 52.7 36.7 46.9Q42.5 41.1 52.7 33.4Q62.8 25.7 70.6 22.1Q78.3 18.6 88.5 16.5Q98.6 14.4 98.8 14.2ZM108.8 27.0Q108.5 27.0 97.9 29.9Q87.4 32.7 76.2 38.6Q65.0 44.6 55.3 53.9Q45.6 63.2 40.7 69.5Q35.8 75.8 32.0 85.3Q28.1 94.8 25.0 105.3Q21.8 115.8 21.8 122.1Q21.8 128.5 23.5 134.1Q25.3 139.7 28.5 145.3Q31.6 150.9 37.4 156.7Q43.2 162.5 50.6 167.4Q57.9 172.3 63.9 174.8Q69.9 177.2 79.0 179.0Q88.1 180.7 96.5 181.1Q105.0 181.4 112.7 181.8Q120.4 182.1 127.8 180.4Q135.1 178.6 143.5 174.4Q152.0 170.2 158.3 165.3Q164.6 160.4 171.4 151.4Q178.3 142.5 180.4 137.9Q182.5 133.4 183.9 127.4Q185.3 121.4 186.3 119.7Q187.4 117.9 188.5 111.3Q189.5 104.6 189.5 93.4Q189.5 82.1 188.1 77.9Q186.7 73.7 186.7 70.9Q186.7 68.1 184.9 63.9Q183.2 59.7 179.5 55.3Q175.8 50.9 169.9 47.4Q163.9 43.9 160.7 43.5Q157.6 43.2 153.7 41.1Q149.9 39.0 145.3 34.4Q140.7 29.9 133.0 28.5Q125.3 27.0 117.2 27.0Q109.2 27.0 108.8 27.0Z";
const FEATURES = "M73.2 105.1Q73.0 105.3 72.5 105.8Q72.0 106.3 69.9 106.0Q67.8 105.7 66.7 106.3Q65.7 107.0 64.4 108.3Q63.2 109.5 62.5 111.6Q61.8 113.7 60.7 121.4Q59.7 129.2 60.4 135.1Q61.1 141.1 62.1 144.9Q63.2 148.8 69.7 155.3Q76.2 161.8 77.9 162.5Q79.7 163.2 82.8 163.2Q86.0 163.2 87.4 162.5Q88.8 161.8 94.8 156.9Q100.7 152.0 101.6 150.7Q102.5 149.5 102.5 148.1Q102.5 146.7 103.9 144.9Q105.3 143.2 104.6 142.5Q103.9 141.8 103.9 140.4Q103.9 139.0 104.9 137.2Q106.0 135.5 105.3 134.1Q104.6 132.7 105.0 131.6Q105.3 130.6 104.8 130.4Q104.2 130.2 103.9 130.9Q103.5 131.6 101.4 131.3Q99.3 130.9 92.7 137.9Q86.0 144.9 84.2 145.3Q82.5 145.7 80.6 143.7Q78.6 141.8 76.9 137.6Q75.1 133.4 75.1 129.2Q75.1 125.0 74.4 122.1Q73.7 119.3 74.1 113.0Q74.4 106.7 73.9 105.8Q73.4 105.0 73.2 105.1ZM111.8 42.0Q111.6 42.1 109.5 43.5Q107.4 44.9 106.7 46.7Q106.0 48.5 105.7 53.0Q105.3 57.6 104.6 59.7Q103.9 61.8 103.9 68.8Q103.9 75.8 103.2 81.4Q102.5 87.0 102.5 89.2Q102.5 91.3 103.0 91.8Q103.5 92.3 104.6 92.0Q105.7 91.6 107.1 94.1Q108.5 96.5 109.5 96.2Q110.6 95.8 111.8 94.9Q113.0 94.1 113.7 86.7Q114.4 79.3 115.8 77.9Q117.2 76.5 117.9 69.9Q118.6 63.2 119.3 61.1Q120.0 59.0 120.0 56.9Q120.0 54.8 119.3 54.4Q118.6 54.1 118.6 49.2Q118.6 44.2 118.1 43.4Q117.6 42.5 116.9 42.8Q116.2 43.2 114.1 42.5Q112.0 41.8 111.8 42.0ZM81.6 49.0Q81.4 49.2 79.3 50.9Q77.2 52.7 75.5 57.6Q73.7 62.5 73.7 72.3Q73.7 82.1 74.6 84.4Q75.5 86.7 76.5 87.0Q77.6 87.4 79.0 89.2Q80.4 90.9 81.1 90.9Q81.8 90.9 82.0 90.4Q82.1 89.9 83.9 87.8Q85.7 85.7 86.3 81.8Q87.0 77.9 87.0 72.7Q87.0 67.4 87.8 67.4Q88.5 67.4 88.5 63.9Q88.5 60.4 87.8 60.0Q87.0 59.7 86.7 54.8Q86.3 49.9 84.1 49.3Q81.8 48.8 81.6 49.0Z";

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

export function Smiley({ follow = false, className }: { follow?: boolean; className?: string }) {
  const feat = useRef<SVGGElement>(null);
  const { calm, asleep } = useMotion();

  useEffect(() => {
    const g = feat.current;
    if (!g) return;
    const svg = g.ownerSVGElement!;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const ptr = { x: innerWidth / 2, y: innerHeight / 2 };
    const cur = [0, 0];
    let sleep = asleep ? 1 : 0;
    let raf = 0;

    const draw = () => {
      let aim = [0, 0];
      if (follow && fine && !calm) {
        const r = svg.getBoundingClientRect();
        aim = [clamp((ptr.x - r.left - r.width / 2) / (innerWidth * 0.5)), clamp((ptr.y - r.top - r.height / 2) / (innerHeight * 0.5))];
      }
      const k = calm ? 1 : 0.12;
      cur[0] += (aim[0] - cur[0]) * k;
      cur[1] += (aim[1] - cur[1]) * k;
      sleep += ((asleep ? 1 : 0) - sleep) * (calm ? 1 : 0.08);
      const awake = 1 - sleep;
      const sy = (1 - Math.abs(cur[1]) * 0.12) * (1 - 0.84 * sleep);
      g.setAttribute(
        "transform",
        `translate(${106 + cur[0] * 16 * awake} ${106 + cur[1] * 14 * awake + sleep * 10}) scale(${1 - Math.abs(cur[0]) * 0.12} ${sy}) translate(-106 -106)`,
      );
      const settled = Math.abs(aim[0] - cur[0]) + Math.abs(aim[1] - cur[1]) < 0.002 && Math.abs((asleep ? 1 : 0) - sleep) < 0.002;
      raf = settled ? 0 : requestAnimationFrame(draw);
    };
    const wake = () => void (raf ||= requestAnimationFrame(draw));
    const move = (e: PointerEvent) => {
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      wake();
    };

    draw();
    if (follow && fine && !calm) addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move);
    };
  }, [follow, calm, asleep]);

  return (
    <svg viewBox="0 0 212 212" aria-hidden="true" className={className} overflow="visible">
      <path fill="currentColor" fillRule="evenodd" d={FACE} />
      <g ref={feat}>
        <path fill="currentColor" d={FEATURES} />
      </g>
    </svg>
  );
}
