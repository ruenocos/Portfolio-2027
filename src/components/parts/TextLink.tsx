import Link from "next/link";
import { Hop } from "@/components/shell/Hop";

// A text link with the letter hop and its arrow (DESIGN.md §6, Arrows):
// → inside the site, ↗ leaves it (mono, mute), ↓ scrolls down, ← back, ↑ top.
// External links open in a new tab.
type Arrow = "→" | "↗" | "↓" | "←" | "↑";

export function TextLink({
  href,
  label,
  arrow,
  className = "",
  title,
}: {
  href: string;
  label: string;
  arrow?: Arrow;
  className?: string;
  title?: string;
}) {
  const external = /^https?:/.test(href);
  const mark = arrow && (
    <span className={`ar${arrow === "↗" ? " ext" : ""}`} aria-hidden="true">
      {arrow}
    </span>
  );
  const inner = (
    <>
      {arrow === "←" && mark}
      <Hop text={label} />
      {arrow !== "←" && mark}
    </>
  );
  const cls = `tlink text-label ${className}`;
  if (external)
    return (
      <a className={cls} href={href} target="_blank" rel="noopener" title={title}>
        {inner}
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
