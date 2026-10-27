"use client";

import { useMotion } from "@/components/useMotion";

// Wessel's layer. It lives in the root layout so he survives page changes:
// one Wessel on screen, always. Phase 3 puts him, You and the bots in here;
// for now it's the empty, fixed stage they'll share. Decorative, so hidden
// from screen readers; real status goes to #live.
export function CursorLayer() {
  const { calm, asleep } = useMotion();
  return <div id="cursors" className="cursors" aria-hidden="true" data-calm={calm} data-asleep={asleep} />;
}
