"use client";

import { useEffect, useState } from "react";

const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
// The zone after the time, as on the home hero ("13:14 CET"), so the two
// places that tell his time say it the same way.
const zone = () =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", timeZoneName: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value ?? "";

/**
 * "Netherlands, 14:32 CET": where Wessel is and his local time, as one
 * still line (no pill, no lamp: it's information, not a button). The time
 * appears after hydration, so the server never renders a stale one.
 */
export function Status({ className = "" }: { className?: string }) {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setTime(`${clock.format(new Date())} ${zone()}`.trim());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return (
    <p className={`status text-label ${className}`}>
      Netherlands
      {time && (
        <>
          , <time>{time}</time>
        </>
      )}
    </p>
  );
}
