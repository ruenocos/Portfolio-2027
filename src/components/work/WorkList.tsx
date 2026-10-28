"use client";

import { useEffect, useRef, useState } from "react";
import type { Project } from "@/components/parts/ProjectRow";
import { ToolFilter } from "@/components/parts/ToolFilter";
import { useBeat } from "@/components/canvas/useBeat";
import { getMotion } from "@/lib/motion";
import { live, select, wait, wessel } from "@/lib/wessel";
import { TOOLS, knownTools, type ToolId } from "@/lib/tools";
import { WorkRow } from "./WorkRow";

const LEAVE_MS = 200;
const rand = (n: number) => Math.floor(Math.random() * n);
const fits = (p: Project, picked: ToolId[]) => !picked.length || picked.some((t) => p.tools.includes(t));

/**
 * Work: an overview of all the work as compact rows (the big project rows
 * stay on home), with a tool filter on top. One tool at a time narrows the rows to the
 * work made with it; rows that go fade first, then the rest close up.
 */
export function WorkList({ projects }: { projects: Project[] }) {
  const [picked, setPicked] = useState<ToolId[]>([]);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const t = useRef(0);
  // Only offer tools some project was made with.
  const used = knownTools(Object.keys(TOOLS)).filter((id) => projects.some((p) => p.tools.includes(id)));

  useEffect(() => () => clearTimeout(t.current), []);

  const pick = (next: ToolId[]) => {
    clearTimeout(t.current);
    const going = projects.filter((p) => fits(p, picked) && !fits(p, next)).map((p) => p.title);
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

  // He runs over his kit first: a few chips, each selected and named.
  const bar = useBeat<HTMLDivElement>({
    need: 0.6,
    async day(g) {
      const chips = [...bar.current!.querySelectorAll<HTMLElement>("button.tool")];
      if (!chips.length) return;
      await wait(500);
      live(g);
      const n = Math.min(3, chips.length);
      const start = rand(chips.length - n + 1);
      for (const c of chips.slice(start, start + n)) {
        await wessel.go(wessel.at(c, 0.7, 0.75), { k: 280, timeout: 600 });
        live(g);
        select(c, { label: false, ms: 900 });
        wessel.chip(c.getAttribute("aria-label") ?? "");
        await wait(650);
        live(g);
      }
      wessel.free();
    },
  });

  return (
    <>
      <section className="frame" data-row aria-label="Filter by tool">
        <div className="side" />
        <div ref={bar} className="cell wfbar">
          <h2 className="text-lead">Filter by tool</h2>
          <ToolFilter ids={used} single onChange={pick} />
        </div>
        <div className="side" />
      </section>
      <div className="frame wgap" data-row aria-hidden="true">
        <div className="side" />
        <div className="cell bg-dots" />
        <div className="side" />
      </div>
      <section className="frame" data-row aria-label="Projects">
        <div className="side" />
        <div className="ruled min-w-0">
          {projects.map((p) => (
            <WorkRow key={p.title} project={p} hidden={!fits(p, picked)} leaving={leaving.has(p.title)} />
          ))}
        </div>
        <div className="side" />
      </section>
    </>
  );
}
