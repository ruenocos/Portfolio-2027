"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getLenis, scrollToTop } from "@/lib/scroll";
import { ThemeSwitch } from "./ThemeSwitch";
import { Hop } from "./Hop";
import { NAV } from "./nav";
import { PauseButton } from "./PauseButton";
import { useMotion } from "@/components/useMotion";
import { Smiley } from "./Smiley";
import { STACK_PX } from "@/lib/media";
import { onPage, routeOf } from "@/lib/page";

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
    document.documentElement.dataset.route = routeOf(pathname);
    const hero = onPage("[data-hero]");
    if (!hero) return;
    // A report already queued when you leave still arrives after disconnect():
    // it's about the last page's hero, so it's dropped.
    let live = true;
    const io = new IntersectionObserver(([e]) => live && setHeroIn(e.isIntersecting), {
      rootMargin: "-90px 0px 0px 0px",
    });
    io.observe(hero);
    return () => {
      live = false;
      io.disconnect();
    };
  }, [pathname]);

  // On <html>, so the phone bar's height token can follow it without a
  // :has() on the root, which restyles the whole page whenever it's checked.
  // Only home has a hero: elsewhere the bar is always past it, whatever a
  // late report about home's (now hidden) hero says.
  const past = pathname !== "/" || !heroIn;
  useEffect(() => {
    document.documentElement.dataset.past = String(past);
  }, [past]);

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
      // Every step is ours, so focusing the sticky button never scrolls the page.
      e.preventDefault();
      const i = items.indexOf(document.activeElement as HTMLElement);
      const n = items.length;
      const to = items[i < 0 ? 0 : (i + (e.shiftKey ? n - 1 : 1)) % n];
      to.focus({ preventScroll: true });
      // A short window (or 200% zoom) scrolls the panel: keep focus in sight.
      if (panel.current!.contains(to)) to.scrollIntoView({ block: "nearest" });
    };
    const wide = matchMedia(`(width >= ${STACK_PX}px)`);
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

  // A tap anywhere on a settings row presses its control. A pointer
  // convenience only: the control itself is the keyboard stop.
  const tapRow = (e: React.MouseEvent<HTMLLIElement>) => {
    if (!(e.target as Element).closest("button")) e.currentTarget.querySelector("button")?.click();
  };

  // On home the logo has nowhere to go, so it takes you back to the top
  // (and drops a #contact from the address). Other pages route home as usual.
  const homeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== "/" || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (location.hash) history.replaceState(history.state, "", "/");
    if (!open) return scrollToTop();
    // The open menu locks the page; wait a frame for it to let go.
    setOpen(false);
    requestAnimationFrame(scrollToTop);
  };

  const links = [...NAV, { href: "#contact", label: "Contact" }];

  return (
    <>
      <header className="hd frame" data-past={past}>
        <div className="side" />
        <div className="bar">
          <Link href="/" className="home" aria-label="Wessel Oud, home" onClick={homeClick}>
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
        // Stopped Lenis eats every wheel unless told: the panel scrolls itself.
        data-lenis-prevent
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
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={pathname.startsWith(href) ? "page" : undefined}
              >
                {label}
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
