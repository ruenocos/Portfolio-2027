import type { Metadata } from "next";
import Link from "next/link";
import { WorkList } from "@/components/work/WorkList";
import { getWork } from "@/content/get";
import { getDraftFetchOptions } from "@/sanity/live";

export const metadata: Metadata = {
  title: "Work",
  description: "Every project, filterable by tool.",
};

export default async function WorkPage() {
  const projects = await getWork(await getDraftFetchOptions());
  return (
    <>
      <section className="frame" data-row aria-label="Work">
        <div className="side" />
        <div className="cell whero bg-dots">
          <h1 className="text-statement">Work</h1>
          {/* The work itself opens the page: a loose hand of every poster,
              each one a way into its project (the rows below say the same). */}
          <div className="whand" aria-hidden="true">
            {projects.map((p, i) => (
              <Link key={p.title} href={p.href ?? "/work"} tabIndex={-1} style={{ "--i": i - (projects.length - 1) / 2 } as React.CSSProperties}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.media.poster && <img src={p.media.poster} alt="" loading="lazy" decoding="async" />}
              </Link>
            ))}
          </div>
        </div>
        <div className="side" />
      </section>
      <WorkList projects={projects} />
    </>
  );
}
