import { useEffect, useRef, type RefObject } from "react";
import { getMotion } from "@/lib/motion";
import { finePointer, touch } from "@/lib/media";

/**
 * Everything the hero's reel does: the small loop that plays once Wessel
 * invites you to it, its lean toward your pointer, the touch slop, and the
 * full reel that opens in a dialog.
 */
export function useReel(still: boolean, nameRef: RefObject<HTMLDivElement | null>) {
  const reel = useRef<HTMLAnchorElement>(null);
  const loop = useRef<HTMLVideoElement>(null);
  const progress = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const full = useRef<HTMLVideoElement>(null);
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
    const draw = () => {
      if (video.duration && progress.current) {
        progress.current.style.transform = `scaleX(${(video.currentTime / video.duration).toFixed(4)})`;
      }
      raf = visible && !video.paused ? requestAnimationFrame(draw) : 0;
    };
    syncLoop.current = () => {
      if (visible && invited.current && !still && !dialog.current?.open) {
        if (!video.src && video.dataset.src) video.src = video.dataset.src;
        video.play().then(() => (raf ||= requestAnimationFrame(draw)), () => {});
      } else video.pause();
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
      cancelAnimationFrame(raf);
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

  // The reel opens like a Playground post: it lifts out of its frame and
  // springs to the middle over a canvas wash, then drops back on close.
  const fly = (open: boolean) => {
    const box = dialog.current;
    const media = box?.querySelector<HTMLElement>(".rbm");
    const from = reel.current?.getBoundingClientRect();
    if (!box || !media || !from) return;
    const to = media.getBoundingClientRect();
    const scale = from.width / to.width;
    const start = `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${scale})`;
    if (open) {
      media.style.transition = "none";
      media.style.transform = start;
      media.getBoundingClientRect();
      media.style.transition = "";
      requestAnimationFrame(() => {
        box.dataset.on = "";
        media.style.transform = "";
      });
    } else {
      delete box.dataset.on;
      media.style.transform = start;
    }
  };

  const openReel = (e: React.MouseEvent) => {
    e.preventDefault();
    const box = dialog.current;
    const video = full.current;
    if (!box || !video) return;
    box.showModal();
    loop.current?.pause();
    video.currentTime = 0;
    video.play().catch(() => {});
    fly(true);
  };
  const closeReel = () => {
    const box = dialog.current;
    if (!box?.open || box.dataset.closing != null) return;
    box.dataset.closing = "";
    full.current?.pause();
    fly(false);
    setTimeout(
      () => {
        delete box.dataset.closing;
        box.close();
      },
      getMotion().calm ? 0 : 560,
    );
  };
  /** After the dialog closed (by any route): back to the loop, focus on the reel. */
  const reelClosed = () => {
    full.current?.pause();
    syncLoop.current();
    reel.current?.focus({ preventScroll: true });
  };

  return { reel, loop, progress, dialog, full, playLoop, stopLoop, markInvited, openReel, closeReel, reelClosed };
}
