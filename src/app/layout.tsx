import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono, Instrument_Serif } from "next/font/google";
import { CursorLayer } from "@/components/CursorLayer";
import { ModeProvider } from "@/components/ModeProvider";
import { motionScript } from "@/lib/motion";
import { modeScript } from "@/lib/mode";
import "./globals.css";

// next/font sets --nf-*; tokens.css puts them in front of the fallbacks.
const display = Bricolage_Grotesque({ variable: "--nf-display", subsets: ["latin"], axes: ["opsz"] });
const mono = Geist_Mono({ variable: "--nf-mono", subsets: ["latin"], weight: ["500"] });
const serif = Instrument_Serif({ variable: "--nf-serif", subsets: ["latin"], weight: "400", style: "italic" });

export const metadata: Metadata = {
  title: { default: "Wessel Oud", template: "%s · Wessel Oud" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-mode="light"
      suppressHydrationWarning
      className={`${display.variable} ${mono.variable} ${serif.variable}`}
    >
      <head>
        {/* Sets the mode and the motion state before the first paint,
            so night never flashes light and a paused visit never moves. */}
        <script dangerouslySetInnerHTML={{ __html: modeScript + ";" + motionScript }} />
      </head>
      <body>
        {children}
        {/* Wessel's layer sits here so he survives every page change. */}
        <CursorLayer />
        <p id="live" className="sr-only" aria-live="polite" />
        <ModeProvider />
      </body>
    </html>
  );
}
