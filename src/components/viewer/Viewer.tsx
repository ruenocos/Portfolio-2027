"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Arrow } from "@/components/parts/Arrow";
import { getMotion } from "@/lib/motion";
import { onViewer, type ViewerRequest } from "@/lib/viewer";
import { Player } from "./Player";

// Room the media leaves for the chrome: Close on top, the counter
// under it, the step buttons at the sides (phones swipe instead).
const ROOM = { top: 72, bottom: 88, side: 88, sidePhone: 16 };
const MS = 560;

type Box = { x: number; y: number; w: number; h: number };

/** Where items[i] sits on screen: as big as fits, at its own shape. */
function fit(w: number, h: number): Box {
  const phone = innerWidth < 900;
  const side = phone ? ROOM.sidePhone : ROOM.side;
  const W = innerWidth - side * 2;
  const H = innerHeight - ROOM.top - ROOM.bottom;
  const s = Math.min(W / w, H / h);
  const bw = Math.round(w * s);
  const bh = Math.round(h * s);
  return { x: Math.round((innerWidth - bw) / 2), y: Math.round(ROOM.top + (H - bh) / 2), w: bw, h: bh };
}

/**
 * The one viewer (lib/viewer): case pictures and loops, and the reel. It
 * grows out of the tile you pressed and shrinks back into it, like a
 * Playground post. Pictures zoom on a click and pan by dragging; ← → and a
 * swipe step through the rest of the set. Calm: no flight, just there.
 */
export function Viewer() {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [req, setReq] = useState<ViewerRequest | null>(null);
  const [index, setIndex] = useState(0);
  const [on, setOn] = useState(false);
  const [zoom, setZoom] = useState<{ s: number; x: number; y: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const closing = useRef(false);

  const item = req?.items[index];
  const many = (req?.items.length ?? 0) > 1;

  useEffect(
    () =>
      onViewer((r) => {
        closing.current = false;
        setZoom(null);
        setIndex(r.index);
        // The frame needs its box in the same render, so the open below finds it.
        setBox(fit(r.items[r.index].width, r.items[r.index].height));
        setReq(r);
      }),
    [],
  );

  // Its box follows the window.
  useEffect(() => {
    if (!item) return;
    const size = () => setBox(fit(item.width, item.height));
    size();
    addEventListener("resize", size);
    return () => removeEventListener("resize", size);
  }, [item]);

  /** The transform that puts the frame over a tile. */
  const over = (tile: HTMLElement | null | undefined, b: Box) => {
    const t = tile?.getBoundingClientRect();
    if (!t || !t.width) return "translate(0,40px) scale(0.96)";
    // One scale, centred on the tile: a tile cut to another shape (a 2 or 3
    // row) grows into the whole picture without stretching it.
    const s = Math.max(t.width / b.w, t.height / b.h);
    return `translate(${t.left + t.width / 2 - (b.x + b.w / 2)}px,${t.top + t.height / 2 - (b.y + b.h / 2)}px) scale(${s})`;
  };

  // Open: from the tile to its box, over a canvas wash.
  useLayoutEffect(() => {
    const d = dialog.current;
    const f = frame.current;
    if (!req || !d || !f || d.open) return;
    const b = fit(req.items[req.index].width, req.items[req.index].height);
    d.showModal();
    document.documentElement.classList.add("viewer-open");
    if (getMotion().calm) {
      requestAnimationFrame(() => setOn(true));
      return;
    }
    f.style.transition = "none";
    f.style.transform = over(req.from, b);
    f.getBoundingClientRect();
    f.style.transition = "";
    requestAnimationFrame(() => {
      setOn(true);
      f.style.transform = "";
    });
  }, [req]);

  const close = useCallback(() => {
    const d = dialog.current;
    const f = frame.current;
    if (!d?.open || !req || closing.current) return;
    closing.current = true;
    setZoom(null);
    setOn(false);
    const tile = req.tileFor?.(index) ?? (index === req.index ? req.from : null);
    const calm = getMotion().calm;
    if (f && box && !calm) f.style.transform = over(tile, box);
    setTimeout(
      () => {
        d.close();
        if (f) f.style.transform = "";
        document.documentElement.classList.remove("viewer-open");
        tile?.focus({ preventScroll: true });
        req.onClose?.();
        setReq(null);
      },
      calm ? 0 : MS,
    );
  }, [req, index, box]);

  const step = useCallback(
    (d: number) => {
      if (!req || !many) return;
      setZoom(null);
      setIndex((i) => (i + d + req.items.length) % req.items.length);
    },
    [req, many],
  );

  // Keys: Esc closes (the dialog's cancel), ← → step.
  useEffect(() => {
    if (!req) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else return;
      e.preventDefault();
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [req, step]);

  // Swipe to step (phones), only while not zoomed in.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const down = (e: React.PointerEvent) => {
    if (zoom || e.pointerType === "mouse") return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const up = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s.y)) step(dx < 0 ? 1 : -1);
  };

  // Pictures: a click zooms to the pixels (at least 2×) where you clicked; drag pans; a click zooms out.
  const pan = useRef<{ x: number; y: number; zx: number; zy: number; moved: boolean } | null>(null);
  const zoomAt = (e: React.MouseEvent<HTMLImageElement>) => {
    if (pan.current?.moved) return;
    if (zoom) return setZoom(null);
    const img = e.currentTarget;
    const r = img.getBoundingClientRect();
    const s = Math.max(2, (img.naturalWidth || item!.width) / r.width);
    const fx = (e.clientX - r.left) / r.width - 0.5;
    const fy = (e.clientY - r.top) / r.height - 0.5;
    setZoom({ s, x: -fx * r.width * (s - 1), y: -fy * r.height * (s - 1) });
  };
  const panDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!zoom) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pan.current = { x: e.clientX, y: e.clientY, zx: zoom.x, zy: zoom.y, moved: false };
  };
  const panMove = (e: React.PointerEvent<HTMLImageElement>) => {
    const p = pan.current;
    if (!p || !zoom || !box) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (Math.hypot(dx, dy) > 4) p.moved = true;
    const mx = (box.w * (zoom.s - 1)) / 2;
    const my = (box.h * (zoom.s - 1)) / 2;
    setZoom({ ...zoom, x: Math.max(-mx, Math.min(mx, p.zx + dx)), y: Math.max(-my, Math.min(my, p.zy + dy)) });
  };
  const panUp = () => setTimeout(() => (pan.current = null), 0);

  return (
    <dialog
      ref={dialog}
      className="vwr"
      aria-label={item ? `Viewer: ${item.alt}` : "Viewer"}
      data-on={on || undefined}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
      onPointerDown={down}
      onPointerUp={up}
    >
      {req && item && box && (
        <>
          <div
            ref={frame}
            className="vfr"
            data-kind={item.kind}
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
          >
            {item.kind === "video" && item.video ? (
              <Player key={`${index}-${item.video}`} src={item.video} poster={item.src} alt={item.alt} sound={item.sound} active={on} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- the full picture, at the size it was uploaded
              <img
                key={item.src}
                src={item.src}
                srcSet={item.srcSet}
                sizes={`${box.w}px`}
                alt={item.alt}
                draggable={false}
                data-zoom={zoom ? "" : undefined}
                style={zoom ? { transform: `translate(${zoom.x}px,${zoom.y}px) scale(${zoom.s})` } : undefined}
                onClick={zoomAt}
                onPointerDown={panDown}
                onPointerMove={panMove}
                onPointerUp={panUp}
              />
            )}
          </div>
          {many && (
            <p className="vcount text-micro" aria-live="polite" style={{ left: box.x, top: box.y + box.h + 12, width: box.w }}>
              {index + 1} / {req.items.length}
            </p>
          )}
          {many && (
            <>
              <button type="button" className="vstep pbtn" data-dir="prev" aria-label="Previous" onClick={() => step(-1)}>
                <Arrow dir="left" />
              </button>
              <button type="button" className="vstep pbtn" data-dir="next" aria-label="Next" onClick={() => step(1)}>
                <Arrow dir="right" />
              </button>
            </>
          )}
          <button type="button" className="vx gpill text-link" data-size="tap" onClick={close} autoFocus>
            Close
          </button>
        </>
      )}
    </dialog>
  );
}
