// "# Selected work · 2/4": a section's frame name on the canvas.
// Only the # is tangerine (tang-ink); the counter is ink (DESIGN.md §5).
export function SectionLabel({
  name,
  n,
  of,
  as: Tag = "h2",
  id,
  className = "",
}: {
  name: string;
  n?: number;
  of?: number;
  as?: "h1" | "h2" | "h3" | "p";
  id?: string;
  className?: string;
}) {
  return (
    <Tag id={id} className={`slab text-label ${className}`}>
      <span className="hash" aria-hidden="true">
        #
      </span>
      {name}
      {n != null && of != null && (
        <span aria-hidden="true">
          {" · "}
          <b>
            {n}/{of}
          </b>
        </span>
      )}
    </Tag>
  );
}
