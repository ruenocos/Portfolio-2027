import { ImageResponse } from "next/og";
import tokens from "../../design/tokens.json";
import { FACE, FEATURES } from "@/lib/smiley";

// The link preview for every page (Slack, LinkedIn, iMessage, X). The hero's
// name with the smiley where the reel sits: "Wessel [smiley] Oud", nothing
// else (Wons, 2026-10-28). Platforms print the title and description under
// it. Light mode, built once.

export const alt = "Wessel Oud, with his smiley logo between the two names";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const c = tokens.color.light;
const NAME = 148;

// Bricolage Grotesque as TTF (the renderer can't read woff2), cut down to the
// letters we set. Cached, so the image is built once instead of per visit.
async function font(family: string, text: string) {
  "use cache";
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`)
  ).text();
  const url = css.match(/src: url\((.+?)\)/)?.[1];
  if (!url) throw new Error(`No font file for ${family}`);
  return (await fetch(url)).arrayBuffer();
}

// The canvas's dotted side band. Drawn as circles: the renderer doesn't
// repeat a gradient background.
const STEP = 24;
function Dots() {
  const cols = 4;
  const rows = Math.ceil(size.height / STEP);
  return (
    <svg width={cols * STEP} height={size.height}>
      {Array.from({ length: cols * rows }, (_, i) => (
        <circle key={i} cx={12 + (i % cols) * STEP} cy={12 + Math.floor(i / cols) * STEP} r={2} fill={c.dot.$value} />
      ))}
    </svg>
  );
}

export default async function Image() {
  const display = await font("Bricolage+Grotesque:opsz,wght@96,800", "WesselOud");
  const line = `2px solid ${c.line.$value}`;
  const tang = c.tang.$value;
  const word = { fontSize: NAME, lineHeight: 1, letterSpacing: "-0.04em" };

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: c.canvas.$value,
          color: c.ink.$value,
          fontFamily: "Bricolage",
        }}
      >
        <div style={{ display: "flex", borderRight: line }}>
          <Dots />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
          <span style={word}>Wessel</span>
          <svg width="116" height="116" viewBox="0 0 212 212">
            <path fill={tang} fillRule="evenodd" d={FACE} />
            <path fill={tang} d={FEATURES} />
          </svg>
          <span style={word}>Oud</span>
        </div>
        <div style={{ display: "flex", borderLeft: line }}>
          <Dots />
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Bricolage", data: display, weight: 800, style: "normal" }] },
  );
}
