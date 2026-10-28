"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Arrow } from "@/components/parts/Arrow";
import { MediaFill } from "@/components/parts/Media";
import { MockTag, Slot } from "@/components/parts/Pills";
import type { Project } from "@/components/parts/ProjectRow";
import { EmptyTool, Tools } from "@/components/parts/Tools";
import { announce } from "@/lib/motion";

/**
 * Archive row (compact): one ruled line on the same thirds as the project
 * rows above, so the columns run on. Title | year | role + tools. The media
 * peeks up in the middle column while you point at the row, with your grape
 * selection and its real size, the same hover as the full rows. Phones get
 * a small thumbnail instead of the peek.
 */
export function ArchiveRow({ project: p, hidden, leaving }: { project: Project; hidden?: boolean; leaving?: boolean }) {
  const peek = useRef<HTMLSpanElement>(null);
  const size = useRef<HTMLElement>(null);
  const [soon, setSoon] = useState(false);
  const gap = p.placeholder;

  const sayingSoon = useRef(0);
  const notYet = (e: React.MouseEvent) => {
    announce("Case study soon");
    const mouse = (e.nativeEvent as PointerEvent).pointerType === "mouse" && e.detail > 0;
    if (mouse) return;
    setSoon(true);
    clearTimeout(sayingSoon.current);
    sayingSoon.current = window.setTimeout(() => setSoon(false), 1600);
  };
  const sizeUp = () => {
    const m = peek.current;
    if (m && size.current) size.current.textContent = `${Math.round(m.offsetWidth)} × ${Math.round(m.offsetHeight)}`;
  };

  const title = (
    <>
      <span className="tt">{p.title}</span>
      {p.href && (
        <span className="ta" aria-hidden="true">
          <Arrow dir="right" />
        </span>
      )}
    </>
  );

  return (
    <article className="arow" hidden={hidden} data-leaving={leaving || undefined} onPointerEnter={sizeUp}>
      <div className="cell al">
        <h3 className="text-title" lang={p.lang}>
          {/* The title is the row's target; its hit area stretches over the whole row. */}
          {p.href ? (
            <Link href={p.href} className="hit" data-you="View case" aria-label={p.label}>
              {title}
            </Link>
          ) : (
            <button type="button" className="hit" data-you="Case study soon" aria-label={`${p.label} Case study soon.`} onClick={notYet}>
              {title}
            </button>
          )}
          {gap && (
            <span aria-hidden="true">
              <MockTag className="ml-2.5 align-middle" />
            </span>
          )}
        </h3>
      </div>
      <div className="cell ac">
        <span className="text-body ay">{gap ? <Slot>Year</Slot> : p.timeline}</span>
        <span ref={peek} className="media apk" data-ratio="portrait" aria-hidden="true">
          <span className="hov">
            <span className="hsel">
              <i />
              <i />
              <i />
              <i />
              <b className="hsz" ref={size} />
            </span>
          </span>
          <MediaFill poster={p.media.poster} video={p.media.video} />
        </span>
      </div>
      <div className="cell ap">
        <span className="text-body">{gap ? <Slot>Role</Slot> : p.role}</span>
        {gap ? <EmptyTool /> : <Tools ids={p.tools} />}
      </div>
      {!p.href && (
        <span className="soontag gpill text-micro-caps" data-size="small" data-on={soon} aria-hidden="true">
          Case study soon
        </span>
      )}
    </article>
  );
}
