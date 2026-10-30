"use client";

import { useEffect } from "react";
import { markHydrated } from "@/lib/hydration";

// The part of the page that changes between routes. PageSwitch plays the
// change itself (DOM veil or content fade), so this is just the wrapper.
// Its effect runs once its whole subtree, the page, has hydrated (pages
// stream no Suspense holes), which is the scroll system's go-ahead.
export function PageFade({ children }: { children: React.ReactNode }) {
  useEffect(markHydrated, []);
  return <div className="page-body">{children}</div>;
}
