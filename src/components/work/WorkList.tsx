"use client";

import { useRef, useState } from "react";
import { Divider } from "@/components/parts/Divider";
import { ProjectRow, type Project } from "@/components/parts/ProjectRow";
import { ToolFilter } from "@/components/parts/ToolFilter";
import { getMotion } from "@/lib/motion";
import { TOOLS, knownTools, type ToolId } from "@/lib/tools";

const LEAVE_MS = 200;
const fits = (p: Project, picked: ToolId[]) => !picked.length || picked.some((t) => p.tools.includes(t));

/**
 * Work (approved v03): the home's project rows for all the work, plus one
 * tweak, a tool filter on top. One tool at a time narrows the rows to the
 * work made with it; rows that go fade first, then the rest close up. A group
 * with nothing left hides with its label.
 */
export function WorkList({ selected, archive }: { selected: Project[]; archive: Project[] }) {
  const [picked, setPicked] = useState<ToolId[]>([]);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const t = useRef(0);
  const groups = [
    { name: "Selected work", rows: selected },
    { name: "Archive", rows: archive },
  ];
  // Only offer tools some project was made with.
  const used = knownTools(Object.keys(TOOLS)).filter((id) => [...selected, ...archive].some((p) => p.tools.includes(id)));

  const pick = (next: ToolId[]) => {
    clearTimeout(t.current);
    const going = [...selected, ...archive].filter((p) => fits(p, picked) && !fits(p, next)).map((p) => p.title);
    if (!going.length || getMotion().calm) {
      setLeaving(new Set());
      setPicked(next);
      return;
    }
    setLeaving(new Set(going));
    t.current = window.setTimeout(() => {
      setLeaving(new Set());
      setPicked(next);
    }, LEAVE_MS);
  };

  return (
    <>
      <section className="frame" data-row aria-label="Filter by tool">
        <div className="side" />
        <div className="cell wfbar">
          <h2 className="text-lead">Filter by tool</h2>
          <ToolFilter ids={used} single onChange={pick} />
        </div>
        <div className="side" />
      </section>
      {groups.map((g) => {
        const shown = g.rows.filter((p) => fits(p, picked));
        if (!shown.length) return null;
        return (
          <div key={g.name} className="contents">
            <Divider label={{ name: g.name }} />
            <section className="frame" data-row aria-label={g.name}>
              <div className="side" />
              <div className="ruled min-w-0">
                {g.rows.map((p) => (
                  <ProjectRow key={p.title} project={p} hidden={!fits(p, picked)} leaving={leaving.has(p.title)} />
                ))}
              </div>
              <div className="side" />
            </section>
          </div>
        );
      })}
    </>
  );
}
