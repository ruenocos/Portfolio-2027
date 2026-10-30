"use client";

import Link from "next/link";
import { Hop } from "@/components/shell/Hop";
import { useEffect, useRef } from "react";
import { MediaFill } from "@/components/parts/Media";
import { SIZES } from "@/lib/image";
import { MockTag, Slot } from "@/components/parts/Pills";
import { useCaseSoon, type Project } from "@/components/parts/ProjectRow";
import { EmptyTool, Tools } from "@/components/parts/Tools";
import { useMotion } from "@/components/useMotion";
import { magnet } from "@/lib/magnet";
import { finePointer } from "@/lib/media";

// The peek leans toward your pointer while you move along the row, with the
// home cards' magnetism (same pull, cap and tilt). Off on touch and calm.
function usePeekMagnet() {
  const peek = useRef<HTMLSpanElement>(null);
  const { calm } = useMotion();
  useEffect(() => {
    const el = peek.current;
    const r = el?.closest(".arow");
    if (!el || !r) return;
    el.style.transform = "";
    if (calm || !finePointer()) return;
    const lean = magnet(el);
    const move = (e: PointerEvent) => lean.toward(e.clientX, e.clientY);
    const leave = () => lean.rest();
    r.addEventListener("pointermove", move as EventListener, { passive: true });
    r.addEventListener("pointerleave", leave);
    return () => {
      r.removeEventListener("pointermove", move as EventListener);
      r.removeEventListener("pointerleave", leave);
      lean.stop();
    };
  }, [calm]);
  return peek;
}

/**
 * Work row (compact): Work is an overview, so every project is one ruled
 * line on the home project rows' thirds; the big rows stay on home. Title | year | role + tools. The media
 * peeks up in the middle column while you point at the row, with your grape
 * selection, leaning toward your pointer like the home cards. Phones get
 * a small thumbnail instead of the peek.
 */
export function WorkRow({ project: p, hidden, leaving }: { project: Project; hidden?: boolean; leaving?: boolean }) {
  const peek = usePeekMagnet();
  const [soon, notYet] = useCaseSoon();
  const gap = p.placeholder;

  // No arrow or underline on the title: it hops like a header link and your
  // "View case" tag says the rest.
  const title = (
    <span className="tt">
      <Hop text={p.title} />
    </span>
  );

  return (
    <article className="arow" data-hop-host hidden={hidden} data-gap={gap || undefined} data-leaving={leaving || undefined}>
      <div className="cell al">
        <h3 className="text-lead" lang={p.lang}>
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
        <span className="ay">{gap ? <Slot>Year</Slot> : p.timeline}</span>
        <span ref={peek} className="media apk" data-ratio="portrait" aria-hidden="true">
          <MediaFill
            poster={p.media.poster}
            video={p.media.peek ?? p.media.video}
            videoAv1={p.media.peek ? p.media.peekAv1 : p.media.videoAv1}
            sizes={SIZES.peek}
          />
        </span>
      </div>
      <div className="cell ap">
        <span className="text-small">{gap ? <Slot>Role</Slot> : p.role}</span>
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
