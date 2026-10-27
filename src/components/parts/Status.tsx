"use client";

import { useEffect, useState } from "react";
import { useMotion } from "@/components/useMotion";

const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

/**
 * "Awake in Amsterdam, 14:32": Wessel's state and his local time, as one
 * still line (no pill, no lamp: it's information, not a button). The time
 * appears after hydration, so the server never renders a stale one.
 */
export function Status({ className = "" }: { className?: string }) {
  const { asleep } = useMotion();
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setTime(clock.format(new Date()));
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return (
    <p className={`status text-label ${className}`}>
      {asleep ? "Asleep" : "Awake"} in Amsterdam
      {time && (
        <>
          , <time>{time}</time>
        </>
      )}
    </p>
  );
}
