import type { Metadata } from "next";
import { WorkList } from "@/components/work/WorkList";
import { getWork } from "@/content/get";
import { getDraftFetchOptions } from "@/sanity/live";

export const metadata: Metadata = {
  title: "Work",
  description: "Every project, filterable by tool.",
  alternates: { canonical: "/work" },
};

export default async function WorkPage() {
  const projects = await getWork(await getDraftFetchOptions());
  return (
    <>
      <section className="frame" data-row aria-label="Work">
        <div className="side" />
        <div className="cell whero bg-dots">
          <h1 className="text-statement">Work</h1>
        </div>
        <div className="side" />
      </section>
      <WorkList projects={projects} />
    </>
  );
}
