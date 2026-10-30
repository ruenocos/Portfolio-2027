import { TextLink } from "./TextLink";

// The bar above a case: back to all work, where you are, next.
export function Crumb({
  back = { href: "/work", label: "All work" },
  count,
  next,
  label = "Case navigation",
}: {
  back?: { href: string; label: string };
  count?: string;
  next?: { label: string; href: string };
  label?: string;
}) {
  return (
    <nav className="frame crumb" data-row aria-label={label}>
      <div className="side" />
      <div className="cell">
        <TextLink href={back.href} label={back.label} arrow="left" />
        {count && <span className="text-label text-mute">{count}</span>}
        {next ? <TextLink href={next.href} label={`Next: ${next.label}`} arrow="right" /> : <span />}
      </div>
      <div className="side" />
    </nav>
  );
}
