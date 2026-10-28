"use client";

import { useLayoutEffect } from "react";
import { restoreHtml } from "@/lib/html";

// Puts back what the <head> scripts set on <html> if a failed hydration
// wiped it (lib/html). A layout effect, so it lands before the intro, the
// motion store or the entrance look at <html>.
export function KeepHtml() {
  useLayoutEffect(restoreHtml, []);
  return null;
}
