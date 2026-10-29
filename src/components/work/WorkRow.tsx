"use client";

import Link from "next/link";
import { Hop } from "@/components/shell/Hop";
import { useEffect, useRef, useState } from "react";
import { MediaFill } from "@/components/parts/Media";
import { SIZES } from "@/lib/image";
import { MockTag, Slot } from "@/components/parts/Pills";
import type { Project } from "@/components/parts/ProjectRow";
import { EmptyTool, Tools } from "@/components/parts/Tools";
import { useMotion } from "@/components/useMotion";
import { announce } from "@/lib/motion";
import motionTokens from "../../../design/motion-tokens.json";
import { finePointer } from "@/lib/media";

const MAG = motionTokens.magnetism.projectMedia;

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
    const max = MAG.max.match(/\d+/g)!.map(Number);
    const rot = Number(MAG.rotate.match(/[\d.]+/)![0]);
    const m = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    const draw = () => {
      m.x += (m.tx - m.x) * MAG.ease;
      m.y += (m.ty - m.y) * MAG.ease;
      el.style.transform = `translate(${m.x.toFixed(2)}px,${m.y.toFixed(2)}px) rotate(${(m.x * rot).toFixed(3)}deg)`;
      raf = Math.abs(m.tx - m.x) + Math.abs(m.ty - m.y) > 0.05 ? requestAnimationFrame(draw) : 0;
    };
    const move = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      const cx = b.left + b.width / 2 - m.x;
      const cy = b.top + b.height / 2 - m.y;
      m.tx = Math.max(-max[0], Math.min(max[0], (e.clientX - cx) * MAG.pull));
      m.ty = Math.max(-max[1], Math.min(max[1], (e.clientY - cy) * MAG.pull));
      raf ||= requestAnimationFrame(draw);
    };
    const leave = () => {
      m.tx = m.ty = 0;
      raf ||= requestAnimationFrame(draw);
    };
    r.addEventListener("pointermove", move as EventListener, { passive: true });
    r.addEventListener("pointerleave", leave);
    return () => {
      r.removeEventListener("pointermove", move as EventListener);
      r.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
      el.style.transform = "";
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

  // No arrow or underline on the title: it hops like a header link and your
  // "View case" tag says the rest (Wons 2026-10-28).
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
