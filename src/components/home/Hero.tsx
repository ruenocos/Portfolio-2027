"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { Play } from "@/components/parts/Arrow";
import { MockTag } from "@/components/parts/Pills";
import { useMotion } from "@/components/useMotion";
import { useBeat } from "@/components/canvas/useBeat";
import type { HomeContent } from "@/content/home";
import { holdIntro } from "@/lib/intro/iris";
import { SIZES, resized, srcSet } from "@/lib/image";
import { playHello } from "./hero/hello";
import { Letters, prepName, unprepName, useFitName } from "./hero/name";
import { useIdleNod, type IdleNod } from "./hero/nod";
import { useReel } from "./hero/useReel";
import { localTime } from "@/lib/clock";

/** Local time, live, after hydration (so the server never renders a stale one). */
function LocalTime() {
  const time = useRef<HTMLTimeElement>(null);
  useEffect(() => {
    const tick = () => {
      if (time.current) time.current.textContent = localTime();
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <time ref={time} suppressHydrationWarning>
      --:--
    </time>
  );
}

/**
 * Hero (DESIGN.md §6, §7): mono meta, the name row WESSEL [reel] OUD on
 * glyph height, the role in Wessel's voice. His hello (hero/hello) plays
 * once; the reel's behaviour lives in hero/useReel, the name's in hero/name.
 */
export function Hero({ hero: content }: { hero: HomeContent["hero"] }) {
  const { calm: still } = useMotion();
  const name = useRef<HTMLDivElement>(null);
  const idle = useRef<IdleNod>({ on: false, nods: 0, stillSince: 0, nodding: false });
  const { reel, loop, progress, dialog, full, playLoop, stopLoop, markInvited, openReel, closeReel, reelClosed } = useReel(
    still,
    name,
  );
  useFitName(name);

  useLayoutEffect(() => {
    if (name.current) prepName(name.current);
  }, []);

  // The first visit's intro starts as soon as the hero is there; the hello
  // beat (and Wessel) wait for it to hand over.
  // The intro is held while the hero is mounted; leaving home mid-intro ends it.
  useEffect(() => holdIntro(), []);

  const hero = useBeat<HTMLDivElement>({
    day(gate): Promise<void> {
      return playHello({ gate, hero: hero.current!, name: name.current!, reel: reel.current!, playLoop, idle: idle.current });
    },
    // Calm: the finished hero, reel on its poster.
    still() {
      if (name.current) unprepName(name.current);
      playLoop();
    },
    reset() {
      stopLoop();
      idle.current.on = false;
      if (!name.current) return;
      unprepName(name.current);
      prepName(name.current);
    },
  });

  // Calm, or a reload halfway down: the hero is simply finished.
  useEffect(() => {
    if (still && name.current) {
      unprepName(name.current);
      markInvited();
    }
    // markInvited only sets a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  useIdleNod(hero, idle);

  return (
    <section className="frame" data-row data-still data-steps aria-labelledby="h-name">
      <div className="side" />
      <div ref={hero} className="cell hero bg-dots" data-hero>
      <p className="hmeta text-label" data-enter>
        <span>Based in</span>
        <b>{content.basedIn}</b>
        <span>Local time</span>
        <b>
          <LocalTime />
        </b>
      </p>
      <h1 id="h-name" className="sr-only">
        {`Wessel Oud, ${content.role.join(" ").replace(/^[A-Z](?=[a-z])/, (m) => m.toLowerCase())}`}
      </h1>
      <div ref={name} className="name text-display" data-enter>
        <span className="w" aria-hidden="true">
          <Letters word="Wessel" group={[2, 6]} />
        </span>
        <a
          ref={reel}
          className="reel"
          href="#reel"
          aria-label="Play the reel"
          onClick={openReel}
          data-mock={content.reel.mock ? "" : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a poster frame; lib/image does the sizes */}
          {content.reel.poster && <img src={content.reel.poster} srcSet={srcSet(content.reel.poster)} sizes={SIZES.reel} alt="" fetchPriority="high" />}
          {content.reel.loop && <video ref={loop} data-src={content.reel.loop} muted loop playsInline preload="none" aria-hidden="true" />}
          <i ref={progress} className="ph" />
          <span className="gpill text-micro-caps play" data-size="small">
            <Play /> <span className="pt">Reel</span>
          </span>
        </a>
        <span className="w" aria-hidden="true">
          <Letters word="Oud" />
        </span>
      </div>
      <p className="role text-accent" aria-hidden="true" data-enter>
        {content.role[0]}
        <br />
        {content.role[1]}
      </p>
      <dialog
        ref={dialog}
        className="reelbox"
        aria-label="Reel"
        onClose={reelClosed}
        onCancel={(e) => {
          e.preventDefault();
          closeReel();
        }}
        onClick={(e) => e.target === e.currentTarget && closeReel()}
      >
        <div className="rbm">
          {content.reel.full && <video ref={full} controls playsInline loop preload="none" poster={content.reel.poster && (resized(content.reel.poster, 1280) ?? content.reel.poster)} src={content.reel.full} />}
        </div>
        <p className="rbc text-label">Reel {content.reel.mock && <MockTag>placeholder</MockTag>}</p>
        <button type="button" className="rbx gpill text-micro-caps" data-size="tap" onClick={closeReel}>
          Close
        </button>
      </dialog>
      </div>
      <div className="side" />
    </section>
  );
}
