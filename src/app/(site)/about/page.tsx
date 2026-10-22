import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { WithContent } from "@/components/WithContent";
import { getSite } from "@/content/get";

export const metadata: Metadata = { title: "About" };

// The animated career timeline comes in the design pass.
export default function AboutPage() {
  return <WithContent render={async (options) => <PageIntro title="About" text={(await getSite(options)).positioning} />} />;
}
