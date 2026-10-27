"use client";

import { useEffect, useRef, useState } from "react";
import { useMotion } from "@/components/useMotion";
import motionTokens from "../../../design/motion-tokens.json";
import { MockTag } from "./Pills";

const RATE = motionTokens.video.playbackRate;

// Plays a muted loop only while it's on screen, at 0.75×, and never while
// calm (Pause motion or reduced motion): then the poster shows instead.
// The video's source loads only when it comes near the screen.
export function useInViewVideo(rate = RATE) {
  const video = useRef<HTMLVideoElement>(null);
  const { calm } = useMotion();
  const [on, setOn] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.defaultPlaybackRate = v.playbackRate = rate;
    let visible = false;
    const sync = () => {
      if (visible && !calm) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        v.play().catch(() => {});
      } else v.pause();
      if (calm) setOn(false);
    };
    const playing = () => setOn(true);
    v.addEventListener("playing", playing);
    // Fetch a little early so it's ready when it scrolls in.
    const near = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !calm && !v.src && v.dataset.src) {
        v.src = v.dataset.src;
        v.preload = "auto";
      }
    }, { rootMargin: "50% 0px" });
    const seen = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    near.observe(v);
    seen.observe(v);
    sync();
    return () => {
      near.disconnect();
      seen.disconnect();
      v.removeEventListener("playing", playing);
      v.pause();
    };
  }, [rate, calm]);

  return [video, on] as const;
}

export type MediaSrc = { poster?: string; video?: string; alt?: string };

/** The picture inside a media frame: poster, plus a loop if there is one. */
export function MediaFill({ poster, video, alt = "", rate }: MediaSrc & { rate?: number }) {
  const [ref, on] = useInViewVideo(rate);
  const [err, setErr] = useState(false);
  return (
    <span className="clip">
      {/* Posters come from Sanity's image CDN in Phase 4; a plain img keeps them out of next/image's resizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {poster && <img src={poster} alt={alt} data-err={err} onError={() => setErr(true)} loading="lazy" decoding="async" />}
      {video && <video ref={ref} data-src={video} muted loop playsInline preload="none" data-on={on} aria-hidden="true" />}
    </span>
  );
}

/**
 * Media frame (DESIGN.md §6): radius 24, fill behind. portrait = 3:4 project
 * media, wide = 16:9 case header (squares up below 600 with squareSmall),
 * free = the child sets the size. Without a source it's a dashed
 * placeholder with a mock tag. print = the About deck's photo border.
 */
export function Media({
  ratio = "free",
  poster,
  video,
  alt,
  rate,
  placeholder,
  print,
  squareSmall,
  className = "",
  children,
}: MediaSrc & {
  ratio?: "portrait" | "wide" | "free";
  rate?: number;
  placeholder?: string;
  print?: boolean;
  squareSmall?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const empty = !poster && !video;
  return (
    <span
      className={`media ${className}`}
      data-ratio={ratio}
      data-placeholder={empty ? "" : undefined}
      data-print={print ? "" : undefined}
      data-square-small={squareSmall ? "" : undefined}
    >
      {empty ? <MockTag>{placeholder ?? "Media to come"}</MockTag> : <MediaFill poster={poster} video={video} alt={alt} rate={rate} />}
      {children}
    </span>
  );
}

/** A media frame with its caption row underneath. */
export function MediaFigure({ caption, ...media }: React.ComponentProps<typeof Media> & { caption?: React.ReactNode }) {
  return (
    <figure className="mfig">
      <Media {...media} />
      {caption && <figcaption className="text-label">{caption}</figcaption>}
    </figure>
  );
}
