import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { WorkStage } from "@/components/WorkStage";
import { WithContent } from "@/components/WithContent";
import { getProjects } from "@/content/get";

export const metadata: Metadata = { title: "Work" };

export default function WorkPage() {
  return (
    <>
      <PageIntro title="Work" text="Interfaces, motion and the tools behind them." />
      <WithContent render={async (options) => <WorkStage projects={await getProjects(options)} />} />
    </>
  );
}
