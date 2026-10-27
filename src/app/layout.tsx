import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono, Instrument_Serif } from "next/font/google";
import { ModeProvider } from "@/components/ModeProvider";
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
        {/* Sets data-mode before the first paint, so night never flashes light. */}
        <script dangerouslySetInnerHTML={{ __html: modeScript }} />
      </head>
      <body>
        {children}
        <ModeProvider />
      </body>
    </html>
  );
}
