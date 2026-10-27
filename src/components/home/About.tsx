"use client";

import { useRef, useState } from "react";
import { TextLink } from "@/components/parts/TextLink";
import { useBeat } from "@/components/canvas/useBeat";
import type { HomeContent } from "@/content/home";
import { getMotion } from "@/lib/motion";
import { Bot, live, pageBox, put, wait, wessel } from "@/lib/wessel";

const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

/**
 * About (DESIGN.md §6): the story left, a deck of three photos right. A
 * click (or Wessel, once by day) slides the top photo out and tucks it
 * behind. At night the Content update bot refreshes the top photo.
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
    async night(g) {
      const top = deck.current?.querySelector('.dk[data-p="0"]');
      if (!top) return;
      const U = new Bot("Content update");
      const r = pageBox(top);
      await U.to(r.x + r.w * 0.86, r.y + r.h * 0.86);
      live(g);
      U.press(true);
      const sweep = put("sweep", "", [r.x + 12, r.y + 10, r.w - 24]);
      requestAnimationFrame(() => requestAnimationFrame(() => (sweep.style.transform = `translateY(${r.h - 20}px)`)));
      await wait(720);
      sweep.style.opacity = "0";
      setTimeout(() => sweep.remove(), 300);
      live(g);
      U.press(false);
      const pill = put("opill hi-chip pop text-micro-caps", "Local time ", [r.x + 14, r.y + r.h - 44]);
      const b = document.createElement("b");
      b.textContent = clock.format(new Date());
      pill.appendChild(b);
      await wait(200);
      await U.leave();
    },
  });

  return (
    <section className="frame" data-row aria-label="About">
      <div className="side" />
      <div ref={cell} className="cell about">
        <div className="atext" data-enter>
          <h3 className="text-headline">{c.opener}</h3>
          <p className="text-body text-mute">{c.next}</p>
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
              <img src={p.src} alt="" draggable={false} loading={i ? "lazy" : undefined} />
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
