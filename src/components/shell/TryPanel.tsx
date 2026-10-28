"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AWAY_LINES, TRIES, getTry, loadTries, setTry, subscribeTry, type TryKey } from "@/lib/try";

/** PREVIEW ONLY: the current pick for one idea. */
export function useTry(k: TryKey) {
  return useSyncExternalStore(subscribeTry, () => getTry(k), () => TRIES.find((t) => t.key === k)!.opts[0][0]);
}

// PREVIEW ONLY (polish pass): a "Preview" pill bottom-left that opens the
// switches. Every idea starts on Now, so flipping one is the before/after.
export function TryPanel() {
  const [open, setOpen] = useState(false);
  const away = useTry("away");
  useEffect(() => loadTries(), []);

  // Away tab: the title changes while the tab is hidden, and comes back.
  useEffect(() => {
    if (away === "off") return;
    let was = "";
    const flip = () => {
      if (document.hidden) {
        was = document.title;
        document.title = `${AWAY_LINES[away as keyof typeof AWAY_LINES]} · Wessel Oud`;
      } else if (was) {
        document.title = was;
        was = "";
      }
    };
    document.addEventListener("visibilitychange", flip);
    return () => document.removeEventListener("visibilitychange", flip);
  }, [away]);

  return (
    <div className="tryp" data-open={open}>
      {open && (
        <div className="tryl" role="group" aria-label="Preview switches">
          {TRIES.map((t) => (
            <Row key={t.key} k={t.key} label={t.label} opts={t.opts} />
          ))}
        </div>
      )}
      <button type="button" className="tryb text-micro-caps" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Close" : "Preview"}
      </button>
    </div>
  );
}

function Row({ k, label, opts }: { k: TryKey; label: string; opts: readonly (readonly [string, string])[] }) {
  const v = useTry(k);
  return (
    <div className="tryr">
      <span className="text-small">{label}</span>
      <div>
        {opts.map(([o, l]) => (
          <button key={o} type="button" aria-pressed={v === o} onClick={() => setTry(k, o)} className="text-micro-caps">
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
