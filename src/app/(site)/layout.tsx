import { Shell } from "@/components/shell/Shell";

// Every site page gets the shell. Sanity Studio lives outside this group,
// so it gets none of it.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
