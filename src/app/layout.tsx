import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono, Instrument_Serif } from "next/font/google";
import { KeepHtml } from "@/components/KeepHtml";
import { ModeProvider } from "@/components/ModeProvider";
import { snapshotScript } from "@/lib/html";
import { bootScript, motionScript } from "@/lib/motion";
import { modeScript, themeColorScript } from "@/lib/mode";
import { IS_PRODUCTION, SITE_URL } from "@/lib/site";
import "./globals.css";

// next/font sets --nf-*; tokens.css puts them in front of the fallbacks.
const display = Bricolage_Grotesque({ variable: "--nf-display", subsets: ["latin"], axes: ["opsz"] });
const mono = Geist_Mono({ variable: "--nf-mono", subsets: ["latin"], weight: ["500"] });
const serif = Instrument_Serif({ variable: "--nf-serif", subsets: ["latin"], weight: "400", style: "italic" });

// The description is the hero's role line (DESIGN.md §6, approved copy).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Wessel Oud", template: "%s · Wessel Oud" },
  description: "Medior UI/UX and motion designer.",
  openGraph: { siteName: "Wessel Oud", type: "website", locale: "en" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-mode="light"
      data-live={IS_PRODUCTION ? "" : undefined}
      suppressHydrationWarning
      className={`${display.variable} ${mono.variable} ${serif.variable}`}
    >
      <head>
        {/* Sets the mode and the motion state before the first paint,
            so dark never flashes light and a paused visit never moves. */}
        <meta name="theme-color" content="#FAF8F4" />
        <script dangerouslySetInnerHTML={{ __html: [modeScript, themeColorScript, bootScript, motionScript, snapshotScript].join(";") }} />
      </head>
      <body>
        <KeepHtml />
        {children}
        <p id="live" className="sr-only" aria-live="polite" />
        <ModeProvider />
      </body>
    </html>
  );
}
