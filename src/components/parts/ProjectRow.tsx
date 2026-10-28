"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Pin } from "@/components/canvas/Pin";
import { Arrow } from "@/components/parts/Arrow";
import { useBeat } from "@/components/canvas/useBeat";
import { useMotion } from "@/components/useMotion";
import { announce } from "@/lib/motion";
import type { ToolId } from "@/lib/tools";
import { live, select, showPin, wait, wessel, type XY } from "@/lib/wessel";
import motionTokens from "../../../design/motion-tokens.json";
import { MediaFill } from "./Media";
import { MockTag, Slot } from "./Pills";
import { EmptyTool, Tools } from "./Tools";

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
  mock?: ("summary" | "role" | "note" | "media")[];
  /** A slot still waiting for its project: only the media is real; the text shows dashed gaps. */
  placeholder?: boolean;
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
      const M = el.closest(".pc")!.getBoundingClientRect();
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
 * Wessel drops a pin on the media and selects it.
 */
export function ProjectRow({ project: p, hidden, leaving }: { project: Project; hidden?: boolean; leaving?: boolean }) {
  const media = useMagnet();
  const pin = useRef<HTMLSpanElement>(null);
  const size = useRef<HTMLElement>(null);
  const [soon, setSoon] = useState(false);
  const mock = (f: "summary" | "role" | "note" | "media") => (p.mock?.includes(f) ? "" : undefined);
  const gap = p.placeholder;

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
    // Calm: his pin is simply there, where he'd have dropped it.
    still() {
      const el = pin.current;
      if (!el) return;
      placePin();
      el.hidden = false;
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
      {/* Your selection: it snaps round the card when you come to the row. */}
      <span className="hov" aria-hidden="true">
        <span className="hsel">
          <i />
          <i />
          <i />
          <i />
          <b className="hsz" ref={size} />
        </span>
      </span>
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

  // The whole row is the card's target: a click anywhere opens it, unless
  // it lands on a link or you were selecting text.
  const rowClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest("a, button") || getSelection()?.toString()) return;
    media.current?.click();
  };
  // Your selection's size pill reads the media's real size.
  const sizeUp = () => {
    const m = media.current;
    if (m && size.current) size.current.textContent = `${Math.round(m.offsetWidth)} × ${Math.round(m.offsetHeight)}`;
  };

  return (
    <article
      ref={row}
      className="pj"
      hidden={hidden}
      data-leaving={leaving || undefined}
      onPointerEnter={sizeUp}
      onClick={rowClick}
    >
      <div className="cell pl">
        <div>
          <h3 className="text-title" lang={p.lang} data-mock={gap ? "" : undefined}>
            <span className="tt">{p.title}</span>
            {p.href && (
              <span className="ta" aria-hidden="true">
                <Arrow dir="right" />
              </span>
            )}
            {gap && (
              <span aria-hidden="true">
                <MockTag className="ml-2.5 align-middle" />
              </span>
            )}
          </h3>
          <p className="pd text-body" data-mock={mock("summary")}>
            {gap ? <Slot>Summary</Slot> : p.summary}
          </p>
        </div>
        {/* A project still to write shows no empty labels (they come back with ?mocks). */}
        <dl className="meta" data-mock-only={gap ? "" : undefined}>
          <dt className="text-label">Timeline</dt>
          <dd className="text-body">{gap ? <Slot>Year</Slot> : p.timeline}</dd>
        </dl>
      </div>
      <div className="cell pc">
        {p.href ? (
          <Link
            ref={media as React.RefObject<HTMLAnchorElement>}
            data-mock={mock("media")}
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
            data-mock={mock("media")}
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
        <dl className="meta" data-mock-only={gap ? "" : undefined}>
          <dt className="text-label">Role</dt>
          <dd className="text-body" data-mock={mock("role")}>
            {gap ? <Slot>Role</Slot> : p.role}
          </dd>
        </dl>
        <dl className="meta" data-mock-only={gap ? "" : undefined}>
          <dt className="text-label">Tools</dt>
          <dd>{gap ? <EmptyTool /> : <Tools ids={p.tools} />}</dd>
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
