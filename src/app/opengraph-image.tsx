import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import tokens from "../../design/tokens.json";
import { FALLBACK_HOME } from "@/content/home";
import { FACE, FEATURES } from "@/lib/smiley";

// The link preview for every page (Slack, LinkedIn, iMessage, X). No text:
// platforms print the title and description under it. Just the logo and a
// small portrait in Wessel's selection handles (Wons, 2026-10-28: "logo,
// picture small, handles, that's it"). Light mode, built once.

export const alt = "Wessel Oud's smiley logo next to a small portrait of him";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const c = tokens.color.light;
const PHOTO = FALLBACK_HOME.about.photos[0].src; // the portrait
const PIC = { w: 210, h: 280 };

// The portrait as a data URL. Cached, so the image is built once instead of per visit.
async function photoData() {
  "use cache";
  const file = await readFile(join(process.cwd(), "public", PHOTO));
  return `data:image/jpeg;base64,${file.toString("base64")}`;
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
  const photo = await photoData();
  const line = `2px solid ${c.line.$value}`;
  const tang = c.tang.$value;
  const handle = (pos: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        width: 16,
        height: 16,
        borderRadius: 8,
        background: c.canvas.$value,
        border: `2.5px solid ${tang}`,
        ...pos,
      }}
    />
  );

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: c.canvas.$value }}>
        <div style={{ display: "flex", borderRight: line }}>
          <Dots />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 88 }}>
          <svg width="230" height="230" viewBox="0 0 212 212">
            <path fill={tang} fillRule="evenodd" d={FACE} />
            <path fill={tang} d={FEATURES} />
          </svg>
          {/* The portrait inside Wessel's selection: box, round handles. */}
          <div style={{ display: "flex", position: "relative", padding: 6, border: `2.5px solid ${tang}` }}>
            <img src={photo} width={PIC.w} height={PIC.h} style={{ borderRadius: 18, objectFit: "cover" }} alt="" />
            {handle({ left: -9, top: -9 })}
            {handle({ right: -9, top: -9 })}
            {handle({ right: -9, bottom: -9 })}
            {handle({ left: -9, bottom: -9 })}
          </div>
        </div>
        <div style={{ display: "flex", borderLeft: line }}>
          <Dots />
        </div>
      </div>
    ),
    size,
  );
}
