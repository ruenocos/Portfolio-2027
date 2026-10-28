"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { afterIntro } from "@/lib/intro/iris";
import { TIP, arrive, attachWessel, newPage } from "@/lib/wessel";
import { Cursor } from "./canvas/Cursor";
import { finePointer } from "@/lib/media";

// Wessel's layer. It lives in the root layout so he survives page changes:
// one Wessel on screen, always. The engine (lib/wessel) moves him; pages
// give him jobs with useBeat().
// The visitor gets a plain grape "You" cursor on mouse devices: it only
// points, and over a project it says "View case" (any [data-you] element
// names its own label). It sits in the shell, so Sanity Studio gets none of it.
export function CursorLayer() {
  const pathname = usePathname();
  const wes = useRef<HTMLDivElement>(null);
  const you = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wes.current;
    if (!el) return;
    el.inert = true;
    return attachWessel(el);
  }, []);

  // On home's first visit he makes his entrance once the intro hands over.
  useEffect(() => {
    newPage();
    return afterIntro(arrive);
  }, [pathname]);

  useEffect(() => {
    const y = you.current;
    if (!y || !finePointer()) return;
    const root = document.documentElement;
    const tag = y.querySelector(".tag b")!;
    root.classList.add("youcur");
    let soon = 0;
    let at: [number, number] | null = null;
    let raf = 0;
    // What's under you: the hand on links, and a hint in the tag.
    const look = (t: Element | null) => {
      y.dataset.on = String(!!t?.closest?.("a,button,[role=button],label,[data-you]"));
      if (!soon) tag.textContent = t?.closest?.("[data-you]")?.getAttribute("data-you") || "You";
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      at = [e.clientX, e.clientY];
      y.style.transform = `translate(${e.clientX - TIP[0]}px,${e.clientY - TIP[1]}px)`;
      y.dataset.hide = String(!!document.querySelector("dialog[open]"));
      look(e.target as Element);
    };
    // Scrolling with the mouse still moves the page under you, not you.
    const scrolled = () =>
      (raf ||= requestAnimationFrame(() => {
        raf = 0;
        if (at) look(document.elementFromPoint(at[0], at[1]));
      }));
    const out = (e: MouseEvent) => {
      if (!e.relatedTarget) y.dataset.hide = "true";
    };
    const down = () => (y.dataset.press = "true");
    const up = () => (y.dataset.press = "false");
    // A project without a case page says so on your tag when you click it.
    const say = (e: Event) => {
      tag.textContent = (e as CustomEvent<string>).detail;
      clearTimeout(soon);
      soon = window.setTimeout(() => (soon = 0), 1400);
    };
    addEventListener("pointermove", move, { passive: true });
    addEventListener("scroll", scrolled, { passive: true });
    addEventListener("pointerdown", down);
    addEventListener("pointerup", up);
    addEventListener("wsl:you", say);
    document.addEventListener("mouseout", out);
    return () => {
      root.classList.remove("youcur");
      removeEventListener("pointermove", move);
      removeEventListener("scroll", scrolled);
      cancelAnimationFrame(raf);
      removeEventListener("pointerdown", down);
      removeEventListener("pointerup", up);
      removeEventListener("wsl:you", say);
      document.removeEventListener("mouseout", out);
    };
  }, []);

  return (
    <>
      <div id="cursors" className="cursors">
        <Cursor ref={wes} kind="wes" name="Wessel" />
      </div>
      <Cursor ref={you} kind="you" name="You" fixed />
    </>
  );
}
