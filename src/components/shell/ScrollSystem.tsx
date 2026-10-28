"use client";

import { scroll } from "motion";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useMotion } from "@/components/useMotion";
import motionTokens from "../../../design/motion-tokens.json";

const { easing, entrance, scrollSystem: sx } = motionTokens;
const bezier = (b: number[]) => `cubic-bezier(${b.join(",")})`;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const out3 = (x: number) => 1 - (1 - x) ** 3;

// What counts as reading text, and what never reveals: mono labels, pills,
// chips, buttons, nav, pins, facts, the email, Wessel's marks, and text that
// already has its own reveal (Focus's statement types itself: one effect at a time).
const TEXT = "h2,h3,h4,p,blockquote,li,.text-title,.text-lead,.text-statement,.text-headline,.text-body,.text-accent";
const NOT_TEXT =
  ".text-label,header,nav,aside,button,dl,.pin,.bub,.gpill,.tz,.tools,.tool,.mail,.stmt,.sr-only,[aria-hidden='true'],[data-sx-skip]";
const NOT_INSIDE = "img,video,canvas,button,input,select,textarea,.media,.pin";
// Pictures that never take part: icons, avatars.
const NOT_PICTURE = ".tool,.tools,.av,.pin,[data-sx-skip]";
// Wessel's own objects keep their own arrival: the archive fan, Focus's
// dioramas and Daily kit chips, the About stickers, the Playground canvas.
const OWN = ".hand,.fcard,.fcap,.obj,.kitc,.stk,.pgcv";
// Labels, facts and controls get the house entrance. Groups first (the case
// Layers panel, a facts list, a row of tools), then whatever is left alone.
const ENTER_GROUPS = ".lp,dl,.tools,.meta";
const ENTER_LEAVES = ".text-label,figcaption,a,button,.gpill";

/**
 * One rule per kind (spec v02.2 §4), so nothing gets two effects and
 * nothing is left static: text lines reveal, pictures enter and drift,
 * labels/facts/controls enter, Wessel's objects keep their own motion.
 */
type Kind = "reveal" | "entrance" | "own" | null;
function motionKind(el: HTMLElement): Kind {
  if (el.closest(OWN)) return "own";
  if (el.closest("[aria-hidden='true'],.sr-only,[data-sx-skip]")) return null;
  if (el.matches(TEXT) && !el.closest(NOT_TEXT) && !el.querySelector(NOT_INSIDE)) {
    const mono = getComputedStyle(el).fontFamily.toLowerCase().includes("mono");
    if (!mono && el.textContent?.trim()) return "reveal";
  }
  if (el.matches(ENTER_GROUPS) || el.matches(ENTER_LEAVES)) return "entrance";
  return null;
}

type Line = { top: number; bottom: number };
type Text = { el: HTMLElement; lines: Line[]; peak: number[]; on: boolean; last: string };
type Pic = { m: HTMLElement; frame: HTMLElement; on: boolean };

/**
 * The scroll system (scroll-system-spec v02.1, Wons picked C depth + T1
 * light on 2026-10-28). One system on every page, for everything below the
 * first screen (that screen keeps its load entrance):
 *
 * 1. Text lights up line by line (opacity .25 → 1, out-cubic) while the
 *    line's top crosses the bottom fifth of the screen, and stays lit.
 *    Nothing is split: each block gets a per-line alpha mask built from its
 *    own line boxes, so React's text nodes, selection, find-in-page and
 *    screen readers see the page untouched.
 * 2. Depth: pictures sit at scale 1.1 inside their frame and drift ±5% with
 *    the frame's distance from the screen's centre; the side dots pan at 70%.
 *    Text, frames and cells never move.
 * 3. Every picture frame gets the house entrance at 92% of the screen, and
 *    an image fades in only once it has decoded (the frame shows fill).
 *
 * Calm (Pause motion or reduced motion): nothing of it runs, end states only,
 * and Pause flips it without a reload.
 */
// Nothing may be written before React has hydrated it, or hydration
// breaks. Streamed pages (behind Suspense) hydrate after the shell, so the
// system waits until every row of the page carries React's fiber (checked
// every 100ms, given up on after 6s). Pages after the first arrive
// client-side and start at once.
let settled = false;
const hydrated = () =>
  [...document.querySelectorAll(".page-body [data-row], .page-body .frame")].every((el) =>
    Object.keys(el).some((k) => k.startsWith("__reactFiber")),
  );
function whenSettled(fn: () => void) {
  if (settled) return (fn(), () => {});
  const t0 = performance.now();
  let timer = 0;
  const check = () => {
    if (document.readyState === "complete" && (hydrated() || performance.now() - t0 > 6000)) {
      settled = true;
      fn();
    } else timer = window.setTimeout(check, 100);
  };
  check();
  return () => clearTimeout(timer);
}

export function ScrollSystem() {
  const pathname = usePathname();
  const { calm } = useMotion();

  useEffect(() => {
    if (calm) return;
    let stop = () => {};
    const cancel = whenSettled(() => (stop = start()));
    return () => {
      cancel();
      stop();
    };
  }, [pathname, calm]);

  return null;
}

function start() {
  // Text and pictures come from the page itself; the dots run on the footer too.
  const body = document.querySelector<HTMLElement>(".page-body");
  const main = document.querySelector<HTMLElement>("main");
  if (!body || !main) return () => {};

  const texts = new Map<HTMLElement, Text>();
  const pics = new Map<HTMLElement, Pic>();
  const waiting = new Set<HTMLElement>();
  let sides: HTMLElement[] = [];
  let H = innerHeight;
  const step = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--spacing-dot-step")) || 16;
  let maxScroll = 0;
  // Below the first screen of the page (in page coordinates).
  const below = (el: Element) => el.getBoundingClientRect().top + scrollY >= H * sx.fold;

  /* ---------- text ---------- */
  const measure = (t: Text) => {
    const box = t.el.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(t.el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0).sort((a, b) => a.top - b.top);
    const lines: Line[] = [];
    for (const r of rects) {
      const top = r.top - box.top;
      const bottom = r.bottom - box.top;
      const cur = lines[lines.length - 1];
      // Same line when the boxes overlap by more than half the shorter one.
      if (cur && top < cur.bottom - Math.min(cur.bottom - cur.top, bottom - top) / 2) {
        cur.top = Math.min(cur.top, top);
        cur.bottom = Math.max(cur.bottom, bottom);
      } else lines.push({ top, bottom });
    }
    // Re-flowed (resize, fonts): a lit block stays lit, otherwise start over.
    const lit = t.peak.length > 0 && t.peak.every((v) => v >= 0.999);
    t.lines = lines;
    t.peak = lit ? lines.map(() => 1) : [];
  };
  // A line's light for where its top sits on screen: .25 → 1 across the
  // bottom fifth. A line that can never climb that high (the last lines of
  // a page) gets a window it can reach, so it still ends fully lit.
  const span = sx.text.start - sx.text.end;
  const alpha = (screenTop: number) => {
    const end = Math.max(H * sx.text.end, screenTop + scrollY - maxScroll);
    const k = clamp((end + H * span - screenTop) / (H * span));
    return sx.text.from + (1 - sx.text.from) * out3(k);
  };
  const paint = (t: Text, top: number) => {
    // Ratchet: a line keeps the most light it has had.
    const a = t.lines.map((l, i) => (t.peak[i] = Math.max(t.peak[i] ?? 0, alpha(top + l.top))));
    let next: string;
    if (!a.length || a.every((v) => v >= 0.999)) next = "";
    else if (a.every((v) => Math.abs(v - a[0]) < 0.004)) next = `o:${a[0].toFixed(3)}`;
    else {
      // Hard steps between line boxes, softened over 6px so descenders don't band.
      const stops: string[] = [];
      a.forEach((v, i) => {
        const c = `rgb(0 0 0 / ${v.toFixed(3)})`;
        const from = i === 0 ? 0 : (t.lines[i - 1].bottom + t.lines[i].top) / 2 + 3;
        stops.push(`${c} ${from.toFixed(1)}px`);
        if (i < a.length - 1) stops.push(`${c} ${((t.lines[i].bottom + t.lines[i + 1].top) / 2 - 3).toFixed(1)}px`);
      });
      next = `linear-gradient(to bottom, ${stops.join(", ")})`;
    }
    if (next === t.last) return;
    t.last = next;
    const s = t.el.style;
    s.opacity = next.startsWith("o:") ? next.slice(2) : "";
    const mask = next.startsWith("linear") ? next : "";
    s.maskImage = mask;
    s.setProperty("-webkit-mask-image", mask);
  };
  const clearText = (t: Text) => {
    t.el.style.opacity = "";
    t.el.style.maskImage = "";
    t.el.style.removeProperty("-webkit-mask-image");
  };

  /* ---------- pictures ---------- */
  const frameOf = (m: HTMLElement) => {
    let a = m.parentElement;
    while (a && a !== body && getComputedStyle(a).overflow === "visible") a = a.parentElement;
    return a && a !== body ? a : null;
  };
  // The block that enters: the frame, or the group it's stacked in (the
  // About deck, the See more hand) when frames sit absolutely inside one.
  const unitOf = (frame: HTMLElement) => {
    let u = frame;
    for (;;) {
      const pos = getComputedStyle(u).position;
      if ((pos !== "absolute" && pos !== "fixed") || !u.parentElement || u.parentElement === body) return u;
      u = u.parentElement;
    }
  };
  const enterIo = new IntersectionObserver(
    (es) => {
      let step = 0;
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        enterIo.unobserve(el);
        waiting.delete(el);
        const d = Math.min(step++, entrance.stagger.maxSteps) * entrance.stagger.ms;
        delete el.dataset.sxIn;
        el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: easing["enter-opacity"].ms,
          delay: d,
          easing: bezier(easing["enter-opacity"].bezier),
          fill: "backwards",
        });
        el.animate([{ translate: `0 ${easing["enter-rise"].distance}` }, { translate: "0 0" }], {
          duration: easing["enter-rise"].ms,
          delay: d,
          easing: bezier(easing["enter-rise"].bezier),
          fill: "backwards",
        });
      });
    },
    { rootMargin: `0px 0px -${Math.round((1 - sx.fold) * 100)}% 0px` },
  );
  // Start loading a screen ahead.
  const nearIo = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        nearIo.unobserve(e.target);
        e.target.querySelectorAll<HTMLImageElement>("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
      }),
    { rootMargin: "0px 0px 100% 0px" },
  );

  /* ---------- what's on screen gets driven ---------- */
  const seen = new IntersectionObserver((es) =>
    es.forEach((e) => {
      const t = texts.get(e.target as HTMLElement);
      if (t) {
        t.on = e.isIntersecting;
        paint(t, e.boundingClientRect.top);
      }
      pics.forEach((p) => {
        if (p.frame === e.target) p.on = e.isIntersecting;
      });
    }),
  );
  const resized = new ResizeObserver((es) =>
    es.forEach((e) => {
      const t = texts.get(e.target as HTMLElement);
      if (t) {
        measure(t);
        t.last = "-";
        paint(t, t.el.getBoundingClientRect().top);
      }
    }),
  );

  // A block below the fold waits for the house entrance, once per visit.
  const enter = (unit: HTMLElement) => {
    if (unit.dataset.sxUnit !== undefined) return;
    unit.dataset.sxUnit = "";
    if (unit.getBoundingClientRect().top <= H * sx.fold) return;
    unit.dataset.sxIn = "wait";
    waiting.add(unit);
    enterIo.observe(unit);
  };

  const scan = () => {
    H = innerHeight;
    maxScroll = document.documentElement.scrollHeight - H;
    // Text: outermost blocks first, so a block and its paragraphs never both reveal.
    main.querySelectorAll<HTMLElement>(TEXT).forEach((el) => {
      if (texts.has(el) || motionKind(el) !== "reveal" || !below(el)) return;
      for (const t of texts.keys()) if (t.contains(el) || el.contains(t)) return;
      const t: Text = { el, lines: [], peak: [], on: false, last: "-" };
      texts.set(el, t);
      measure(t);
      seen.observe(el);
      resized.observe(el);
    });
    // Pictures: one entrance on the frame (or its group), depth inside it.
    main.querySelectorAll<HTMLElement>("img,video").forEach((m) => {
      if (pics.has(m) || m.closest(NOT_PICTURE) || m.closest(OWN) || m.parentElement?.closest("[aria-hidden='true']"))
        return;
      const frame = frameOf(m);
      if (!frame || frame.clientHeight < 80 || !below(frame)) return;
      pics.set(m, { m, frame, on: false });
      m.style.scale = String(sx.depth.scale);
      seen.observe(frame);
      nearIo.observe(frame);
      enter(unitOf(frame));
      if (m instanceof HTMLImageElement && !(m.complete && m.naturalWidth)) {
        m.dataset.sxImg = "wait";
        const ok = () => void (m.dataset.sxImg = "ok");
        m.addEventListener("load", () => void m.decode().then(ok, ok), { once: true });
        m.addEventListener("error", ok, { once: true });
      }
    });
    // Labels, facts, controls: the house entrance, never around text or a picture.
    const taken = (el: HTMLElement) =>
      [...texts.keys()].some((t) => t.contains(el) || el.contains(t)) ||
      [...pics.values()].some((p) => el.contains(p.frame) || p.frame.contains(el));
    main.querySelectorAll<HTMLElement>(`${ENTER_GROUPS},${ENTER_LEAVES}`).forEach((el) => {
      if (el.closest("[data-sx-unit]") || motionKind(el) !== "entrance" || !below(el) || !el.offsetHeight) return;
      if (!el.matches(ENTER_GROUPS) && el.parentElement?.closest(ENTER_GROUPS)) return;
      if (!taken(el)) enter(el);
    });
    // Gone from the page (a filter, a live edit): let go.
    texts.forEach((t, el) => {
      if (!el.isConnected) {
        seen.unobserve(el);
        resized.unobserve(el);
        texts.delete(el);
      }
    });
    pics.forEach((p, m) => !m.isConnected && pics.delete(m));
    sides = [...body.querySelectorAll<HTMLElement>(".frame > .side")];
  };

  const frame = (y: number) => {
    maxScroll = document.documentElement.scrollHeight - H;
    texts.forEach((t) => t.on && t.last !== "" && paint(t, t.el.getBoundingClientRect().top));
    pics.forEach((p) => {
      if (!p.on) return;
      const r = p.frame.getBoundingClientRect();
      const d = clamp((r.top + r.height / 2 - H / 2) / H, -1, 1);
      p.m.style.translate = `0 ${(d * sx.depth.shiftPct).toFixed(2)}%`;
    });
    // The dots trail the page: 70% of scroll, wrapped to one dot step.
    const dot = (((y * (1 - sx.dots.speed)) % step) + step) % step;
    const v = `${dot.toFixed(2)}px`;
    sides.forEach((s) => s.style.setProperty("--dot-y", v));
  };

  scan();
  document.documentElement.dataset.sx = "on";
  const stopScroll = scroll((_p: number, info: { y: { current: number } }) => frame(info.y.current));
  const onResize = () => {
    H = innerHeight;
    maxScroll = document.documentElement.scrollHeight - H;
  };
  addEventListener("resize", onResize);
  let pending = 0;
  const mo = new MutationObserver(() => {
    clearTimeout(pending);
    pending = window.setTimeout(() => {
      scan();
      frame(scrollY);
    }, 150);
  });
  mo.observe(body, { childList: true, subtree: true });
  document.fonts?.ready.then(() => {
    texts.forEach((t) => {
      measure(t);
      t.last = "-";
    });
    frame(scrollY);
  });
  frame(scrollY);

  return () => {
    stopScroll();
    removeEventListener("resize", onResize);
    clearTimeout(pending);
    mo.disconnect();
    seen.disconnect();
    resized.disconnect();
    enterIo.disconnect();
    nearIo.disconnect();
    delete document.documentElement.dataset.sx;
    texts.forEach(clearText);
    pics.forEach(({ m }) => {
      m.style.scale = "";
      m.style.translate = "";
      if (m.dataset.sxImg) m.dataset.sxImg = "ok";
    });
    waiting.forEach((u) => delete u.dataset.sxIn);
    sides.forEach((s) => s.style.removeProperty("--dot-y"));
  };
}
