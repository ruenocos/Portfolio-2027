"use client";

import { useEffect, useState } from "react";
import { localTime } from "@/lib/clock";

/**
 * "Netherlands, 14:32 CET": where Wessel is and his local time, as one
 * still line (no pill, no lamp: it's information, not a button). The time
 * appears after hydration, so the server never renders a stale one.
 */
export function Status({ className = "", gap }: { className?: string; gap?: string }) {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setTime(localTime());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return (
    <p className={`status text-label ${className}`} data-gap={gap}>
      Netherlands
      {time && (
        <>
          , <time>{time}</time>
        </>
      )}
    </p>
  );
}
