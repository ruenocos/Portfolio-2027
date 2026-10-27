"use client";

import { usePathname } from "next/navigation";
import { ViewTransition } from "react";

// Every page change is a plain canvas cross-fade: the old page fades out
// over 240ms, then the new one fades in over 240ms (ui easing). Keyed by
// path, so only navigations fade the page, not transitions inside it.
// The header and Wessel's layer stay put.
export function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page" exit="page" default="none">
      <div className="page-body">{children}</div>
    </ViewTransition>
  );
}
