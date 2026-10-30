"use client";

import { useEffect, useRef, useState } from "react";

export type PlayerLook = "quiet" | "editor";

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
/** 1:05, or 1:02:05 past an hour. */
const clock = (t: number) => {
  if (!Number.isFinite(t)) return "0:00";
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(t % 60)}` : `${m}:${pad(t % 60)}`;
};
/** 00:00:12:04, an editor's timecode (frames at 25 fps). */
const timecode = (t: number) => {
  if (!Number.isFinite(t)) t = 0;
  return `${pad(t / 3600)}:${pad((t % 3600) / 60)}:${pad(t % 60)}:${pad((t % 1) * 25)}`;
};

function Icon({ name }: { name: "play" | "pause" | "sound" | "muted" | "full" }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {name === "play" && <path d="M4.5 2.9v10.2c0 .6.6.9 1.1.6l8-5.1c.5-.3.5-.9 0-1.2l-8-5.1c-.5-.3-1.1 0-1.1.6z" fill="currentColor" />}
      {name === "pause" && (
        <>
          <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
          <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
        </>
      )}
      {(name === "sound" || name === "muted") && (
        <path d="M2.5 6h2.2L8 3.2v9.6L4.7 10H2.5z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      )}
      {name === "sound" && <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.3 3.8a6 6 0 0 1 0 8.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
      {name === "muted" && <path d="M10.5 6l3.5 4M14 6l-3.5 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
      {name === "full" && (
        <path d="M2.5 6V3.5a1 1 0 0 1 1-1H6M10 2.5h2.5a1 1 0 0 1 1 1V6M13.5 10v2.5a1 1 0 0 1-1 1H10M6 13.5H3.5a1 1 0 0 1-1-1V10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

/**
 * The viewer's video player: the usual controls (play, scrub, time, sound,
 * full screen), drawn in the system. Your hand is grape: the playhead and
 * what you press. "quiet" floats a pill bar inside the frame; "editor" puts
 * a slim timeline under it, with a timecode and a second ruler.
 */
export function Player({
  src,
  poster,
  alt,
  sound,
  look,
  active,
}: {
  src: string;
  poster?: string;
  alt: string;
  sound?: boolean;
  look: PlayerLook;
  /** Only the item on screen plays. */
  active: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(!sound);
  const [hover, setHover] = useState<number | null>(null);
  const [idle, setIdle] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else v.pause();
  }, [active]);

  // Time runs on a frame loop while it plays, so the playhead glides.
  useEffect(() => {
    const v = video.current;
    if (!v || !playing) return;
    let raf = 0;
    const tick = () => {
      setTime(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // The quiet bar steps aside after 2s without a pointer move, while playing.
  useEffect(() => {
    if (look !== "quiet" || !playing) return;
    const el = wrap.current;
    let t = 0;
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = window.setTimeout(() => setIdle(true), 2000);
    };
    wake();
    el?.addEventListener("pointermove", wake);
    el?.addEventListener("focusin", wake);
    return () => {
      clearTimeout(t);
      el?.removeEventListener("pointermove", wake);
      el?.removeEventListener("focusin", wake);
    };
  }, [look, playing]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };
  const at = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * (dur || 0);
  };
  const seek = (t: number) => {
    const v = video.current;
    if (!v || !dur) return;
    v.currentTime = Math.max(0, Math.min(dur, t));
    setTime(v.currentTime);
  };
  const scrub = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubbing(true);
    seek(at(e.clientX));
    const move = (ev: PointerEvent) => seek(at(ev.clientX));
    const up = () => {
      setScrubbing(false);
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  };
  const keys = (e: React.KeyboardEvent) => {
    const step = { ArrowLeft: -5, ArrowRight: 5, ArrowDown: -5, ArrowUp: 5, PageDown: -10, PageUp: 10 }[e.key];
    if (step != null) seek(time + step);
    else if (e.key === "Home") seek(0);
    else if (e.key === "End") seek(dur);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };
  const full = () => {
    const el = look === "quiet" ? wrap.current : video.current;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void (el?.requestFullscreen?.() ?? (video.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen?.());
  };

  const p = dur ? time / dur : 0;
  const ticks = look === "editor" && dur ? Math.floor(dur) : 0;
  const label = look === "editor" ? timecode : clock;

  return (
    <div ref={wrap} className="plyr" data-look={look} data-idle={(idle && playing && look === "quiet") || undefined} data-playing={playing || undefined}>
      <video
        ref={video}
        src={src}
        poster={poster}
        playsInline
        loop={!sound}
        muted={muted}
        preload="metadata"
        aria-label={alt}
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onTimeUpdate={(e) => !playing && setTime(e.currentTarget.currentTime)}
      />
      <div className="pbar" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" className="pbtn" aria-label={playing ? "Pause" : "Play"} onClick={toggle} data-on={playing || undefined}>
          <Icon name={playing ? "pause" : "play"} />
        </button>
        {look === "editor" && <span className="ptc text-micro">{timecode(time)}</span>}
        <div
          ref={track}
          className="ptrack"
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(dur)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${clock(time)} of ${clock(dur)}`}
          data-scrub={scrubbing || undefined}
          onPointerDown={scrub}
          onPointerMove={(e) => setHover(at(e.clientX))}
          onPointerLeave={() => setHover(null)}
          onKeyDown={keys}
        >
          {ticks > 0 && (
            <span className="pticks" aria-hidden="true">
              {Array.from({ length: ticks }, (_, i) => (
                <i key={i} style={{ left: `${((i + 1) / dur) * 100}%` }} data-big={(i + 1) % 5 === 0 || undefined} />
              ))}
            </span>
          )}
          <span className="prun" aria-hidden="true" style={{ transform: `scaleX(${p})` }} />
          <span className="phead" aria-hidden="true" style={{ left: `${p * 100}%` }} />
          {hover != null && dur > 0 && (
            <span className="phov text-micro" aria-hidden="true" style={{ left: `${(hover / dur) * 100}%` }}>
              {label(hover)}
            </span>
          )}
        </div>
        {look === "quiet" && (
          <span className="ptime text-micro">
            {clock(time)} <span className="text-mute">/ {clock(dur)}</span>
          </span>
        )}
        <button type="button" className="pbtn ghost" aria-label={muted ? "Sound on" : "Sound off"} onClick={() => setMuted((m) => !m)}>
          <Icon name={muted ? "muted" : "sound"} />
        </button>
        <button type="button" className="pbtn ghost" aria-label="Full screen" onClick={full}>
          <Icon name="full" />
        </button>
      </div>
    </div>
  );
}
