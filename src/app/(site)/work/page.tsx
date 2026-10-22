import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { WorkStage } from "@/components/WorkStage";
import { getProjects } from "@/content/get";

export const metadata: Metadata = { title: "Work" };

export default async function WorkPage() {
  const projects = await getProjects();

  return (
    <>
      <PageIntro title="Work" text="Interfaces, motion and the tools behind them." />
      <WorkStage projects={projects} />
    </>
  );
}
