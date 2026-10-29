"use client";

import { useEffect, useRef, useState } from "react";
import { useBeat } from "@/components/canvas/useBeat";
import { useMotion } from "@/components/useMotion";
import type { HomeContent, Track } from "@/content/home";
import { getMotion } from "@/lib/motion";
import { TOOLS, toolSrc, type ToolId } from "@/lib/tools";
import { live, wait, wessel, type XY } from "@/lib/wessel";
import { createDio, type Dio, type DioKind } from "./dioramas";
import { narrow, touch } from "@/lib/media";

const KIT: ToolId[] = ["figma", "illustrator", "after-effects", "lottiefiles", "claude"];
// Frame numbers, and what each scene shows.
const FRAME: Record<DioKind, { n: number; alt: string }> = {
  ux: { n: 12, alt: "A page layout built from blocks, with one tangerine button" },
  motion: { n: 13, alt: "A block travelling along a curved path, with ghost frames" },
  ai: { n: 14, alt: "One block goes into a machine and comes out as a batch" },
};
const NEED = 0.6;
// Below 900 the three cards are a swipe deck, one at a time (mobile check v02, F1).
const deck = narrow;
const ctr = (el: Element, fx = 0.55, fy = 0.6) => (): XY => {
  const r = el.getBoundingClientRect();
  return [r.left + r.width * fx, r.top + r.height * fy];
};

/** The statement types itself once, the first time it's well in view. */
function useTyping(text: string) {
  const el = useRef<HTMLParagraphElement>(null);
  const { calm } = useMotion();
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const p = el.current;
    if (!p || calm) return setN(null);
    let id = 0;
    setN(0);
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        let i = 0;
        const step = () => {
          i = Math.min(text.length, i + 1);
          setN(i);
          if (i < text.length) id = window.setTimeout(step, text[i - 1] === "," ? 140 : 26);
          else setN(null);
        };
        id = window.setTimeout(step, 200);
      },
      { threshold: 0.7 },
    );
    io.observe(p);
    return () => {
      io.disconnect();
      clearTimeout(id);
    };
  }, [text, calm]);
  return [el, n] as const;
}

function Card({
  track,
  lit,
  light,
  dios,
}: {
  track: Track;
  lit: boolean;
  light: (k: DioKind | null) => void;
  dios: { get: (k: DioKind) => Dio | undefined; set: (k: DioKind, d: Dio | null) => void };
}) {
  const k = track.key;
  const svg = useRef<SVGSVGElement>(null);
  const f = FRAME[k];

  useEffect(() => {
    const d = createDio(k, svg.current!);
    dios.set(k, d);
    return () => {
      d.destroy();
      dios.set(k, null);
    };
  }, [k, dios]);
  const dio = () => dios.get(k);

  // Wessel uses the scene once (with the card's full hover, so you
  // see what hovering does). In the phone deck his one job is tapping a tool.
  const card = useBeat<HTMLElement>({
    look: () => svg.current?.parentElement ?? null,
    need: NEED,
    async day(g) {
      if (deck()) return;
      const s = svg.current!;
      const d = dio()!;
      light(k);
      try {
        if (k === "ux") {
          await wessel.go(ctr(s, 0.62, 0.42));
          live(g);
          d.set(true);
          await wait(900);
          wessel.press(true);
          d.tap();
          await wait(140);
          wessel.press(false);
          await wait(500);
          d.set(false);
        }
        if (k === "motion") {
          await wessel.go(ctr(s, 0.18, 0.5), { k: 220 });
          live(g);
          wessel.press(true);
          for (let i = 1; i <= 10; i++) {
            d.scrub(i / 10);
            await wessel.go(ctr(s, 0.18 + i * 0.064, 0.5), { k: 420, timeout: 90 });
          }
          wessel.press(false);
          d.scrub(null);
          await wait(300);
        }
        if (k === "ai") {
          await wessel.go(ctr(s, 0.5, 0.45), { k: 220 });
          live(g);
          wessel.press(true);
          d.set(true);
          await wait(160);
          wessel.press(false);
          await wait(1300);
          live(g);
          await wessel.go(() => {
            const r = s.getBoundingClientRect();
            return [r.right - 10, r.top + r.height * 0.5];
          }, { k: 160, timeout: 700 });
          d.set(false);
        }
        live(g);
      } finally {
        light(null);
        dio()?.scrub(null);
      }
    },
  });

  // Keyboard: Enter or Space plays the scene (D duplicates on the AI card,
  // like Figma's ⌘D, but only while the card has focus).
  const key = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const d = dio();
    if (!d) return;
    if (e.key === "Enter" || e.key === " " || (k === "ai" && e.key.toLowerCase() === "d")) {
      e.preventDefault();
      if (k === "ux") {
        d.set(true);
        d.tap();
      } else d.set(!d.on);
    }
  };

  return (
    <article
      ref={card}
      className="cell fig"
      data-k={k}
      data-on={lit}
      tabIndex={0}
      aria-label={track.title}
      aria-describedby="fig-hint"
      aria-keyshortcuts={k === "ai" ? "D" : undefined}
      onKeyDown={key}
      onPointerEnter={() => !touch() && light(k)}
      onPointerLeave={() => !touch() && light(null)}
      onFocus={() => light(k)}
      onBlur={() => light(null)}
    >
      <div
        className="obj"
        data-enter
        onPointerEnter={() => !touch() && dio()?.set(true)}
        onPointerLeave={() => {
          if (touch()) return;
          dio()?.set(false);
          dio()?.scrub(null);
        }}
        onPointerMove={(e) => {
          if (k !== "motion" || (e.pointerType !== "mouse" && !e.buttons) || getMotion().calm) return;
          const r = svg.current!.getBoundingClientRect();
          dio()?.scrub(Math.max(0, Math.min(1, (e.clientX - r.left - r.width * 0.15) / (r.width * 0.7))));
        }}
        onClick={() => (touch() ? dio()?.set(!dio()?.on) : dio()?.tap())}
      >
        <svg ref={svg} className="iso" viewBox="0 0 320 240" role="img" aria-label={f.alt} />
      </div>
      <h3 className="text-title" data-enter>
        {track.title}
      </h3>
      <p className="text-body text-mute" data-enter>
        {track.line}
      </p>
    </article>
  );
}

/**
 * Focus (DESIGN.md §6): the statement and the Daily kit on the left, three
 * dioramas side by side on the right. Hovering a card lights its tools and
 * hovering a tool lights its card and plays its scene, both ways.
 */
export function Focus({ focus: c }: { focus: HomeContent["focus"] }) {
  const [lit, setLit] = useState<DioKind | null>(null);
  const all = useRef<Partial<Record<DioKind, Dio>>>({});
  const [dios] = useState(() => ({
    get: (k: DioKind) => all.current[k],
    set: (k: DioKind, d: Dio | null) => {
      if (d) all.current[k] = d;
      else delete all.current[k];
    },
  }));
  const [stmt, typed] = useTyping(c.statement);
  const tracks = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);

  // Touch has no hover: a card lights while it's mostly on screen.
  useEffect(() => {
    if (!touch()) return;
    const seen = new Map<Element, number>();
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => seen.set(e.target, e.intersectionRatio));
        const best = [...seen].filter(([, r]) => r > 0.6).sort((a, b) => b[1] - a[1])[0];
        setLit(best ? ((best[0] as HTMLElement).dataset.k as DioKind) : null);
      },
      { threshold: [0, 0.6, 1] },
    );
    document.querySelectorAll(".fig").forEach((f) => io.observe(f));
    return () => io.disconnect();
  }, []);

  // On touch the in-view card stays lit; a finished beat doesn't switch it off.
  const cardLight = (k: DioKind | null) => {
    if (k || !touch()) setLit(k);
  };

  // A tool points at the work it makes: it lights its card and plays its scene.
  const chip = (k: DioKind, on: boolean) => {
    setLit(on ? k : null);
    all.current[k]?.set(on);
  };

  // The deck: slide a card to the middle, and keep the dots on the one in view.
  const slideTo = (i: number) => {
    const t = tracks.current;
    const card = t?.children[i] as HTMLElement | undefined;
    if (!t || !card) return;
    const left = card.offsetLeft - (t.clientWidth - card.offsetWidth) / 2;
    t.scrollTo({ left, behavior: getMotion().calm ? "auto" : "smooth" });
  };
  const onDeck = () => {
    const t = tracks.current;
    if (!t || !deck()) return;
    const mid = t.scrollLeft + t.clientWidth / 2;
    const d = [...t.children].map((el) => {
      const e = el as HTMLElement;
      return Math.abs(e.offsetLeft + e.offsetWidth / 2 - mid);
    });
    setAt(d.indexOf(Math.min(...d)));
  };
  // A tap on a tool in the deck: slide to its card and play the scene once.
  const show = (k: DioKind) => {
    const d = all.current[k];
    slideTo(c.tracks.findIndex((t) => t.key === k));
    setLit(k);
    if (!d || getMotion().calm) return;
    d.set(true);
    if (k === "ux") d.tap();
    window.setTimeout(() => d.set(false), 1600);
  };

  // Phones: Wessel shows the deck once. He taps After Effects and it glides to Motion.
  const kit = useBeat<HTMLDivElement>({
    need: 0.9,
    async day(g) {
      if (!deck()) return;
      const ae = kit.current?.querySelector<HTMLElement>('[data-tool="after-effects"]');
      if (!ae) return;
      await wessel.go(ctr(ae, 0.5, 0.55), { k: 220 });
      live(g);
      wessel.press(true);
      await wait(140);
      wessel.press(false);
      show("motion");
      await wait(1400);
      live(g);
    },
  });

  return (
    <section className="frame" data-row aria-label="Focus">
      <div className="side" />
      <div className="fx">
        <div className="cell fl">
          <div className="stmt" data-enter>
            <p ref={stmt} className="text-headline">
              {typed == null ? (
                c.statement
              ) : (
                <>
                  <span className="sr-only">{c.statement}</span>
                  <span aria-hidden="true">{c.statement.slice(0, typed)}</span>
                  <span aria-hidden="true" className="opacity-0">
                    {c.statement.slice(typed)}
                  </span>
                </>
              )}
            </p>
          </div>
          <div ref={kit} className="kitc" data-enter>
            <h3 className="text-lead">Daily kit</h3>
            <ul className="tools kit" data-size="56">
              {KIT.map((id) => {
                const k = TOOLS[id].kit as DioKind;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`tool${lit === k ? " on" : ""}`}
                      aria-label={TOOLS[id].name}
                      data-tool={id}
                      onPointerEnter={(e) => e.pointerType !== "touch" && chip(k, true)}
                      onPointerLeave={(e) => e.pointerType !== "touch" && chip(k, false)}
                      onClick={() => deck() && show(k)}
                      onFocus={() => chip(k, true)}
                      onBlur={() => chip(k, false)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- brand SVGs, served as they are */}
                      <img src={toolSrc(id)} alt="" width={56} height={56} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <p id="fig-hint" className="sr-only">
          Press Enter to play the scene.
        </p>
        <div ref={tracks} className="tracks" onScroll={onDeck}>
          {c.tracks.map((t) => (
            <Card key={t.key} track={t} lit={lit === t.key} light={cardLight} dios={dios} />
          ))}
        </div>
        <div className="fdots" role="group" aria-label="Focus cards">
          {c.tracks.map((t, i) => (
            <button key={t.key} type="button" aria-label={t.title} aria-current={at === i || undefined} onClick={() => slideTo(i)}>
              <i />
            </button>
          ))}
        </div>
      </div>
      <div className="side" />
    </section>
  );
}
