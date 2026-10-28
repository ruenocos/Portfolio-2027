import { forwardRef } from "react";
import { POINTER, POINTER_BOX } from "@/lib/wessel";

// A cursor on the canvas: pointer arrow + name tag (DESIGN.md §6).
// wes = Wessel (tangerine, his ink), you = the visitor (grape).
// staticDemo renders it in the flow, for /system.
type Props = {
  kind: "wes" | "you";
  name: string;
  staticDemo?: boolean;
  /** Pinned to the viewport above everything (the You cursor). */
  fixed?: boolean;
};

export const Cursor = forwardRef<HTMLDivElement, Props>(function Cursor({ kind, name, staticDemo, fixed }, ref) {
  return (
    <div
      ref={ref}
      className={`cur ${kind}`}
      aria-hidden="true"
      data-static={staticDemo ? "" : undefined}
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
      </span>
    </div>
  );
});
