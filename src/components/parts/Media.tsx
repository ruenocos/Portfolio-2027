"use client";

import { useEffect, useRef, useState } from "react";
import { useMotion } from "@/components/useMotion";
import motionTokens from "../../../design/motion-tokens.json";
import { SIZES, srcSet } from "@/lib/image";
import { pickVideo, touch } from "@/lib/media";
import { MockTag } from "./Pills";

const RATE = motionTokens.video.playbackRate;

// Below this the case header squares up (components.css), and its small
// square copy takes over.
const SQUARE_PX = 600;

/** The copy a loop's <video> should load here (its data-* sources). */
function sourceOf(v: HTMLVideoElement) {
  const d = v.dataset;
  if (d.small && innerWidth < SQUARE_PX) return pickVideo(d.small, d.smallAv1)!;
  return pickVideo(d.src, d.av1)!;
}

/** Data saver on: loops stay posters. */
const saveData = () => !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

// Plays a muted loop only while it's on screen, at 0.75×, and never while
// calm (Pause motion or reduced motion): then the poster shows instead.
// The video's source loads only when it comes near the screen. With
// `hoverHost` it's a hover preview instead: it loads and plays only while
// that ancestor is hovered or focused, and never on touch, where nothing
// can hover to show it.
function useInViewVideo(rate = RATE, hoverHost?: string) {
  const video = useRef<HTMLVideoElement>(null);
  const { calm } = useMotion();
  const [on, setOn] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v || saveData()) return;
    const host = hoverHost ? v.closest<HTMLElement>(hoverHost) : null;
    if (hoverHost && (!host || touch())) return;
    v.defaultPlaybackRate = v.playbackRate = rate;
    let visible = false;
    let hovered = false;
    const load = () => {
      if (v.src || !v.dataset.src) return;
      v.src = sourceOf(v);
      v.preload = "auto";
    };
    const sync = () => {
      if (visible && !calm && (!host || hovered)) {
        load();
        v.play().catch(() => {});
      } else v.pause();
      if (calm) setOn(false);
    };
    // Light up only once a real frame is painted: Safari can fire "playing"
    // before the first frame, which flashed a black box over the poster.
    const playing = () => {
      if (typeof v.requestVideoFrameCallback === "function") v.requestVideoFrameCallback(() => setOn(true));
      else if (v.currentTime > 0) setOn(true);
      else v.addEventListener("timeupdate", () => setOn(true), { once: true });
    };
    v.addEventListener("playing", playing);
    // Fetch a little early so it's ready when it scrolls in.
    const near = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !calm && !host) load();
    }, { rootMargin: "50% 0px" });
    const seen = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    const enter = () => {
      hovered = true;
      sync();
    };
    // It stops once the row has neither the pointer nor the focus.
    const leave = (e: Event) => {
      const next = e.type === "focusout" ? ((e as FocusEvent).relatedTarget as Node | null) : document.activeElement;
      hovered = (e.type === "focusout" && host!.matches(":hover")) || (!!next && host!.contains(next));
      sync();
    };
    host?.addEventListener("pointerenter", enter);
    host?.addEventListener("focusin", enter);
    host?.addEventListener("pointerleave", leave);
    host?.addEventListener("focusout", leave);
    near.observe(v);
    seen.observe(v);
    sync();
    return () => {
      near.disconnect();
      seen.disconnect();
      v.removeEventListener("playing", playing);
      host?.removeEventListener("pointerenter", enter);
      host?.removeEventListener("focusin", enter);
      host?.removeEventListener("pointerleave", leave);
      host?.removeEventListener("focusout", leave);
      v.pause();
    };
  }, [rate, calm, hoverHost]);

  return [video, on] as const;
}

type MediaSrc = {
  poster?: string;
  video?: string;
  /** The loop's AV1 copy: played instead where the browser supports it. */
  videoAv1?: string;
  /** A small square copy, for a wide frame that squares up on phones. */
  videoSmall?: string;
  videoSmallAv1?: string;
  alt?: string;
  sizes?: string;
  /** The page's first picture (its LCP): fetched at once, not lazily. */
  priority?: boolean;
  /** Where the loop is cropped around (CSS object-position). The poster
   *  needs none: Sanity already crops it around its hotspot. */
  focus?: string;
};

/** The picture inside a media frame: poster, plus a loop if there is one. */
export function MediaFill({
  poster,
  video,
  videoAv1,
  videoSmall,
  videoSmallAv1,
  alt = "",
  rate,
  sizes = SIZES.project,
  priority,
  focus,
  hoverHost,
}: MediaSrc & { rate?: number; hoverHost?: string }) {
  const [ref, on] = useInViewVideo(rate, hoverHost);
  const [err, setErr] = useState(false);
  return (
    <span className="clip">
      {/* A plain img: Sanity's CDN or Next's optimizer does the resizing (lib/image). */}
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          srcSet={srcSet(poster)}
          sizes={sizes}
          alt={alt}
          data-err={err}
          onError={() => setErr(true)}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
        />
      )}
      {/* No poster on the video: the img behind it is the poster, at the right size. */}
      {video && (
        <video
          ref={ref}
          data-src={video}
          data-av1={videoAv1}
          data-small={videoSmall}
          data-small-av1={videoSmallAv1}
          muted
          loop
          playsInline
          preload="none"
          data-on={on}
          aria-hidden="true"
          style={focus ? { objectPosition: focus } : undefined}
        />
      )}
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
  videoAv1,
  videoSmall,
  videoSmallAv1,
  alt,
  rate,
  placeholder,
  sizes,
  priority,
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
      {empty ? <MockTag>{placeholder ?? "Media to come"}</MockTag> : (
        <MediaFill
          poster={poster}
          video={video}
          videoAv1={videoAv1}
          videoSmall={videoSmall}
          videoSmallAv1={videoSmallAv1}
          alt={alt}
          rate={rate}
          sizes={sizes}
          priority={priority}
        />
      )}
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
