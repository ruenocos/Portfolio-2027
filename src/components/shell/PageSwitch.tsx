"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getMotion } from "@/lib/motion";
import { getLenis } from "@/lib/scroll";
import { holdWessel } from "@/lib/wessel";
import motionTokens from "../../../design/motion-tokens.json";
import { cssBezier } from "@/lib/math";

const { easing, transition } = motionTokens;
const ease = cssBezier(easing.ui.bezier);
const OUT = transition.page.out.ms;
const IN = transition.page.in.ms;

// A same-site link to another page, clicked plainly (no new tab).
function target(e: MouseEvent): URL | null {
  if (e.defaultPrevented || e.button !== 0) return null;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const a = (e.target as Element | null)?.closest?.("a[href]");
  if (!(a instanceof HTMLAnchorElement)) return null;
  if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return null;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname === location.pathname) return null;
  return url;
}

type Leaving = { veil?: HTMLElement; hash: string; timer: number };
let out: Leaving | null = null;

// The new page has committed: jump to the top (or the link's anchor) while
// covered, then lift the veil while the new rows rise in.
function arrive() {
  const leaving = out;
  if (!leaving) return;
  out = null;
  clearTimeout(leaving.timer);
  const lenis = getLenis();
  const spot = leaving.hash && document.getElementById(decodeURIComponent(leaving.hash.slice(1)));
  if (spot) spot.scrollIntoView();
  else if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else scrollTo(0, 0);
  lenis?.start();
  const veil = leaving.veil;
  if (veil)
    veil
      .animate([{ opacity: 1 }, { opacity: 0 }], { duration: IN, easing: ease, fill: "forwards" })
      .finished.then(() => veil.remove(), () => veil.remove());
}

// The page change: plays the way out, then routes. When the new page has
// committed, jumps to the top under cover and plays the way in.
export function PageSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const url = target(e);
      if (!url) return;
      e.preventDefault();
      if (out) return;
      holdWessel();
      const go = () => router.push(url.pathname + url.search + url.hash, { scroll: false });
      if (getMotion().calm) return go();

      const leaving: Leaving = { hash: url.hash, timer: 0 };
      out = leaving;
      getLenis()?.stop();
      // The veil: a canvas-coloured cover over the content column only, so
      // the header, the dotted sides and Wessel hold still around it.
      const main = document.getElementById("main")!.getBoundingClientRect();
      const veil = document.createElement("div");
      veil.className = "veil";
      veil.style.left = `${main.left}px`;
      veil.style.width = `${main.width}px`;
      // Case to case, the case bar holds still: the veil starts under it
      // while it sits at the top of the screen.
      const bar = /^\/work\/[^/]+$/.test(location.pathname) && /^\/work\/[^/]+$/.test(url.pathname)
        ? document.querySelector("main .crumb")?.getBoundingClientRect()
        : null;
      if (bar && bar.top >= 0 && bar.top < 120) veil.style.top = `${bar.bottom}px`;
      document.body.append(veil);
      leaving.veil = veil;
      veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OUT, easing: ease, fill: "forwards" });
      // If the route never commits, don't leave the page covered.
      leaving.timer = window.setTimeout(arrive, 4000);
      setTimeout(go, OUT);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  useEffect(() => {
    // Only a real change of page moves anything (not the first render, nor
    // development mode's second run of it).
    const was = last.current;
    last.current = pathname;
    if (was === null || was === pathname) return;
    arrive();
    // Keyboard and screen reader users start at the top of the new page.
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
