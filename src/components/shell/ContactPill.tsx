"use client";

import { Arrow } from "@/components/parts/Arrow";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { announce } from "@/lib/motion";
import { EMAIL, LINKEDIN } from "./nav";
import { useTry } from "./TryPanel";

// Phones and tablets: a grape "Contact ↓" pill docks bottom-right once the
// first screen (or the page's [data-hero]) has gone, and hides again at the
// footer and while the menu is open (CSS).
export function ContactPill() {
  const pathname = usePathname();
  const [on, setOn] = useState(false);
  // PREVIEW ONLY (polish pass): the pill opens three quick actions instead
  // of jumping to the footer.
  const sheet = useTry("pill") === "sheet";
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (open && (!on || !sheet)) setOpen(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => !(e.target as Element).closest?.(".tzs, .tz") && setOpen(false);
    const away = () => setOpen(false);
    addEventListener("pointerdown", close);
    addEventListener("scroll", away, { passive: true, once: true });
    return () => {
      removeEventListener("pointerdown", close);
      removeEventListener("scroll", away);
    };
  }, [open]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      announce("Copied. Talk soon.");
      setCopied(true);
      setTimeout(() => (setCopied(false), setOpen(false)), 1100);
    } catch {
      location.href = `mailto:${EMAIL}`;
    }
  };

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
    <>
      {sheet && (
        <div className="tzs" data-open={open} inert={!open}>
          <button type="button" className="text-link" onClick={copy}>
            {copied ? "Copied" : "Copy email"}
          </button>
          <a className="text-link" href={`mailto:${EMAIL}`}>
            Email
          </a>
          <a className="text-link" href={LINKEDIN} target="_blank" rel="noopener">
            LinkedIn <Arrow dir="out" />
          </a>
        </div>
      )}
      <a
        href="#contact"
        className="tz text-link"
        data-on={on}
        data-sheet={open || undefined}
        tabIndex={on ? 0 : -1}
        aria-hidden={!on}
        aria-expanded={sheet ? open : undefined}
        onClick={(e) => {
          if (!sheet) return;
          e.preventDefault();
          setOpen(!open);
        }}
      >
        Contact <Arrow dir={open ? "up" : "down"} />
      </a>
    </>
  );
}
