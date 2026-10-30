import { useEffect, useRef, type RefObject } from "react";
import { finePointer, touch } from "@/lib/media";
import { openViewer } from "@/lib/viewer";

/**
 * Everything the hero's reel does: the small loop that plays once Wessel
 * invites you to it, its lean toward your pointer, the touch slop, and the
 * full reel that opens in the viewer.
 */
export function useReel(
  still: boolean,
  nameRef: RefObject<HTMLDivElement | null>,
  full: { video?: string; poster?: string },
) {
  const reel = useRef<HTMLAnchorElement>(null);
  const loop = useRef<HTMLVideoElement>(null);
  const progress = useRef<HTMLElement>(null);
  const opened = useRef(false);
  const invited = useRef(false);

  // The loop plays once Wessel has invited you to it, only on screen, never
  // while calm. A grape bar tracks its time.
  const syncLoop = useRef(() => {});
  useEffect(() => {
    const video = loop.current;
    const link = reel.current;
    if (!video || !link) return;
    let visible = false;
    let raf = 0;
    // The bar moves when the video shows a new frame, not on every screen
    // refresh (the reel runs at its own frame rate).
    const vfc = "requestVideoFrameCallback" in video;
    const next = () => (vfc ? video.requestVideoFrameCallback(draw) : requestAnimationFrame(draw));
    const stop = () => (vfc ? video.cancelVideoFrameCallback(raf) : cancelAnimationFrame(raf));
    const draw = () => {
      if (video.duration && progress.current) {
        progress.current.style.transform = `scaleX(${(video.currentTime / video.duration).toFixed(4)})`;
      }
      raf = visible && !video.paused ? next() : 0;
    };
    syncLoop.current = () => {
      if (visible && invited.current && !still && !opened.current) {
        if (!video.src && video.dataset.src) video.src = video.dataset.src;
        video.play().then(() => (raf ||= next()), () => {});
      } else {
        video.pause();
        // A paused video calls back no frames, so the pending one is dropped here.
        stop();
        raf = 0;
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncLoop.current();
    });
    io.observe(link);
    const playing = () => (video.dataset.on = "true");
    video.addEventListener("playing", playing);
    return () => {
      io.disconnect();
      stop();
      video.removeEventListener("playing", playing);
      video.pause();
    };
  }, [still]);

  const playLoop = () => {
    invited.current = true;
    reel.current?.setAttribute("data-on", "");
    syncLoop.current();
  };
  const stopLoop = () => {
    invited.current = false;
    reel.current?.removeAttribute("data-on");
    loop.current?.pause();
  };
  /** Calm, or a reload halfway down: the loop counts as invited. */
  const markInvited = () => (invited.current = true);

  // Magnetism: the reel leans toward your pointer as it comes near.
  useEffect(() => {
    const link = reel.current;
    if (!link) return;
    link.style.transform = "";
    if (still || !finePointer()) return;
    const lean = { x: 0, y: 0, toX: 0, toY: 0 };
    let raf = 0;
    const draw = () => {
      lean.x += (lean.toX - lean.x) * 0.12;
      lean.y += (lean.toY - lean.y) * 0.12;
      link.style.transform = `translate(${lean.x.toFixed(2)}px,${lean.y.toFixed(2)}px)`;
      raf = Math.abs(lean.toX - lean.x) + Math.abs(lean.toY - lean.y) > 0.05 ? requestAnimationFrame(draw) : 0;
    };
    const move = (e: PointerEvent) => {
      const box = link.getBoundingClientRect();
      const dx = e.clientX - (box.left + box.width / 2 - lean.x);
      const dy = e.clientY - (box.top + box.height / 2 - lean.y);
      const reach = Math.max(box.width, box.height) * 0.5 + 140;
      const distance = Math.hypot(dx, dy);
      if (distance < reach) {
        const pull = 0.28 * (1 - Math.max(0, distance - box.width * 0.4) / reach);
        lean.toX = dx * pull;
        lean.toY = dy * pull;
      } else lean.toX = lean.toY = 0;
      raf ||= requestAnimationFrame(draw);
    };
    addEventListener("pointermove", move, { passive: true });
    return () => {
      removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
      link.style.transform = "";
    };
  }, [still]);

  // Touch: a tap within 12px of the small reel opens it (the reel keeps its
  // size, so Wessel's selection still measures the real thing).
  useEffect(() => {
    const name = nameRef.current;
    const link = reel.current;
    if (!name || !link || !touch()) return;
    const SLOP = 12;
    const tap = (e: MouseEvent) => {
      if ((e.target as Element).closest(".reel")) return;
      const box = link.getBoundingClientRect();
      const near =
        e.clientX > box.left - SLOP && e.clientX < box.right + SLOP && e.clientY > box.top - SLOP && e.clientY < box.bottom + SLOP;
      if (near) link.click();
    };
    name.addEventListener("click", tap);
    return () => name.removeEventListener("click", tap);
  }, [nameRef]);

  // The full reel opens in the viewer: it grows out of the small one and
  // drops back into it on close, then the loop picks up again.
  const openReel = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!full.video) return;
    opened.current = true;
    loop.current?.pause();
    const done = openViewer({
      items: [{ kind: "video", video: full.video, src: full.poster, alt: "Reel", width: 16, height: 9, sound: true }],
      index: 0,
      from: reel.current,
      onClose: () => {
        opened.current = false;
        syncLoop.current();
      },
    });
    if (!done) opened.current = false;
  };

  return { reel, loop, progress, playLoop, stopLoop, markInvited, openReel };
}
