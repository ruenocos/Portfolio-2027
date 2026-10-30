"use client";

import { useRef, useState } from "react";
import { TOOLS, knownTools, toolSrc, type ToolId } from "@/lib/tools";
import { announce } from "@/lib/motion";

// Work page: filter projects by tool. The picked chips ring in grape and
// lift; the rest dim, exactly like the Daily kit hover. "Show all" clears.
// single: one tool at a time (picking another swaps), so every pick has work.
export function ToolFilter({
  ids,
  single = false,
  onChange,
}: {
  ids: readonly ToolId[];
  single?: boolean;
  onChange?: (picked: ToolId[]) => void;
}) {
  const [picked, setPicked] = useState<ToolId[]>([]);
  const group = useRef<HTMLDivElement>(null);
  const set = (next: ToolId[]) => {
    setPicked(next);
    onChange?.(next);
    announce(
      next.length ? `Showing work made with ${next.map((id) => TOOLS[id].name).join(", ")}` : "Showing all work",
    );
  };
  return (
    <div className="tfilter">
      <div ref={group} className="tools" data-size={56} role="group" aria-label="Filter by tool">
        {knownTools(ids).map((id) => {
          const on = picked.includes(id);
          return (
            <button
              key={id}
              type="button"
              className="tool"
              data-tool={id}
              aria-pressed={on}
              aria-label={TOOLS[id].name}
              title={TOOLS[id].name}
              onClick={() => set(on ? picked.filter((p) => p !== id) : single ? [id] : [...picked, id])}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- brand SVGs, served as they are */}
              <img src={toolSrc(id)} alt="" width={56} height={56} loading="lazy" />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="clr text-link"
        // Kept in place while hidden, so picking a tool doesn't shift the rows.
        style={picked.length ? undefined : { visibility: "hidden" }}
        aria-hidden={!picked.length || undefined}
        onClick={() => {
          set([]);
          // It hides itself, so focus goes back to the first chip.
          group.current?.querySelector<HTMLButtonElement>("button.tool")?.focus();
        }}
      >
        Show all
      </button>
    </div>
  );
}
