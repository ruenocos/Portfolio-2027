import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { getSite } from "@/content/get";

export const metadata: Metadata = { title: "About" };

// The animated career timeline comes in the design pass.
export default async function AboutPage() {
  const site = await getSite();
  return <PageIntro title="About" text={site.positioning} />;
}
