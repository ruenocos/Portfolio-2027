import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Suspense } from "react";
import { Shell } from "@/components/shell/Shell";
import { LiveEditing } from "@/sanity/LiveEditing";

// Every site page gets the shell. Sanity Studio lives outside this group,
// so it gets none of it. LiveEditing connects the Studio's Presentation
// tool (click-to-edit, drafts) and keeps published content fresh.
// Vercel Web Analytics and Speed Insights count the site only, never the Studio.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Shell>{children}</Shell>
      <Suspense fallback={null}>
        <LiveEditing />
      </Suspense>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
