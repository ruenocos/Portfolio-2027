"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Arrow } from "@/components/parts/Arrow";
import { Hop } from "@/components/shell/Hop";
import { useBeat } from "@/components/canvas/useBeat";
import type { ArchiveCard } from "@/content/home";
import { Bot, live, pageBox, put, wait, wessel } from "@/lib/wessel";

const mobile = () => innerWidth < 900;

// The tidy row: cards scaled to fit the cell in one line, 12 apart.
function tidyLayout(pile: HTMLElement, hand: HTMLElement, n: number) {
  const cw = hand.clientWidth;
  const room = pile.clientWidth - (mobile() ? 40 : 80);
  const gap = 12;
  const ts = Math.min(0.42, (room - (n - 1) * gap) / (n * cw));
  pile.style.setProperty("--ts", ts.toFixed(3));
  pile.style.setProperty("--step", `${(cw * ts + gap).toFixed(1)}px`);
  return { cw, ts, gap };
}

/**
 * Archive (DESIGN.md §6): a hand of cards resting closed at .82, with
 * "All work →" in Statement. Hover (or a phone scrolling it in) fans it;
 * Wessel fans it once by day. At night Tidy up snaps it into an
 * auto-layout row.
 */
export function Archive({ cards }: { cards: ArchiveCard[] }) {
  const hand = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [wes, setWes] = useState(false);
  const [hot, setHot] = useState<number | null>(null);
  const [tidy, setTidy] = useState(false);
  const mid = (cards.length - 1) / 2;
  const open = hover || wes;

  const beat = useBeat<HTMLDivElement>({
    async day(g) {
      const i = Math.min(4, cards.length - 1);
      const card = hand.current!.children[i];
      await wessel.go(wessel.at(card, 0.62, 0.18));
      live(g);
      wessel.press(true);
      await wait(120);
      wessel.press(false);
      setWes(true);
      await wait(380);
      live(g);
      setHot(i);
      await wessel.go(wessel.at(card, 0.5, 0.3));
      live(g);
      await wait(800);
      live(g);
      setHot(null);
      wessel.free();
      await wait(300);
      setWes(false);
    },
    async night(g) {
      const T = new Bot("Tidy up");
      const { cw, ts, gap } = tidyLayout(beat.current!, hand.current!, cards.length);
      const r = pageBox(hand.current!);
      await T.to(r.x + r.w / 2, r.y - 60);
      live(g);
      T.press(true);
      await wait(120);
      setTidy(true);
      T.press(false);
      await wait(560);
      live(g);
      const rowW = cards.length * cw * ts + (cards.length - 1) * gap;
      const rowY = r.y + r.h / 2 - (mobile() ? 40 : 70) - (cw * 0.75 * ts) / 2;
      const p = put("opill hi-chip pop text-micro-caps", `Auto layout · ${cards.length} × 1 · gap `, [r.x + r.w / 2, rowY - 40]);
      const b = document.createElement("b");
      b.textContent = String(gap);
      p.appendChild(b);
      p.style.translate = "-50% 0";
      await T.to(r.x + r.w / 2 + rowW / 2 + 8, rowY + cw * 0.75 * ts + 8);
      await wait(260);
      await T.leave();
    },
    reset() {
      setTidy(false);
      setWes(false);
      setHot(null);
    },
  });

  // Phones: it fans while it's mostly on screen (not at night: that's Tidy up's row).
  useEffect(() => {
    const p = beat.current;
    if (!p || !matchMedia("(hover: none)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => setHover(e.intersectionRatio > 0.6 && document.documentElement.dataset.mode !== "night"),
      { threshold: [0, 0.6, 1] },
    );
    io.observe(p);
    return () => io.disconnect();
  }, [beat]);

  useEffect(() => {
    if (!tidy) return;
    const fit = () => beat.current && hand.current && tidyLayout(beat.current, hand.current, cards.length);
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, [tidy, beat, cards.length]);

  return (
    <section className="frame" data-row aria-label="See more">
      <div className="side" />
      <div
        ref={beat}
        className="cell arch"
        data-open={open}
        data-tidy={tidy}
        onPointerEnter={() => !matchMedia("(hover: none)").matches && setHover(true)}
        onPointerLeave={() => !matchMedia("(hover: none)").matches && setHover(false)}
      >
        <div ref={hand} className="hand" aria-hidden="true">
          {cards.map((c, i) => (
            <span
              key={c.src}
              className="fcard"
              data-hot={hot === i}
              style={
                {
                  "--k": (i - mid).toFixed(2),
                  "--d": Math.abs(i - mid).toFixed(1),
                  zIndex: 10 - Math.round(Math.abs(i - mid)),
                } as React.CSSProperties
              }
              onPointerEnter={() => setHot(i)}
              onPointerLeave={() => setHot(null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnails */}
              <img src={c.src} alt="" loading="lazy" draggable={false} />
            </span>
          ))}
        </div>
        <p className="fcap text-label" aria-hidden="true" data-on={hot != null} data-mock={hot != null && cards[hot]?.mock ? "" : undefined}>
          {hot != null ? cards[hot]?.name : ""}
        </p>
        <div className="allw" data-enter>
          <Link href="/work" className="text-statement" onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
            <Hop text="All work" />
            <span className="ar" aria-hidden="true">
              <Arrow dir="right" />
            </span>
          </Link>
        </div>
      </div>
      <div className="side" />
    </section>
  );
}
