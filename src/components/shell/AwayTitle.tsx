"use client";

import { useEffect } from "react";

const AWAY = "Psst, come back · Wessel Oud";

// While the tab is in the background its title calls you back; the page's own title returns with you.
export function AwayTitle() {
  useEffect(() => {
    let was = "";
    const flip = () => {
      if (document.hidden) {
        was = document.title;
        document.title = AWAY;
      } else if (was) {
        document.title = was;
        was = "";
      }
    };
    document.addEventListener("visibilitychange", flip);
    return () => document.removeEventListener("visibilitychange", flip);
  }, []);
  return null;
}
