"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getMotion } from "@/lib/motion";
import { getLenis } from "@/lib/scroll";
import { holdWessel } from "@/lib/wessel";
import motionTokens from "../../../design/motion-tokens.json";

const { easing, transition } = motionTokens;
const ease = `cubic-bezier(${easing.ui.bezier.join(",")})`;
const OUT = transition.page.out.ms;
const IN = transition.page.in.ms;

// Three ways out, picked with ?pt=veil|fade|lift while Wons compares them
// (remembered for the visit). The header, switch, Pause and Wessel hold still
// in all three; the new page's rows come in with the house entrance.
//  veil  canvas-coloured cover over the content column, out then in
//  fade  the content fades, the ruled frame stays
//  lift  like fade, the content also lifts 8px as it goes
const STYLES = ["veil", "fade", "lift"] as const;
type Style = (typeof STYLES)[number];
const isStyle = (s: string | null): s is Style => STYLES.includes(s as Style);

function pick(): Style {
  try {
    const q = new URLSearchParams(location.search).get("pt");
    if (isStyle(q)) sessionStorage.setItem("wsl-pt", q);
    const s = sessionStorage.getItem("wsl-pt");
    if (isStyle(s)) return s;
  } catch {}
  return "veil";
}

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

type Leaving = { veil?: HTMLElement; anims: Animation[]; hash: string; timer: number };
let out: Leaving | null = null;

// The new page has committed: jump to the top (or the link's anchor) while
// covered, bring back what survives the change, then lift the veil.
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
  // Parts that live in the layout (the footer) come straight back.
  for (const a of leaving.anims) if ((a.effect as KeyframeEffect | null)?.target !== leaving.veil) a.cancel();
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
  const first = useRef(true);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const url = target(e);
      if (!url) return;
      e.preventDefault();
      if (out) return;
      holdWessel();
      const go = () => router.push(url.pathname + url.search + url.hash, { scroll: false });
      if (getMotion().calm) return go();

      const style = pick();
      const leaving: Leaving = { anims: [], hash: url.hash, timer: 0 };
      out = leaving;
      getLenis()?.stop();
      if (style === "veil") {
        const main = document.getElementById("main")!.getBoundingClientRect();
        const veil = document.createElement("div");
        veil.className = "veil";
        veil.style.left = `${main.left}px`;
        veil.style.width = `${main.width}px`;
        document.body.append(veil);
        leaving.veil = veil;
        leaving.anims.push(veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OUT, easing: ease, fill: "forwards" }));
      } else {
        const lift = style === "lift" ? [{ translate: "0 0" }, { translate: "0 -8px" }] : [];
        for (const el of document.querySelectorAll<HTMLElement>(".page-body [data-row] > .cell, .page-body footer")) {
          const b = el.getBoundingClientRect();
          if (b.bottom < 0 || b.top > innerHeight) continue;
          const frames = lift.length
            ? [{ opacity: 1, ...lift[0] }, { opacity: 0, ...lift[1] }]
            : [{ opacity: 1 }, { opacity: 0 }];
          leaving.anims.push(el.animate(frames, { duration: OUT, easing: ease, fill: "forwards" }));
        }
      }
      // If the route never commits, don't leave the page covered.
      leaving.timer = window.setTimeout(arrive, 4000);
      setTimeout(go, OUT);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    arrive();
  }, [pathname]);

  return null;
}
