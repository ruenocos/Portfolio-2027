"use client";

import { useEffect, useRef, useState } from "react";
import { Pin } from "@/components/canvas/Pin";
import { MockTag } from "@/components/parts/Pills";
import { useMotion } from "@/components/useMotion";
import type { CaseRow, CaseSection } from "@/content/cases";
import { wessel, type XY } from "@/lib/wessel";
import { narrow } from "@/lib/media";
import { srcSet } from "@/lib/image";
import { openViewer, type ViewerItem } from "@/lib/viewer";
import { CaseRows } from "./CaseRows";

// The reading line: a section is "the one you're reading" once its top
// passes 40% of the screen.
const LINE = 0.4;
// His cursor rests beside the active layer, capped so his tag stays inside the panel.
const REST_X = 110;

// A section's media: the single figure (the first way to add one) as a
// full row, then its media rows.
const rowsOf = (s: CaseSection): CaseRow[] => [
  ...(s.figure ? [{ key: `${s.key}-figure`, kind: "row" as const, layout: "full" as const, items: [{ ...s.figure, panel: false }] }] : []),
  ...(s.rows ?? []),
];

/**
 * The read: a sticky Layers panel next to the
 * sections. Wessel is your reading buddy: he selects the layer you're
 * reading, presses once per change, and counts how far you are in his tag
 * ("Wessel · 42%"). It's the one Wessel (the shell's), driven to the layer, so
 * there's never a second one on screen. Each figure gets its pin the first
 * time it's half in view. Phones: the cursor hides.
 */
export function Read({ sections }: { sections: CaseSection[] }) {
  const { calm } = useMotion();
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const [cur, setCur] = useState(-1);
  const [pct, setPct] = useState(0);
  const [inside, setInside] = useState(false);
  const [box, setBox] = useState<{ y: number; h: number; x: number } | null>(null);

  // Every picture and loop on the page, in order: the viewer steps through them all.
  const media = sections.map(rowsOf);
  const items: ViewerItem[] = media.flat().flatMap((r) =>
    r.kind === "row"
      ? r.items.map((m) => ({
          kind: m.video ? ("video" as const) : ("image" as const),
          src: m.src,
          srcSet: m.src ? srcSet(m.src) : undefined,
          video: m.video,
          alt: m.alt,
          caption: m.caption,
          width: m.width,
          height: m.height,
        }))
      : [],
  );
  const firsts = media.map((rows, i) =>
    media.slice(0, i).flat().reduce((n, r) => n + (r.kind === "row" ? r.items.length : 0), 0),
  );
  const open = (vi: number, el: HTMLElement) =>
    openViewer({
      items,
      index: vi,
      from: el,
      tileFor: (i) => root.current?.querySelector<HTMLElement>(`[data-vi="${i}"]`) ?? null,
    });

  // Which section you're in, and how far through the read.
  useEffect(() => {
    const read = root.current!;
    const arts = [...read.querySelectorAll<HTMLElement>(".sc")];
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = innerHeight;
      let a = -1;
      arts.forEach((s, i) => {
        if (s.getBoundingClientRect().top < vh * LINE) a = i;
      });
      const r = read.getBoundingClientRect();
      setCur(a);
      setInside(r.top < vh && r.bottom > vh * 0.5);
      setPct(Math.max(0, Math.min(100, Math.round(((vh * LINE - r.top) / r.height) * 100))));
    };
    const on = () => (raf ||= requestAnimationFrame(tick));
    tick();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => {
      removeEventListener("scroll", on);
      removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, []);

  // The selection follows the active layer; he presses once per change.
  useEffect(() => {
    const li = list.current?.children[Math.max(0, cur)] as HTMLElement | undefined;
    const a = li?.querySelector("a");
    if (!li || !a) return;
    setBox({ y: li.offsetTop, h: li.offsetHeight, x: Math.min(a.offsetLeft + a.offsetWidth - 28, REST_X) });
    if (cur < 0 || calm) return;
    wessel.press(true);
    const t = setTimeout(() => wessel.press(false), 180);
    return () => {
      clearTimeout(t);
      wessel.press(false);
    };
  }, [cur, calm]);

  // Wessel rests beside the layer you're reading, while the
  // panel is on screen (desktop only; phones have no panel).
  useEffect(() => {
    if (cur < 0) return;
    const a = list.current?.children[cur]?.querySelector("a");
    if (!a) return;
    // Just past the label (capped, so his tag stays inside the panel).
    // Once the read is behind you he lets go, so he doesn't sit on the end.
    const target = (): XY | null => {
      if (narrow()) return null;
      const rd = root.current?.getBoundingClientRect();
      if (!rd || rd.bottom < innerHeight * 0.5) return null;
      const r = a.getBoundingClientRect();
      return [r.left + Math.min(r.width + 14, REST_X + 40), r.top + r.height * 0.6];
    };
    wessel.show();
    void wessel.go(target, { k: 260 });
  }, [cur]);

  // How far through the read, in his tag, while you're in it.
  useEffect(() => {
    wessel.note(inside ? `${pct}%` : null);
  }, [pct, inside]);
  useEffect(() => () => wessel.note(null), []);

  // One pin per figure, the first time it's half in view (his notes).
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.intersectionRatio < 0.5) return;
          io.unobserve(e.target);
          e.target.querySelector<HTMLElement>(".pin")?.setAttribute("data-in", "");
        }),
      { threshold: [0.5] },
    );
    root.current!.querySelectorAll("figure").forEach((f) => io.observe(f));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={root} className="rd">
        <nav className="cell lay" aria-label="Contents">
          <div className="lp">
            <p className="lh text-label text-mute">Layers</p>
            <ol ref={list} className="ly">
              {sections.map((s, i) => (
                <li key={s.key}>
                  <a href={`#${s.key}`} className="text-body" aria-current={i === cur ? "true" : undefined}>
                    <span className="hash" aria-hidden="true">
                      #
                    </span>
                    {s.name}
                  </a>
                </li>
              ))}
            </ol>
            {box && (
              <>
                <span
                  className="sel lsel"
                  data-on={cur >= 0}
                  style={{ transform: `translateY(${box.y}px)`, height: box.h }}
                  aria-hidden="true"
                >
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </>
            )}
          </div>
        </nav>
        <div className="secs">
          {sections.map((s, i) => (
            <article key={s.key} id={s.key} className="cell sc" tabIndex={-1} aria-labelledby={`h-${s.key}`}>
              {/* Same frame-name label as every other section: { Name }. The
                  # stays in the Layers panel, where it's Figma's frame mark. */}
              <p className="slab text-label" data-enter>
                <span className="br" aria-hidden="true">
                  {"{"}
                </span>
                {s.name}
                <span className="br" aria-hidden="true">
                  {"}"}
                </span>
                {s.mock && <MockTag className="ml-2">{s.mock === "wording" ? "Numbers real · wording mock" : "mock"}</MockTag>}
              </p>
              <h2 id={`h-${s.key}`} className="text-headline" data-enter data-mock={s.mock ? "" : undefined}>
                {s.heading}
              </h2>
              <p className={`sl ${s.key === "takeaway" ? "text-accent" : "text-body"}`} data-enter data-mock={s.mock ? "" : undefined}>
                {s.body}
              </p>
              {media[i].length > 0 && (
                <CaseRows
                  rows={media[i]}
                  first={firsts[i]}
                  open={open}
                  pin={
                    s.note && (
                      <Pin className="fpin" data-mock={s.mock ? "" : undefined}>
                        {s.note}
                      </Pin>
                    )
                  }
                />
              )}
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
