"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getMotion } from "@/lib/motion";
import { runEntrance } from "@/lib/entrance";

const isCase = (path: string | null) => !!path && /^\/work\/[^/]+$/.test(path);
let here: string | null = null;
let from: string | null = null;

declare global {
  interface Window {
    __wslEntered?: string;
  }
}

// The house entrance (lib/entrance) on every page change. The first load
// already entered from the inline script in the shell, on first paint.
// Skipped while calm, and on home's first visit (<html data-boot>), which
// has its own intro; later visits to home enter like every other page, hero first.
// Case to case, the case bar holds still (PageSwitch leaves it uncovered).
export function Entrance() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (here !== pathname) [from, here] = [here, pathname];
    const entered = window.__wslEntered === pathname;
    window.__wslEntered = undefined;
    if (getMotion().calm || root.dataset.boot || entered) return root.classList.remove("entering");
    runEntrance(isCase(from) && isCase(pathname));
  }, [pathname]);

  return null;
}
