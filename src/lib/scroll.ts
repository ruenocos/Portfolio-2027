import type Lenis from "lenis";
import motionTokens from "../../design/motion-tokens.json";
import { clamp, easeInOutCubic } from "@/lib/math";
import { getMotion } from "@/lib/motion";

// The one Lenis instance (desktop mouse only, never while calm), so the
// phone menu and page changes can stop it or jump it.
let lenis: Lenis | null = null;

export const getLenis = () => lenis;
export const setLenis = (l: Lenis | null) => void (lenis = l);

const { toTop } = motionTokens.scroll;

// Back to the top of the page: a glide that takes longer the further it
// goes, or an instant jump while calm (Pause or reduced motion).
export function scrollToTop() {
  if (getMotion().calm) {
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else scrollTo(0, 0);
    return;
  }
  if (!lenis) return scrollTo({ top: 0, behavior: "smooth" });
  const ms = clamp(toTop.baseMs + scrollY * toTop.msPerPx, toTop.minMs, toTop.maxMs);
  // easeInOutCubic is the "mode" bezier (0.65, 0, 0.35, 1).
  lenis.scrollTo(0, { duration: ms / 1000, easing: easeInOutCubic, force: true });
}
