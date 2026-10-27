import type { Metadata } from "next";
import { WorkList } from "@/components/work/WorkList";
import { getWork } from "@/content/get";

export const metadata: Metadata = {
  title: "Work",
  description: "Selected work and the archive, filterable by tool.",
};

export default async function WorkPage() {
  const { selected, archive } = await getWork();
  return (
    <>
      <section className="frame" data-row aria-label="Work">
        <div className="side" />
        <div className="cell whero bg-dots">
          <h1 className="text-statement">Work</h1>
        </div>
        <div className="side" />
      </section>
      <WorkList selected={selected} archive={archive} />
    </>
  );
}
