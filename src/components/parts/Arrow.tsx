// The site's one arrow icon (Wons, 2026-10-27: drawn icons, not glyphs).
// One shape, rotated: → inside the site, ↗ leaves it, ↓ scrolls down,
// ← back, ↑ to the top. 1.5px stroke at every size, round ends, current
// colour; sized by the text around it.
const TURN = { right: 0, out: -45, down: 90, left: 180, up: -90 } as const;
export type ArrowDir = keyof typeof TURN;

export function Arrow({ dir = "right", className = "" }: { dir?: ArrowDir; className?: string }) {
  return (
    <svg className={`arw ${className}`} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <g transform={`rotate(${TURN[dir]} 8 8)`}>
        <path
          d="M2.5 8h11M9 3.5 13.5 8 9 12.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}
