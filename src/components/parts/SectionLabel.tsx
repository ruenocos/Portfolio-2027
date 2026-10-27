// "{ Selected work }": a section's frame name on the canvas.
// Only the braces are tangerine (tang-ink); the name is ink (DESIGN.md §5).
export function SectionLabel({
  name,
  as: Tag = "h2",
  id,
  className = "",
}: {
  name: string;
  as?: "h1" | "h2" | "h3" | "p";
  id?: string;
  className?: string;
}) {
  return (
    <Tag id={id} className={`slab text-label ${className}`}>
      <span className="br" aria-hidden="true">
        {"{"}
      </span>
      {name}
      <span className="br" aria-hidden="true">
        {"}"}
      </span>
    </Tag>
  );
}
