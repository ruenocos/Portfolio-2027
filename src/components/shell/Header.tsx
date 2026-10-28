"use client";

import Link from "next/link";
import { Arrow } from "@/components/parts/Arrow";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getLenis } from "@/lib/scroll";
import { ThemeSwitch } from "./ThemeSwitch";
import { Hop } from "./Hop";
import { NAV } from "./nav";
import { PauseButton } from "./PauseButton";
import { useMotion } from "@/components/useMotion";
import { Smiley } from "./Smiley";

// The sticky header. The "Wessel" wordmark slides in once a page's hero
// ([data-hero]) has scrolled away; pages without a hero show it at once.
// Below 900px the links move into the phone menu.
export function Header() {
  const pathname = usePathname();
  // Only home has a hero so far; the observer below corrects this either way.
  const [heroIn, setHeroIn] = useState(pathname === "/");
  const [open, setOpen] = useState(false);
  const { paused } = useMotion();
  const [path, setPath] = useState(pathname);
  if (path !== pathname) {
    setPath(pathname);
    setHeroIn(pathname === "/");
    setOpen(false);
  }
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = document.querySelector("[data-hero]");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setHeroIn(e.isIntersecting), {
      rootMargin: "-90px 0px 0px 0px",
    });
    io.observe(hero);
    return () => io.disconnect();
  }, [pathname]);

  // The phone menu: locks page scroll, moves focus in and back,
  // closes on Esc, a link, the empty canvas or a resize past 900.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add("menu-open");
    getLenis()?.stop();
    const first = window.setTimeout(
      () => panel.current?.querySelector("a")?.focus({ preventScroll: true }),
      60,
    );
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        // The header is sticky: focusing it must not scroll the page.
        button.current?.focus({ preventScroll: true });
      }
      if (e.key !== "Tab") return;
      const items: HTMLElement[] = [
        button.current!,
        ...panel.current!.querySelectorAll<HTMLElement>("a, button"),
      ];
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && i === items.length - 1) {
        e.preventDefault();
        items[0].focus();
      }
    };
    const wide = matchMedia("(width >= 900px)");
    const resize = () => wide.matches && setOpen(false);
    addEventListener("keydown", key);
    wide.addEventListener("change", resize);
    return () => {
      window.clearTimeout(first);
      root.classList.remove("menu-open");
      getLenis()?.start();
      removeEventListener("keydown", key);
      wide.removeEventListener("change", resize);
    };
  }, [open]);

  // A tap anywhere on a settings row presses its control.
  const tapRow = (e: React.MouseEvent<HTMLLIElement>) => {
    if (!(e.target as Element).closest("button")) e.currentTarget.querySelector("button")?.click();
  };

  const links = [
    ...NAV.map((l) => ({ ...l, arrow: undefined })),
    { href: "#contact", label: "Contact", arrow: "down" as const },
  ];

  return (
    <>
      <header className="hd frame" data-past={!heroIn}>
        <div className="side" />
        <div className="bar">
          <Link href="/" className="home" aria-label="Wessel Oud, home">
            <Smiley follow className="logo" />
            <span className="wm" aria-hidden="true">
              Wessel
            </span>
          </Link>
          <div className="mid">
            <nav aria-label="Main">
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-link"
                  aria-current={pathname.startsWith(href) ? "page" : undefined}
                >
                  <Hop text={label} />
                </Link>
              ))}
            </nav>
            <div className="ctw">
              <ThemeSwitch />
              <PauseButton />
            </div>
          </div>
          <div className="end">
            <Link href="#contact" className="ct text-link">
              <Hop text="Contact" />
              <span className="ar" aria-hidden="true">
                <Arrow dir="down" />
              </span>
            </Link>
            <button
              ref={button}
              type="button"
              className="mb"
              aria-label="Menu"
              aria-expanded={open}
              aria-controls="mnav"
              onClick={() => setOpen(!open)}
            >
              <i />
              <i />
            </button>
          </div>
        </div>
        <div className="side" />
      </header>

      <nav
        ref={panel}
        id="mnav"
        className="mnav"
        aria-label="Menu"
        data-open={open}
        inert={!open}
        onClick={(e) =>
          (e.target === e.currentTarget ||
            (e.target as Element).closest("a")) &&
          setOpen(false)
        }
      >
        <ul>
          {links.map(({ href, label, arrow }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={pathname.startsWith(href) ? "page" : undefined}
              >
                {label}
                {arrow && (
                  <span className="ar" aria-hidden="true">
                    <Arrow dir={arrow} />
                  </span>
                )}
              </Link>
            </li>
          ))}
          <li className="mset text-body" onClick={tapRow}>
            <span aria-hidden="true">Dark mode</span>
            <ThemeSwitch />
          </li>
          <li className="mset text-body" onClick={tapRow}>
            {/* Same words as the button's name (WCAG 2.5.3). */}
            <span aria-hidden="true">{paused ? "Play motion" : "Pause motion"}</span>
            <PauseButton />
          </li>
        </ul>
      </nav>
    </>
  );
}
