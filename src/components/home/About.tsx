"use client";

import { useRef, useState } from "react";
import { TextLink } from "@/components/parts/TextLink";
import { useBeat } from "@/components/canvas/useBeat";
import type { HomeContent } from "@/content/home";
import { getMotion } from "@/lib/motion";
import { live, wait, wessel } from "@/lib/wessel";
import { SIZES, srcSet } from "@/lib/image";

/**
 * About (DESIGN.md §6): the story left, a deck of three photos right. A
 * click (or Wessel, once) slides the top photo out and tucks it
 * behind.
 */
export function About({ about: c }: { about: HomeContent["about"] }) {
  const n = c.photos.length;
  const [order, setOrder] = useState(() => c.photos.map((_, i) => i));
  const [out, setOut] = useState<number | null>(null);
  const deck = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);

  const next = () => {
    if (busy.current || n < 2) return;
    busy.current = true;
    const top = order[0];
    const tuck = () => {
      setOrder((o) => [...o.slice(1), o[0]]);
      setOut(null);
      setTimeout(() => (busy.current = false), 260);
    };
    if (getMotion().calm) return tuck();
    setOut(top);
    setTimeout(tuck, 330);
  };

  const cell = useBeat<HTMLDivElement>({
    look: () => deck.current,
    async day(g) {
      const d = deck.current!;
      await wessel.go(wessel.at(d, 0.5, 0.5, 40, 40));
      live(g);
      wessel.press(true);
      next();
      await wait(140);
      wessel.press(false);
      await wait(500);
      live(g);
      await wessel.go(wessel.at(d, 0.5, 1, 40, -20), { k: 150 });
    },
  });

  return (
    <section className="frame" data-row aria-label="About">
      <div className="side" />
      <div ref={cell} className="cell about">
        <div className="atext" data-enter>
          <h3 className="text-headline">{c.opener}</h3>
          <div className="intro">
            {c.intro.split(/\n\s*\n/).map((p) => (
              <p key={p} className="text-body text-mute">
                {p}
              </p>
            ))}
          </div>
          <TextLink href="/about" label="More about me" arrow="right" />
        </div>
        {/* The button's name says which photo is on top, so the alt texts are read. */}
        <button
          ref={deck}
          type="button"
          className="deck"
          aria-label={`Next photo. Showing: ${c.photos[order[0]]?.alt ?? ""}`}
          onClick={next}
          data-enter
        >
          {c.photos.map((p, i) => (
            <span key={p.src} className="dk" data-p={order.indexOf(i)} data-out={out === i ? "" : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Sanity's CDN sizes these */}
              <img src={p.src} srcSet={srcSet(p.src)} sizes={SIZES.deck} alt="" draggable={false} loading={i ? "lazy" : undefined} decoding="async" />
            </span>
          ))}
          <span className="cnt text-label" aria-hidden="true">
            {order[0] + 1} / {n}
          </span>
        </button>
      </div>
      <div className="side" />
    </section>
  );
}
