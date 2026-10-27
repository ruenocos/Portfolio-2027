// One row of the canvas: dotted side | content | dotted side, sharing 1px
// hairlines with its neighbours. Rows in <main> get the house entrance.
export function Row({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "footer" }) {
  return (
    <Tag className="frame" data-row {...rest}>
      <div className="side" />
      <div className={`cell ${className}`}>{children}</div>
      <div className="side" />
    </Tag>
  );
}
