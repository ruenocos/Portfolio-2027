import { forwardRef } from "react";
import { Smiley } from "@/components/shell/Smiley";

// Comment pin: Wessel's smiley avatar + a bubble (radius 4/16/16/16, Small).
// note = the tinted, tilted sticky variant. dot = shrunk after it's read.
// live pins are driven by a beat: hidden until Wessel drops one, and only
// one on screen at a time (showPin in lib/wessel).
type Props = {
  children: React.ReactNode;
  note?: boolean;
  dot?: boolean;
  live?: boolean;
  staticDemo?: boolean;
  className?: string;
  style?: React.CSSProperties;
  "data-mock"?: string;
};

export const Pin = forwardRef<HTMLDivElement, Props>(function Pin(
  { children, note, dot, live, staticDemo, className = "", style, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`pin ${className}`}
      aria-hidden="true"
      hidden={live}
      data-live={live ? "" : undefined}
      data-static={staticDemo ? "" : undefined}
      data-dot={dot ? "true" : undefined}
      style={style}
      {...rest}
    >
      <span className="av">
        <Smiley />
      </span>
      <span className="bub text-small" data-note={note ? "" : undefined}>
        {children}
      </span>
    </div>
  );
});
