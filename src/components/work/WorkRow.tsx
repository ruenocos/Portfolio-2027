"use client";

import Link from "next/link";
import { Hop } from "@/components/shell/Hop";
import { useEffect, useRef } from "react";
import { MediaFill } from "@/components/parts/Media";
import { SIZES } from "@/lib/image";
import type { Project } from "@/components/parts/ProjectRow";
import { Tools } from "@/components/parts/Tools";
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

  return (
    <article className="arow" data-hop-host hidden={hidden} data-leaving={leaving || undefined}>
      <div className="cell al">
        <h3 className="text-lead" lang={p.lang}>
          {/* The title is the row's target; its hit area stretches over the whole
              row. No arrow or underline: it hops, and your "View case" tag says the rest. */}
          <Link href={p.href} className="hit" data-you="View case" aria-label={p.label}>
            <span className="tt">
              <Hop text={p.title} />
            </span>
          </Link>
        </h3>
      </div>
      <div className="cell ac">
        <span className="ay">{p.timeline}</span>
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
        <span className="text-small">{p.role}</span>
        <Tools ids={p.tools} />
      </div>
    </article>
  );
}
