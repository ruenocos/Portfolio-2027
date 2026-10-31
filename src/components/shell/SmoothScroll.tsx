"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { setLenis, getLenis } from "@/lib/scroll";
import { useMotion } from "@/components/useMotion";
import motionTokens from "../../../design/motion-tokens.json";
import { finePointer } from "@/lib/media";
import { isCalm } from "@/lib/motion";

const { lerp, wheelMultiplier } = motionTokens.scroll.lenis;

// Gentle Lenis: desktop mouse only, off for touch, reduced motion and Pause.
export function SmoothScroll() {
  const { calm } = useMotion();
  const pathname = usePathname();

  useEffect(() => {
    // isCalm too: while hydrating, useMotion still gives the server's answer
    // (full motion), and a Lenis made for that one render resets the scroll.
    if (calm || isCalm() || !finePointer()) return;
    const lenis = new Lenis({
      lerp,
      wheelMultiplier,
      autoRaf: false,
      anchors: { offset: 0 },
    });
    setLenis(lenis);
    // Our own frame loop instead of Lenis's, so it sleeps while the page
    // sits still: it runs from any input until the glide has settled.
    let frame = 0;
    let quiet = 0;
    const step = (time: number) => {
      lenis.raf(time);
      quiet = lenis.isScrolling ? 0 : quiet + 1;
      frame = quiet > 10 ? 0 : requestAnimationFrame(step);
    };
    const wake = () => {
      quiet = 0;
      if (!frame) frame = requestAnimationFrame(step);
    };
    const inputs = ["wheel", "keydown", "pointerdown", "click", "scroll"] as const;
    inputs.forEach((e) => addEventListener(e, wake, { passive: true, capture: true }));
    wake();
    return () => {
      inputs.forEach((e) => removeEventListener(e, wake, { capture: true }));
      cancelAnimationFrame(frame);
      lenis.destroy();
      setLenis(null);
    };
  }, [calm]);

  // A new page starts at the top, without gliding there. Not the page you
  // loaded: a refresh (or a reload from Back) keeps the place the browser
  // restored.
  const shown = useRef(pathname);
  useEffect(() => {
    if (shown.current === pathname) return;
    shown.current = pathname;
    if (!location.hash) getLenis()?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}
