"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Arrow } from "@/components/parts/Arrow";
import { Hop } from "@/components/shell/Hop";
import { useBeat } from "@/components/canvas/useBeat";
import type { ArchiveCard } from "@/content/home";
import { live, wait, wessel } from "@/lib/wessel";
import { touch } from "@/lib/media";

/**
 * Archive (DESIGN.md §6): a hand of cards resting closed at .82, with
 * "All work →" in Statement. Hover (or a phone scrolling it in) fans it;
 * Wessel fans it once.
 */
export function Archive({ cards }: { cards: ArchiveCard[] }) {
  const hand = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [wes, setWes] = useState(false);
  const [hot, setHot] = useState<number | null>(null);
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
    reset() {
      setWes(false);
      setHot(null);
    },
  });

  // Phones: it fans while it's mostly on screen .
  useEffect(() => {
    const p = beat.current;
    if (!p || !touch()) return;
    const io = new IntersectionObserver(
      ([e]) => setHover(e.intersectionRatio > 0.6),
      { threshold: [0, 0.6, 1] },
    );
    io.observe(p);
    return () => io.disconnect();
  }, [beat]);

  return (
    <section className="frame" data-row aria-label="See more">
      <div className="side" />
      <div
        ref={beat}
        className="cell arch"
        data-open={open}
        onPointerEnter={() => !touch() && setHover(true)}
        onPointerLeave={() => !touch() && setHover(false)}
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
