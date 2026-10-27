import type { Metadata } from "next";
import tokens from "../../../design/tokens.json";
import { ModeSwitch } from "./ModeSwitch";

// Build check for the token pipeline: every colour and text style,
// rendered in all three modes side by side. Not a public page.
export const metadata: Metadata = { title: "System", robots: { index: false } };

const MODES = ["light", "dark", "night"] as const;
type Style = { $value: Record<string, string | number>; $description?: string };
const types = Object.entries(tokens.type as Record<string, Style>);

function spec(s: Style["$value"]) {
  const family = String(s.fontFamily).replace(/[{}]|font\./g, "");
  return `${family} ${s.fontWeight} · ${s.fontSize} · lh ${s.lineHeight}`;
}

export default function SystemPage() {
  return (
    <main className="frame min-h-svh">
      <div className="bg-dots bg-canvas" />
      <div className="ruled">
        <header className="bg-canvas p-inset flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-label text-mute">
              <span className="text-tang-ink">#</span> System
            </p>
            <h1 className="text-statement mt-4">Tokens v02</h1>
          </div>
          <ModeSwitch />
        </header>

        <section className="ruled stack:grid-cols-3">
          {MODES.map((mode) => (
            <div key={mode} data-mode={mode} className="bg-canvas text-ink p-inset">
              <p className="text-label text-mute mb-6">
                <span className="text-tang-ink">#</span> {mode}
              </p>
              <ul className="ruled grid-cols-2">
                {Object.entries(tokens.color[mode]).map(([name, t]) => (
                  <li key={name} className="bg-canvas p-3 flex items-center gap-3">
                    <span
                      className="size-8 shrink-0 rounded-pill border border-line"
                      style={{ background: `var(--${name})` }}
                    />
                    <span className="min-w-0">
                      <span className="text-micro block">{name}</span>
                      <span className="text-micro text-mute block">{t.$value}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="text-micro rounded-pill bg-tang text-on-tang px-2.5 py-1">203 × 116</span>
                <span className="text-micro-caps rounded-pill bg-grape text-on-grape px-2.5 py-1">▶ Reel</span>
                <span className="text-micro rounded-[6px] bg-ink text-canvas px-2 py-1">⌘C</span>
                <a href="#top" className="text-label text-grape">Link →</a>
              </div>
            </div>
          ))}
        </section>

        <section className="bg-canvas p-inset">
          <p className="text-label text-mute mb-6">
            <span className="text-tang-ink">#</span> Type
          </p>
          <ul className="ruled">
            {types.map(([name, t]) => (
              <li key={name} className="bg-canvas py-6 grid gap-2 stack:grid-cols-[220px_1fr] stack:items-baseline">
                <span className="text-micro text-mute">
                  {name}
                  <br />
                  {spec(t.$value)}
                </span>
                <span className={`text-${name} overflow-hidden text-ellipsis whitespace-nowrap`}>Wessel Oud</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="bg-dots bg-canvas" />
    </main>
  );
}
