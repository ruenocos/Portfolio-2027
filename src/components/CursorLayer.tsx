"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { setAsleep } from "@/components/ModeProvider";
import { useMotion } from "@/components/useMotion";
import { arrive, attachWessel, newPage, setWesselAsleep } from "@/lib/wessel";
import { Cursor } from "./canvas/Cursor";

// Wessel's layer. It lives in the root layout so he survives page changes:
// one Wessel on screen, always. The engine (lib/wessel) moves him; pages
// give him jobs with useBeat(). At night he sleeps and is the wake button.
// The visitor gets a plain grape "You" cursor on mouse devices: it only
// points, and over a project it says "View case" (any [data-you] element
// names its own label). It sits in the shell, so Sanity Studio gets none of it.
export function CursorLayer() {
  const pathname = usePathname();
  const { asleep } = useMotion();
  const wes = useRef<HTMLDivElement>(null);
  const you = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wes.current;
    if (!el) return;
    const detach = attachWessel(el);
    const wake = () => {
      if (el.dataset.asleep === "true") setAsleep(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        wake();
      }
    };
    el.addEventListener("click", wake);
    el.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("click", wake);
      el.removeEventListener("keydown", key);
      detach();
    };
  }, []);

  useEffect(() => setWesselAsleep(asleep), [asleep]);

  useEffect(() => {
    newPage();
    arrive();
  }, [pathname]);

  useEffect(() => {
    const y = you.current;
    if (!y || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const root = document.documentElement;
    const tag = y.querySelector(".tag b")!;
    root.classList.add("youcur");
    let soon = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      y.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2.5}px)`;
      y.dataset.hide = String(!!document.querySelector("dialog[open]"));
      const t = e.target as Element;
      y.dataset.on = String(!!t.closest?.("a,button,[role=button],label,[data-you]"));
      if (!soon) tag.textContent = t.closest?.("[data-you]")?.getAttribute("data-you") || "You";
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
    addEventListener("pointerdown", down);
    addEventListener("pointerup", up);
    addEventListener("wsl:you", say);
    document.addEventListener("mouseout", out);
    return () => {
      root.classList.remove("youcur");
      removeEventListener("pointermove", move);
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
