"use client";

import { useEffect, useRef, useState } from "react";
import { useBeat } from "@/components/canvas/useBeat";
import type { Job } from "@/content/about";
import { live, wait, wessel } from "@/lib/wessel";
import { touch } from "@/lib/media";

/**
 * Experience as a layers list: one selection box springs to the row you
 * point at (on phones, the row in the middle of the screen), like picking
 * layers in Figma. Wessel runs down his own CV once, selecting each
 * row, and stops on the job he has now.
 */
export function History({ jobs }: { jobs: Job[] }) {
  const list = useRef<HTMLOListElement>(null);
  const [cur, setCur] = useState<number | null>(null);
  // Whose selection it is: his in tangerine, yours in grape.
  const [who, setWho] = useState<"wes" | "you">("you");
  const [box, setBox] = useState<{ y: number; h: number } | null>(null);

  useEffect(() => {
    const li = cur == null ? null : (list.current?.children[cur] as HTMLElement | undefined);
    if (li) setBox({ y: li.offsetTop, h: li.offsetHeight });
  }, [cur]);

  // Phones: the row nearest the middle of the screen is the selected one.
  useEffect(() => {
    const ol = list.current;
    if (!ol || !touch()) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          setWho("you");
          setCur([...ol.children].indexOf(e.target));
        }),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    [...ol.children].forEach((li) => io.observe(li));
    return () => io.disconnect();
  }, []);

  const beat = useBeat<HTMLDivElement>({
    async day(g) {
      const rows = [...list.current!.children] as HTMLElement[];
      for (let i = rows.length - 1; i >= 0; i--) {
        await wessel.go(wessel.at(rows[i], 0.32, 0.6), { k: 260, timeout: 500 });
        live(g);
        setWho("wes");
        setCur(i);
        wessel.press(true);
        await wait(90);
        wessel.press(false);
        await wait(i === 0 ? 700 : 220);
        live(g);
      }
      wessel.free();
      await wait(400);
      setCur(null);
      setWho("you");
    },
    reset() {
      setCur(null);
      setWho("you");
    },
  });

  return (
    <div ref={beat} className="hwrap" data-who={who} onPointerLeave={() => !touch() && setCur(null)}>
      <ol ref={list} className="hist">
        {jobs.map((j, i) => (
          <li
            key={`${j.place}-${j.when}`}
            className="cell"
            data-on={cur === i}
            onPointerEnter={() => {
              if (touch()) return;
              setWho("you");
              setCur(i);
            }}
          >
            <span className="yr text-label text-mute">{j.when}</span>
            <span className="pl text-lead">{j.place}</span>
            <span className="ro text-body text-mute">{j.role}</span>
          </li>
        ))}
      </ol>
      {box && (
        <span
          className="sel hsel"
          data-on={cur != null}
          style={{ transform: `translateY(${box.y}px)`, height: box.h }}
          aria-hidden="true"
        >
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
    </div>
  );
}
