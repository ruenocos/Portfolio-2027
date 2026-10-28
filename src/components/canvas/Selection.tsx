import { SizePill } from "@/components/parts/Pills";

// Selection: 1.5px tangerine box, 4 round handles, size pill below. Only
// Wessel selects (DESIGN.md §2.5). This is the static one for
// /system; beats make live ones with select() from lib/wessel.
export function Selection({
  width,
  height,
  label = true,
  children,
}: {
  width: number;
  height: number;
  label?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <span className="sel" data-static="" style={{ width, height }} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      {children}
      {label && (
        <SizePill>
          {width} × {height}
        </SizePill>
      )}
    </span>
  );
}
