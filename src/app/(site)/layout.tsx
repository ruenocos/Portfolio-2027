import { Suspense } from "react";
import { Shell } from "@/components/shell/Shell";
import { LiveEditing } from "@/sanity/LiveEditing";

// Every site page gets the shell. Sanity Studio lives outside this group,
// so it gets none of it. LiveEditing connects the Studio's Presentation
// tool (click-to-edit, drafts) and keeps published content fresh.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Shell>{children}</Shell>
      <Suspense fallback={null}>
        <LiveEditing />
      </Suspense>
    </>
  );
}
