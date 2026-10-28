import { useEffect, type RefObject } from "react";
import { getMotion } from "@/lib/motion";
import { isBusy, wessel } from "@/lib/wessel";
import { narrow } from "@/lib/media";

/** Whether the idle nod may play, and how often it already has. */
export type IdleNod = { on: boolean; nods: number; stillSince: number; nodding: boolean };

// Wessel's "this way down" nod: two quick dips at the bottom of the hero.
// Phones: just under the hero, in the dotted band, so he never covers the role.
// On short screens he comes up far enough to stay in view (off it, he'd
// follow you onto the role line).
export const nodSpot = (hero: HTMLElement): [number, number, number] => {
  if (!narrow()) return [0.32, 1, -44];
  const bottom = hero.getBoundingClientRect().bottom + scrollY;
  // Right half of the band: the { About } label sits bottom-left of it.
  return [0.56, 1, Math.max(8, Math.min(24, innerHeight - 64 - bottom))];
};

export async function nodDown(hero: HTMLElement) {
  const [fx, fy, dy] = nodSpot(hero);
  for (let k = 0; k < 2; k++) {
    await wessel.go(wessel.at(hero, fx, fy, 0, dy + 22), { k: 320, timeout: 260 });
    await wessel.go(wessel.at(hero, fx, fy, 0, dy), { k: 320, timeout: 260 });
  }
}

/** Sends Wessel to the nod spot under the hero. */
export const goToNodSpot = (hero: HTMLElement, k = 150, timeout = 1200) => {
  const [fx, fy, dy] = nodSpot(hero);
  return wessel.go(wessel.at(hero, fx, fy, 0, dy), { k, timeout });
};

/**
 * The idle nod: if you sit still on the hero after the intro, he repeats
 * it after 7s, 12s and 17s, three times at most.
 */
export function useIdleNod(heroRef: RefObject<HTMLElement | null>, idleRef: RefObject<IdleNod>) {
  useEffect(() => {
    const idle = idleRef.current;
    idle.stillSince = performance.now();
    const moved = () => (idle.stillSince = performance.now());
    const events = ["pointermove", "pointerdown", "wheel", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => addEventListener(e, moved, { passive: true }));
    const id = setInterval(async () => {
      const hero = heroRef.current;
      if (!hero || !idle.on || idle.nodding || isBusy() || getMotion().calm || document.hidden || idle.nods >= 3) return;
      if (performance.now() - idle.stillSince < 7000 + idle.nods * 5000 || scrollY > hero.offsetHeight * 0.3) return;
      idle.nodding = true;
      idle.nods++;
      await goToNodSpot(hero, 170, 1100);
      await nodDown(hero);
      wessel.free();
      idle.stillSince = performance.now();
      idle.nodding = false;
    }, 500);
    return () => {
      clearInterval(id);
      events.forEach((e) => removeEventListener(e, moved));
    };
  }, [heroRef, idleRef]);
}
