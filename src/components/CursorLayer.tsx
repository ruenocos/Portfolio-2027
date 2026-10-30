"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { afterIntro } from "@/lib/intro/iris";
import { TIP, arrive, attachWessel, newPage } from "@/lib/wessel";
import { Cursor } from "./canvas/Cursor";
import { finePointer } from "@/lib/media";

// How often the hover hint re-checks what is under a still pointer while the page scrolls.
const LOOK_MS = 120;

// Wessel's layer. It lives in the root layout so he survives page changes:
// one Wessel on screen, always. The engine (lib/wessel) moves him; pages
// give him jobs with useBeat().
// The visitor gets a plain grape "You" cursor on mouse devices: it only
// points, and over a project it says "View case" (any [data-you] element
// names its own label; on the playground, the tile's title). It sits in the shell, so Sanity Studio gets none of it.
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

  // A new page: your tag forgets the link you clicked ("View case" would
  // otherwise hang on until the mouse moves).
  useEffect(() => {
    const y = you.current;
    const tag = y?.querySelector(".tag b");
    if (!y || !tag) return;
    tag.textContent = "You";
    y.dataset.on = "false";
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
    // What's under you: the hand on links, and a hint in the tag. Written
    // only when it changes, so a scroll over plain text costs no style work.
    const look = (t: Element | null) => {
      const on = String(!!t?.closest?.("a,button,[role=button],label,[data-you]"));
      if (y.dataset.on !== on) y.dataset.on = on;
      const text = t?.closest?.("[data-you]")?.getAttribute("data-you") || "You";
      if (!soon && tag.textContent !== text) tag.textContent = text;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      at = [e.clientX, e.clientY];
      y.style.transform = `translate(${e.clientX - TIP[0]}px,${e.clientY - TIP[1]}px)`;
      y.dataset.hide = String(!!document.querySelector("dialog[open]"));
      look(e.target as Element);
    };
    // Scrolling with the mouse still moves the page under you, not you.
    // Hit-testing is a layout read, so mid-scroll it runs every LOOK_MS
    // and once more when the page comes to rest.
    let lookedAt = 0;
    let settle = 0;
    const scrolled = () => {
      clearTimeout(settle);
      settle = window.setTimeout(() => at && look(document.elementFromPoint(at[0], at[1])), LOOK_MS);
      if (raf || performance.now() - lookedAt < LOOK_MS) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        lookedAt = performance.now();
        if (at) look(document.elementFromPoint(at[0], at[1]));
      });
    };
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
    // Something moved under a still pointer (the playground board pans).
    addEventListener("wsl:look", scrolled);
    document.addEventListener("mouseout", out);
    return () => {
      root.classList.remove("youcur");
      removeEventListener("pointermove", move);
      removeEventListener("scroll", scrolled);
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      removeEventListener("pointerdown", down);
      removeEventListener("pointerup", up);
      removeEventListener("wsl:you", say);
      removeEventListener("wsl:look", scrolled);
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
