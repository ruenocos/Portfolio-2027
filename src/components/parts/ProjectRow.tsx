"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Pin } from "@/components/canvas/Pin";
import { useBeat } from "@/components/canvas/useBeat";
import { useMotion } from "@/components/useMotion";
import { announce } from "@/lib/motion";
import type { ToolId } from "@/lib/tools";
import { Bot, fade, live, pageBox, put, select, showPin, wait, wessel, type XY } from "@/lib/wessel";
import motionTokens from "../../../design/motion-tokens.json";
import { MediaFill } from "./Media";
import { Tools } from "./Tools";

const MAG = motionTokens.magnetism.projectMedia;
const NEED = motionTokens.wessel.need.projectRow;
const PIN_MS = motionTokens.wessel.pin.showMs;
const mobile = () => innerWidth < 900;

export type Project = {
  title: string;
  /** Set for Dutch titles, so hyphens:auto can break the long compounds. */
  lang?: string;
  summary: string;
  timeline: string;
  role: string;
  tools: ToolId[];
  media: { poster?: string; video?: string };
  /** The case page. Without one the media says "Case study soon". */
  href?: string;
  /** Read out for the media link, e.g. "De Saak case study. Design, dev and SEO, 2023 to now." */
  label: string;
  /** Wessel's pin on the media. spot: where it lands, a little off, like it was dropped by hand. */
  note?: { text: string; spot?: { fx: number; dy: number; rot: number } };
  /** Which of these fields are placeholder copy (DESIGN.md §2.8). */
  mock?: ("summary" | "role" | "note")[];
};

// Leans toward your pointer while it's over the row's side columns, with a
// little tilt, like a card picked up off the desk. Holds still over the
// middle column so it's easy to hit. Off on touch and while calm.
function useMagnet() {
  const media = useRef<HTMLElement>(null);
  const { calm } = useMotion();
  useEffect(() => {
    const el = media.current;
    const r = el?.closest(".pj");
    if (!el || !r) return;
    el.style.transform = "";
    if (calm || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
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
      const R = r.getBoundingClientRect();
      const M = el.parentElement!.getBoundingClientRect();
      const { clientX: x, clientY: y } = e;
      const out = y < R.top || y > R.bottom || x < R.left || x > R.right;
      if (out || (x >= M.left && x <= M.right)) m.tx = m.ty = 0;
      else {
        const b = el.getBoundingClientRect();
        const cx = b.left + b.width / 2 - m.x;
        const cy = b.top + b.height / 2 - m.y;
        m.tx = Math.max(-max[0], Math.min(max[0], (x - cx) * MAG.pull));
        m.ty = Math.max(-max[1], Math.min(max[1], (y - cy) * MAG.pull));
      }
      raf ||= requestAnimationFrame(draw);
    };
    addEventListener("pointermove", move, { passive: true });
    return () => {
      removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [calm]);
  return media;
}

/**
 * Project row (DESIGN.md §6): equal thirds. Title (Accent) + summary +
 * timeline | portrait media 3:4 at 78% of the column | role + tools.
 * Tablet: text | media. Phone: one column.
 * By day Wessel drops a pin on the media and selects it; by night the
 * Handoff bot redlines its spacing.
 */
export function ProjectRow({ project: p }: { project: Project }) {
  const media = useMagnet();
  const pin = useRef<HTMLSpanElement>(null);
  const [soon, setSoon] = useState(false);
  const mock = (f: "summary" | "role" | "note") => (p.mock?.includes(f) ? "" : undefined);

  // Pin spot: a fraction across the media, a little up from its bottom.
  const placePin = () => {
    const el = pin.current;
    const m = media.current;
    if (!el || !m) return;
    const s = p.note?.spot ?? { fx: 0.6, dy: 30, rot: -2 };
    const small = mobile();
    el.style.setProperty("--px", `${small ? 16 : m.offsetWidth * s.fx * 0.45}px`);
    el.style.setProperty("--py", `${small ? 16 : s.dy}px`);
    el.style.setProperty("--rot", `${small ? s.rot * 0.5 : s.rot}deg`);
  };
  useEffect(() => {
    addEventListener("resize", placePin);
    return () => removeEventListener("resize", placePin);
  });

  const row = useBeat<HTMLElement>({
    need: NEED,
    async day(g) {
      const el = pin.current;
      const m = media.current;
      if (!m) return;
      if (!el) {
        await wessel.go(wessel.at(m, 0.5, 0.4));
        live(g);
        wessel.press(true);
        select(m, { ms: PIN_MS });
        await wait(150);
        wessel.press(false);
        return;
      }
      placePin();
      el.hidden = false;
      el.style.visibility = "hidden";
      const avatar = (): XY => {
        const a = el.querySelector(".av")!.getBoundingClientRect();
        return [a.left + a.width * 0.5, a.top + a.height * 0.55];
      };
      await wessel.go(avatar);
      live(g);
      wessel.press(true);
      el.style.visibility = "";
      showPin(el);
      select(m, { ms: PIN_MS });
      await wait(150);
      wessel.press(false);
      await wait(250);
      // He parks just outside the media's right edge with his tag leaning
      // back over his own work, so the role and tools stay readable. On a
      // phone he waits above the pin, clear of its text.
      await wessel.go(
        () => {
          const r = el.querySelector(".bub")!.getBoundingClientRect();
          const b = m.getBoundingClientRect();
          return mobile() ? [r.left + 24, r.top - 44] : [b.right + 12, r.top + r.height * 0.6];
        },
        { k: 160, timeout: 700, lean: !mobile() },
      );
    },
    async night(g) {
      const el = pin.current;
      const m = media.current;
      if (el) {
        placePin();
        showPin(el);
      }
      if (!m) return;
      // Handoff specs it: spacing to the cell edges, and its size.
      const H = new Bot("Handoff");
      const r = pageBox(m);
      const c = pageBox(m.parentElement!);
      await H.to(r.x + r.w - 6, r.y + r.h - 6);
      live(g);
      H.press(true);
      const top = r.y - c.y;
      const left = r.x - c.x;
      const marks = [
        put("red v", "", [r.x + r.w * 0.5, c.y, undefined, top]),
        put("szp text-micro", `${Math.round(top)}`, [r.x + r.w * 0.5, c.y + top / 2]),
        put("red h", "", [c.x, r.y + r.h * 0.5, left]),
        put("szp text-micro", `${Math.round(left)}`, [c.x + left / 2, r.y + r.h * 0.5]),
        put("szp text-micro below", `${m.offsetWidth} × ${m.offsetHeight}`, [r.x + r.w / 2, r.y + r.h + 10]),
      ];
      fade(marks, 2600);
      await wait(160);
      H.press(false);
      await wait(160);
      live(g);
      await H.leave();
    },
    reset() {
      if (pin.current) pin.current.hidden = true;
    },
  });

  // No case page yet: the click says so. Mouse users read it on their You
  // tag; touch and keyboard get a pill on the media.
  const sayingSoon = useRef(0);
  const notYet = (e: React.MouseEvent) => {
    announce("Case study soon");
    const mouse = (e.nativeEvent as PointerEvent).pointerType === "mouse" && e.detail > 0;
    if (mouse) return;
    setSoon(true);
    clearTimeout(sayingSoon.current);
    sayingSoon.current = window.setTimeout(() => setSoon(false), 1600);
  };

  const inner = (
    <>
      <MediaFill poster={p.media.poster} video={p.media.video} />
      {p.note && (
        <Pin ref={pin} live note={false} data-mock={mock("note")}>
          {p.note.text}
        </Pin>
      )}
      {!p.href && (
        <span className="soontag gpill text-micro-caps" data-size="small" data-on={soon} aria-hidden="true">
          Case study soon
        </span>
      )}
    </>
  );

  return (
    <article ref={row} className="pj">
      <div className="cell pl">
        <div>
          <h3 className="text-title" lang={p.lang}>
            {p.title}
          </h3>
          <p className="pd text-body" data-mock={mock("summary")}>
            {p.summary}
          </p>
        </div>
        <dl className="meta">
          <dt className="text-label">Timeline</dt>
          <dd className="text-body">{p.timeline}</dd>
        </dl>
      </div>
      <div className="cell pc">
        {p.href ? (
          <Link
            ref={media as React.RefObject<HTMLAnchorElement>}
            href={p.href}
            className="media"
            data-ratio="portrait"
            data-you="View case"
            aria-label={p.label}
          >
            {inner}
          </Link>
        ) : (
          <button
            ref={media as React.RefObject<HTMLButtonElement>}
            type="button"
            className="media"
            data-ratio="portrait"
            data-you="Case study soon"
            aria-label={`${p.label} Case study soon.`}
            onClick={notYet}
          >
            {inner}
          </button>
        )}
      </div>
      <div className="cell pr">
        <dl className="meta">
          <dt className="text-label">Role</dt>
          <dd className="text-body" data-mock={mock("role")}>
            {p.role}
          </dd>
        </dl>
        <dl className="meta">
          <dt className="text-label">Tools</dt>
          <dd>
            <Tools ids={p.tools} />
          </dd>
        </dl>
      </div>
    </article>
  );
}

/** The rows sit in one ruled stack inside the frame. */
export function ProjectRows({ projects, label = "Selected work", id }: { projects: Project[]; label?: string; id?: string }) {
  return (
    <section className="frame" data-row id={id} aria-label={label}>
      <div className="side" />
      <div className="ruled min-w-0">
        {projects.map((p) => (
          <ProjectRow key={p.title} project={p} />
        ))}
      </div>
      <div className="side" />
    </section>
  );
}
