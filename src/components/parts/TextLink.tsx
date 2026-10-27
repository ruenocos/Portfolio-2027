import Link from "next/link";
import { Hop } from "@/components/shell/Hop";
import { Arrow, type ArrowDir } from "./Arrow";

// A text link with the letter hop and its arrow icon (DESIGN.md §6, Arrows):
// right inside the site, out leaves it (mute), down scrolls, left back, up top.
// External links open in a new tab.

export function TextLink({
  href,
  label,
  arrow,
  className = "",
  title,
}: {
  href: string;
  label: string;
  arrow?: ArrowDir;
  className?: string;
  title?: string;
}) {
  const external = /^https?:/.test(href);
  const mark = arrow && (
    <span className={`ar${arrow === "out" ? " ext" : ""}`} aria-hidden="true">
      <Arrow dir={arrow} />
    </span>
  );
  const inner = (
    <>
      {arrow === "left" && mark}
      <Hop text={label} />
      {arrow !== "left" && mark}
    </>
  );
  const cls = `tlink text-link ${className}`;
  if (external)
    return (
      <a className={cls} href={href} target="_blank" rel="noopener" title={title}>
        {inner}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  if (href.startsWith("#"))
    return (
      <a className={cls} href={href} title={title}>
        {inner}
      </a>
    );
  return (
    <Link className={cls} href={href} title={title}>
      {inner}
    </Link>
  );
}
