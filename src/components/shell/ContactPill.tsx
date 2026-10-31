"use client";

import { Arrow } from "@/components/parts/Arrow";
import { scroll } from "motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { onPage } from "@/lib/page";

// How far the page has to move before a change of direction counts.
const REVERSE_PX = 24;

// Phones and tablets: a grape "Contact ↓" pill docks bottom-right once the
// first screen (or the page's [data-hero]) has gone, and hides again at the
// footer and while the menu is open (CSS). While you scroll down you're
// reading, so it steps away and comes back when you scroll up.
export function ContactPill() {
  const pathname = usePathname();
  const [on, setOn] = useState(false);

  // Every "Contact" link (header, menu, this pill) takes keyboard focus
  // along to the hello, so the next Tab goes on from there, not the top.
  useEffect(() => {
    const go = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.('a[href="#contact"]')) return;
      const hello = document.getElementById("contact");
      if (!hello) return;
      hello.tabIndex = -1;
      requestAnimationFrame(() => hello.focus({ preventScroll: true }));
    };
    document.addEventListener("click", go);
    return () => document.removeEventListener("click", go);
  }, []);

  useEffect(() => {
    let heroIn = true;
    let endIn = false;
    let reading = false;
    let lastY = scrollY;
    const sync = () => setOn(!heroIn && !endIn && !reading);
    const hero = onPage("[data-hero]");
    const end = onPage("#contact");
    let live = true;
    const io = new IntersectionObserver((entries) => {
      // A report queued before you left still arrives after disconnect().
      if (!live) return;
      for (const e of entries) {
        if (e.target === end) endIn = e.isIntersecting;
        else heroIn = e.isIntersecting;
      }
      sync();
    });
    if (hero) io.observe(hero);
    if (end) io.observe(end);
    // The scroll value motion reads once per frame for everyone: reading
    // scrollY in a scroll handler forced a style pass mid-frame.
    const moved = (y: number) => {
      // No hero: the pill comes once the first screen has scrolled by.
      if (!hero) heroIn = y < innerHeight * 0.8;
      const dy = y - lastY;
      if (Math.abs(dy) >= REVERSE_PX) {
        lastY = y;
        reading = dy > 0;
      }
      sync();
    };
    if (!hero) moved(scrollY);
    const stop = scroll((_p: number, info: { y: { current: number } }) => moved(info.y.current));
    return () => {
      live = false;
      io.disconnect();
      stop();
    };
  }, [pathname]);

  return (
    <a
      href="#contact"
      className="tz text-link"
      data-on={on}
      tabIndex={on ? 0 : -1}
      aria-hidden={!on}
    >
      Contact <Arrow dir="down" />
    </a>
  );
}
