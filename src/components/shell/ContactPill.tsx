"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Phones and tablets: a grape "Contact ↓" pill docks bottom-right once the
// first screen (or the page's [data-hero]) has gone, and hides again at the
// footer and while the menu is open (CSS).
export function ContactPill() {
  const pathname = usePathname();
  const [on, setOn] = useState(false);

  useEffect(() => {
    let heroIn = true;
    let endIn = false;
    const sync = () => setOn(!heroIn && !endIn);
    const hero = document.querySelector("[data-hero]");
    const end = document.getElementById("contact");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === end) endIn = e.isIntersecting;
        else heroIn = e.isIntersecting;
      }
      sync();
    });
    if (hero) io.observe(hero);
    if (end) io.observe(end);
    // No hero: the pill comes once the first screen has scrolled by.
    const scroll = () => {
      heroIn = scrollY < innerHeight * 0.8;
      sync();
    };
    if (!hero) {
      scroll();
      addEventListener("scroll", scroll, { passive: true });
    }
    return () => {
      io.disconnect();
      removeEventListener("scroll", scroll);
    };
  }, [pathname]);

  return (
    <a href="#contact" className="tz text-label" data-on={on} tabIndex={on ? 0 : -1} aria-hidden={!on}>
      Contact ↓
    </a>
  );
}
