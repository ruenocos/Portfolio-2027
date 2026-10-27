import { TOOLS, knownTools, toolSrc, type ToolId } from "@/lib/tools";

// Tool chips: brand logos as circles, 56 in the Daily kit, 32 in project
// rows. An empty list renders nothing, and its "Tools" label hides (CSS).
export function Tools({ ids, size = 32, label }: { ids: readonly ToolId[]; size?: 32 | 56; label?: string }) {
  return (
    <ul className="tools" data-size={size} aria-label={label}>
      {knownTools(ids).map((id) => (
        <li key={id} className="tool">
          {/* eslint-disable-next-line @next/next/no-img-element -- brand SVGs, served as they are */}
          <img src={toolSrc(id)} alt={TOOLS[id].name} width={size} height={size} />
        </li>
      ))}
    </ul>
  );
}

/** A dashed circle where a tool is still to come. */
export function EmptyTool({ size = 32 }: { size?: 32 | 56 }) {
  return (
    <ul className="tools" data-size={size} aria-hidden="true">
      <li className="tool empty" />
    </ul>
  );
}
