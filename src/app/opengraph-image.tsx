import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import tokens from "../../design/tokens.json";
import { FALLBACK_HOME } from "@/content/home";
import { FACE, FEATURES } from "@/lib/smiley";
import { POINTER, POINTER_BOX } from "@/lib/wessel";

// The link preview for every page (Slack, LinkedIn, iMessage, X). No text:
// platforms print the title and description under it. A canvas moment
// (Wons picked C, 2026-10-28): Wessel has just selected your first look at
// him, with the size pill, beside the smiley. Light mode, built once.

export const alt = "A photo of Wessel Oud, selected by his tangerine cursor, next to his smiley logo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const c = tokens.color.light;
const PHOTO = FALLBACK_HOME.about.photos[0].src; // the portrait
// The photo frame and its selection, in image pixels.
const FRAME = { x: 300, y: 112, w: 300, h: 400 };

// Google Fonts hands back a TTF (which the renderer needs) cut down to the
// letters we draw. Cached, so the image is built once instead of per visit.
async function font(family: string, text: string) {
  "use cache";
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`)
  ).text();
  const url = css.match(/src: url\((.+?)\)/)?.[1];
  if (!url) throw new Error(`No font file for ${family}`);
  return (await fetch(url)).arrayBuffer();
}

// The portrait as a data URL. Cached like the fonts, so the image stays static.
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
  const [mono, tag, photo] = await Promise.all([
    font("Geist+Mono:wght@500", `${FRAME.w} × ${FRAME.h}`),
    font("Bricolage+Grotesque:opsz,wght@12,700", "Wessel"),
    photoData(),
  ]);
  const line = `2px solid ${c.line.$value}`;
  const tang = c.tang.$value;
  const handle = (pos: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        width: 18,
        height: 18,
        borderRadius: 9,
        background: c.canvas.$value,
        border: `3px solid ${tang}`,
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
        <div style={{ flex: 1, position: "relative", display: "flex" }}>
          <img
            src={photo}
            width={FRAME.w}
            height={FRAME.h}
            style={{ position: "absolute", left: FRAME.x - 96, top: FRAME.y, borderRadius: 24, objectFit: "cover" }}
            alt=""
          />
          {/* Wessel's selection: hairline box, round handles, the size pill under it. */}
          <div
            style={{
              position: "absolute",
              left: FRAME.x - 96 - 6,
              top: FRAME.y - 6,
              width: FRAME.w + 12,
              height: FRAME.h + 12,
              border: `3px solid ${tang}`,
              display: "flex",
            }}
          >
            {handle({ left: -11, top: -11 })}
            {handle({ right: -11, top: -11 })}
            {handle({ right: -11, bottom: -11 })}
            {handle({ left: -11, bottom: -11 })}
          </div>
          <div
            style={{
              position: "absolute",
              left: FRAME.x - 96 + FRAME.w / 2 - 70,
              top: FRAME.y + FRAME.h + 22,
              width: 140,
              height: 34,
              borderRadius: 17,
              background: tang,
              color: c["on-tang"].$value,
              fontFamily: "Mono",
              fontSize: 19,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {`${FRAME.w} × ${FRAME.h}`}
          </div>
          {/* Wessel's cursor, just let go at the bottom-right handle. */}
          <div style={{ position: "absolute", left: FRAME.x - 96 + FRAME.w - 4, top: FRAME.y + FRAME.h - 22, display: "flex" }}>
            <svg width="40" height="40" viewBox={POINTER_BOX}>
              <path d={POINTER} fill={tang} stroke={c.canvas.$value} strokeWidth="1.2" />
            </svg>
            <div
              style={{
                marginTop: 30,
                height: 40,
                padding: "0 18px",
                display: "flex",
                alignItems: "center",
                borderRadius: "6px 20px 20px 20px",
                background: tang,
                color: c["on-tang"].$value,
                fontFamily: "Tag",
                fontSize: 23,
                boxShadow: "0 8px 16px -8px rgba(22,20,18,.45)",
              }}
            >
              Wessel
            </div>
          </div>
          {/* The brand mark, big, on the right. */}
          <svg
            width="250"
            height="250"
            viewBox="0 0 212 212"
            style={{ position: "absolute", left: 736 - 96, top: 168, transform: "rotate(-6deg)" }}
          >
            <path fill={tang} fillRule="evenodd" d={FACE} />
            <path fill={tang} d={FEATURES} />
          </svg>
        </div>
        <div style={{ display: "flex", borderLeft: line }}>
          <Dots />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Mono", data: mono, weight: 500 },
        { name: "Tag", data: tag, weight: 700 },
      ],
    },
  );
}
