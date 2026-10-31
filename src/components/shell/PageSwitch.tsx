"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getMotion } from "@/lib/motion";
import { getLenis } from "@/lib/scroll";
import { onPage } from "@/lib/page";
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

type Leaving = { veil?: HTMLElement; hash: string; timer: number; slow?: boolean };
let out: Leaving | null = null;

const lift = (veil: HTMLElement) =>
  veil
    .animate([{ opacity: 1 }, { opacity: 0 }], { duration: IN, easing: ease, fill: "forwards" })
    .finished.then(() => veil.remove(), () => veil.remove());

// The new page is slow to come: uncover the page you're on so it can be
// read and scrolled meanwhile. The change still lands (arrive) when it
// commits, and another click may go somewhere else instead.
function wait() {
  if (!out) return;
  out.slow = true;
  getLenis()?.start();
  if (out.veil) lift(out.veil);
  out.veil = undefined;
}

// The new page has committed: jump to the top (or the link's anchor) while
// covered, then lift the veil while the new rows rise in.
function arrive() {
  const leaving = out;
  if (!leaving) return;
  out = null;
  clearTimeout(leaving.timer);
  const lenis = getLenis();
  const spot = leaving.hash && onPage(`#${CSS.escape(decodeURIComponent(leaving.hash.slice(1)))}`);
  if (spot) spot.scrollIntoView();
  else if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else scrollTo(0, 0);
  lenis?.start();
  if (leaving.veil) lift(leaving.veil);
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
      if (out && !out.slow) return;
      if (out) clearTimeout(out.timer);
      holdWessel();
      const go = () => router.push(url.pathname + url.search + url.hash, { scroll: false });
      const leaving: Leaving = { hash: url.hash, timer: 0 };
      out = leaving;
      // Calm: no veil, but the new page still opens at its top (arrive).
      if (getMotion().calm) {
        leaving.timer = window.setTimeout(wait, 4000);
        return go();
      }

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
        ? onPage("main .crumb")?.getBoundingClientRect()
        : null;
      // It starts under the bar's bottom hairline too, so the line stays.
      if (bar && bar.top >= 0 && bar.top < 120) veil.style.top = `calc(${bar.bottom}px + var(--spacing-hairline))`;
      document.body.append(veil);
      leaving.veil = veil;
      veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OUT, easing: ease, fill: "forwards" });
      // If the route is slow or never commits, don't leave the page covered.
      leaving.timer = window.setTimeout(wait, 4000);
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
