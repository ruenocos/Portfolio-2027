"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { setLenis, getLenis } from "@/lib/scroll";
import { useMotion } from "@/components/useMotion";
import motionTokens from "../../../design/motion-tokens.json";

const { lerp, wheelMultiplier } = motionTokens.scroll.lenis;

// Gentle Lenis: desktop mouse only, off for touch, reduced motion and Pause.
export function SmoothScroll() {
  const { calm } = useMotion();
  const pathname = usePathname();

  useEffect(() => {
    if (calm || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const lenis = new Lenis({ lerp, wheelMultiplier, autoRaf: true, anchors: { offset: 0 } });
    setLenis(lenis);
    return () => {
      lenis.destroy();
      setLenis(null);
    };
  }, [calm]);

  // A new page starts at the top, without gliding there.
  useEffect(() => {
    if (!location.hash) getLenis()?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}
