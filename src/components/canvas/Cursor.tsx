import { forwardRef } from "react";
import { POINTER, POINTER_BOX } from "@/lib/wessel";

// A cursor on the canvas: pointer arrow + name tag (DESIGN.md §6).
// wes = Wessel (tangerine, his ink), you = the visitor (grape),
// bot = a night bot (ink by day, dashed silver outline at night).
// staticDemo renders it in the flow, for /system.
type Props = {
  kind: "wes" | "you" | "bot";
  name: string;
  asleep?: boolean;
  /** Asleep only: show his note too. */
  note?: boolean;
  staticDemo?: boolean;
  /** Pinned to the viewport above everything (the You cursor). */
  fixed?: boolean;
};

export const Cursor = forwardRef<HTMLDivElement, Props>(function Cursor(
  { kind, name, asleep, note, staticDemo, fixed },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`cur ${kind}`}
      aria-hidden="true"
      data-static={staticDemo ? "" : undefined}
      data-asleep={asleep ? "true" : undefined}
      data-note={note ? "true" : undefined}
      data-fixed={fixed ? "" : undefined}
      data-hide={fixed ? "true" : undefined}
    >
      <svg className="ptr" viewBox={POINTER_BOX} aria-hidden="true">
        <path d={POINTER} />
      </svg>
      <span className="lab">
        <span className="tag text-cursor-tag">
          <b>{name}</b>
        </span>
        {kind === "wes" && <span className="note text-small">Off the clock. Click me if it’s urgent.</span>}
      </span>
      {kind === "wes" && (
        <i className="zz text-micro" aria-hidden="true">
          z z
        </i>
      )}
    </div>
  );
});
