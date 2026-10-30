// The site's one arrow icon, drawn rather than a glyph.
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

/** The drawn play mark for "Reel" (the same shape as the Pause button's play). */
export function Play({ className = "" }: { className?: string }) {
  return (
    <svg className={`arw ${className}`} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4.5 2.9v10.2c0 .6.6.9 1.1.6l8-5.1c.5-.3.5-.9 0-1.2l-8-5.1c-.5-.3-1.1 0-1.1.6z" fill="currentColor" />
    </svg>
  );
}
