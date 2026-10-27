// Pills and chips (DESIGN.md §6). One component per kind; the prototype's
// copies are merged into these (component-inventory_v01.md, merge list).

type Children = { children: React.ReactNode; className?: string };

/** Wessel's measurements: "203 × 116". Tangerine, Micro. */
export function SizePill({ children, className = "" }: Children) {
  return <span className={`szp text-micro ${className}`}>{children}</span>;
}

/** Yours to touch. small = Micro caps label ("▶ Reel"), tap = 44 tall. */
export function GrapePill({ children, size = "small", className = "" }: Children & { size?: "small" | "tap" }) {
  return (
    <span className={`gpill ${size === "small" ? "text-micro-caps" : "text-label"} ${className}`} data-size={size}>
      {children}
    </span>
  );
}

/** Outline pill. With a lamp it's the About status ("Wessel is awake"). */
export function OutlinePill({ children, lamp = false, className = "" }: Children & { lamp?: boolean }) {
  return (
    <span className={`opill text-label ${className}`}>
      {lamp && <span className="lamp" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** ⌘C / ⌘V. Ink fill, canvas text, radius 6. */
export function KeyChip({ children, className = "" }: Children) {
  return <kbd className={`kchip text-micro ${className}`}>{children}</kbd>;
}

/** Marks placeholder copy or data, so nothing invented ships unmarked. */
export function MockTag({ children = "mock", className = "" }: Partial<Children>) {
  return <span className={`mock text-micro-caps ${className}`}>{children}</span>;
}

/** An inline gap where a real value is still missing. */
export function Slot({ children, className = "" }: Children) {
  return (
    <span className={`slot ${className}`} data-mock>
      {children}
    </span>
  );
}
