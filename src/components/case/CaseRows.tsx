"use client";

import type { ReactNode } from "react";
import { MediaFill } from "@/components/parts/Media";
import type { CaseMedia, CaseRow } from "@/content/cases";
import { Compare } from "./Compare";

// A tile's picture width, for its srcset sizes.
const SIZE = {
  full: "(width < 900px) 100vw, 860px",
  half: "(width < 600px) 100vw, (width < 900px) 50vw, 420px",
  third: "(width < 600px) 100vw, (width < 900px) 33vw, 280px",
} as const;

/** One picture or loop: a button that opens it in the viewer. */
function Tile({
  m,
  vi,
  layout,
  open,
  pin,
}: {
  m: CaseMedia;
  vi: number;
  layout: keyof typeof SIZE;
  open: (vi: number, el: HTMLElement) => void;
  pin?: ReactNode;
}) {
  return (
    <figure className="ctile">
      <button
        type="button"
        className="media cmed"
        data-ratio="free"
        data-vi={vi}
        data-you="Open"
        style={{ aspectRatio: `${m.width}/${m.height}` }}
        aria-label={`Open: ${m.alt}`}
        onClick={(e) => open(vi, e.currentTarget)}
      >
        {/* Loops in a case run at 1×: they're cut as screen recordings, not mood. */}
        <MediaFill poster={m.src} video={m.video} alt={m.alt} rate={1} sizes={SIZE[layout]} />
      </button>
      {pin}
    </figure>
  );
}

/**
 * A section's media rows: 1, 2 or 3 across, or a before/after. `first` is
 * the viewer index of the section's first tile, so every tile on the page
 * steps through one set.
 */
export function CaseRows({
  rows,
  first,
  open,
  pin,
}: {
  rows: CaseRow[];
  first: number;
  open: (vi: number, el: HTMLElement) => void;
  /** Wessel's note, on the first tile. */
  pin?: ReactNode;
}) {
  let vi = first;
  return (
    <div className="crows">
      {rows.map((r) =>
        r.kind === "compare" ? (
          <Compare key={r.key} before={r.before} after={r.after} labels={r.labels} />
        ) : (
          <div key={r.key} className="crow" data-layout={r.layout} data-enter>
            {r.items.map((m, i) => (
              <Tile key={i} m={m} vi={vi++} layout={r.layout} open={open} pin={vi === first + 1 ? pin : undefined} />
            ))}
          </div>
        ),
      )}
    </div>
  );
}
