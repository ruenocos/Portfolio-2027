import type { Metadata } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import "./globals.css";

// Variable Archivo with the width axis, so headlines can stretch.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Wessel, UI/UX designer and design engineer",
    template: "%s | Wessel",
  },
  description: "I design interfaces, animate them, and automate the boring parts so teams ship better work.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
