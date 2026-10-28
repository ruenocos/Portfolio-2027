"use client";

import { scroll } from "motion";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useMotion } from "@/components/useMotion";
import motionTokens from "../../../design/motion-tokens.json";
import { clamp, cssBezier } from "@/lib/math";

const { easing, entrance, scrollSystem: sx } = motionTokens;
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
const BADGE = ".mock,.slot";

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
    // A block holding a mono badge (mock tag, empty slot) enters as a block
    // instead, so the badge never dims with it.
    if (el.querySelector(BADGE)) return "entrance";
    const mono = getComputedStyle(el).fontFamily.toLowerCase().includes("mono");
    if (!mono && el.textContent?.trim()) return "reveal";
  }
  if (el.matches(ENTER_GROUPS) || el.matches(ENTER_LEAVES)) return "entrance";
  return null;
}

type Line = { top: number; bottom: number };
// Geometry is cached in page coordinates (refreshed when anything resizes),
// so a scroll frame computes from scrollY and only writes.
type Text = { el: HTMLElement; lines: Line[]; peak: number[]; top: number; last: string };
type Pic = { m: HTMLElement; frame: HTMLElement; top: number; h: number; last: string };
type Unit = { el: HTMLElement; top: number; h: number };

const LIT = 0.999; // a line this bright counts as lit
const SOFT_PX = 3; // half the blend between two lines' light
const MIN_FRAME_PX = 80; // smaller clipped pictures are icons and avatars
const RESCAN_MS = 150; // after the page's DOM changes
const HYDRATION_GIVE_UP_MS = 6000;

/**
 * The scroll system (scroll-system-spec v02.2, Wons picked C depth + T1
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
 * 3. Every picture frame, label, fact and control gets the house entrance
 *    at 92% of the screen, and an image fades in only once it has decoded
 *    (the frame shows fill).
 *
 * Calm (Pause motion or reduced motion): nothing of it runs, end states only,
 * and Pause flips it without a reload.
 */
// Nothing may be written before React has hydrated it, or hydration
// breaks. Streamed pages (behind Suspense) hydrate after the shell, so the
// system waits until every row of the page carries React's fiber (checked
// every 100ms; after HYDRATION_GIVE_UP_MS it starts anyway). Pages after the
// first arrive client-side and start at once.
let settled = false;
const hydrated = () =>
  [...document.querySelectorAll(".page-body [data-row], .page-body .frame")].every((el) =>
    Object.keys(el).some((k) => k.startsWith("__reactFiber")),
  );
function whenSettled(fn: () => void) {
  if (settled) return (fn(), () => {});
  const t0 = performance.now();
  const ric = typeof requestIdleCallback === "function";
  let timer = 0;
  let idle = 0;
  let idles = 0;
  const afterIdle = () =>
    ric ? (idle = requestIdleCallback(go, { timeout: 500 })) : (timer = window.setTimeout(go, 200));
  // Fibers are attached a moment before React commits the hydrated tree, so
  // the start also waits for two idle moments in a row after that.
  function go() {
    if (++idles < 2) return void afterIdle();
    settled = true;
    fn();
  }
  const check = () => {
    if (document.readyState === "complete" && (hydrated() || performance.now() - t0 > HYDRATION_GIVE_UP_MS))
      afterIdle();
    else timer = window.setTimeout(check, 100);
  };
  check();
  return () => {
    clearTimeout(timer);
    if (ric) cancelIdleCallback(idle);
  };
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
  const root = document.documentElement;

  const texts = new Map<HTMLElement, Text>();
  const pics = new Map<HTMLElement, Pic>();
  const waiting = new Map<HTMLElement, Unit>();
  const playing = new Set<Animation>();
  const passed = new WeakSet<HTMLElement>(); // looked at and not ours
  let sides: HTMLElement[] = [];
  let H = innerHeight;
  let maxScroll = 0;
  const step = parseFloat(getComputedStyle(root).getPropertyValue("--spacing-dot-step")) || 16;
  const pageTop = (el: Element) => el.getBoundingClientRect().top + scrollY;
  // Below the first screen of the page: anything that shows at the top of the
  // page, even a sliver, stays as the load put it (no dimming after the fact).
  const below = (el: Element) => pageTop(el) >= H;
  root.style.setProperty("--sx-img-fade", `${sx.picture.imageFadeMs}ms`);

  /* ---------- text ---------- */
  const measure = (t: Text) => {
    const box = t.el.getBoundingClientRect();
    t.top = box.top + scrollY;
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
    if (!lines.length) return; // hidden for now (a filter): keep what it had
    // Re-flowed (resize, fonts): carry each line's light over by position.
    const old = t.peak;
    if (old.length && old.length !== lines.length)
      t.peak = lines.map((_, i) => old[Math.min(old.length - 1, Math.floor((i * old.length) / lines.length))]);
    t.lines = lines;
    t.last = "-";
  };
  // A line's light for where its top sits on screen: .25 → 1 across the
  // bottom fifth. A line that can never climb that high (the last lines of
  // a page) gets a window it can reach, so it still ends fully lit.
  // On phones the window sits above the Contact pill (the same inset the
  // page keeps clear for focus: html's scroll-padding-bottom).
  const span = sx.text.start - sx.text.end;
  let inset = 0;
  const alpha = (screenTop: number, y: number) => {
    const end = Math.max(H * sx.text.end - inset, screenTop + y - maxScroll);
    const k = clamp((end + H * span - screenTop) / (H * span));
    return sx.text.from + (1 - sx.text.from) * out3(k);
  };
  const paint = (t: Text, y: number) => {
    const top = t.top - y;
    // Ratchet: a line keeps the most light it has had.
    const a = t.lines.map((l, i) => (t.peak[i] = Math.max(t.peak[i] ?? 0, alpha(top + l.top, y))));
    let next: string;
    if (a.every((v) => v >= LIT)) next = "";
    else if (a.every((v) => Math.abs(v - a[0]) < 0.004)) next = `o:${a[0].toFixed(3)}`;
    else {
      // Hard steps between line boxes, softened a little so descenders don't band.
      const stops: string[] = [];
      a.forEach((v, i) => {
        const c = `rgb(0 0 0 / ${v.toFixed(3)})`;
        const from = i === 0 ? 0 : (t.lines[i - 1].bottom + t.lines[i].top) / 2 + SOFT_PX;
        stops.push(`${c} ${from.toFixed(1)}px`);
        if (i < a.length - 1) {
          const to = (t.lines[i].bottom + t.lines[i + 1].top) / 2 - SOFT_PX;
          stops.push(`${c} ${to.toFixed(1)}px`);
        }
      });
      next = `linear-gradient(to bottom, ${stops.join(", ")})`;
    }
    if (next === t.last) return;
    t.last = next;
    const mask = next.startsWith("linear") ? next : "";
    t.el.style.opacity = next.startsWith("o:") ? next.slice(2) : "";
    t.el.style.maskImage = mask;
    t.el.style.setProperty("-webkit-mask-image", mask);
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
  // About deck) when frames sit absolutely inside one.
  const unitOf = (frame: HTMLElement) => {
    let u = frame;
    for (;;) {
      const pos = getComputedStyle(u).position;
      if ((pos !== "absolute" && pos !== "fixed") || !u.parentElement || u.parentElement === body) return u;
      u = u.parentElement;
    }
  };
  const place = (p: Pic) => {
    const r = p.frame.getBoundingClientRect();
    p.top = r.top + scrollY;
    p.h = r.height;
  };

  /* ---------- the house entrance ---------- */
  const land = (el: HTMLElement) => {
    enterIo.unobserve(el);
    waiting.delete(el);
    delete el.dataset.sxIn;
  };
  const enterIo = new IntersectionObserver(
    (es) => {
      let n = 0;
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        land(el);
        const delay = Math.min(n++, entrance.stagger.maxSteps) * entrance.stagger.ms;
        const opacity = el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: easing["enter-opacity"].ms,
          delay,
          easing: cssBezier(easing["enter-opacity"].bezier),
          fill: "backwards",
        });
        const rise = el.animate([{ translate: `0 ${easing["enter-rise"].distance}` }, { translate: "0 0" }], {
          duration: easing["enter-rise"].ms,
          delay,
          easing: cssBezier(easing["enter-rise"].bezier),
          fill: "backwards",
        });
        for (const a of [opacity, rise]) {
          playing.add(a);
          a.finished.then(
            () => playing.delete(a),
            () => playing.delete(a),
          );
        }
      });
    },
    { rootMargin: `0px 0px -${Math.round((1 - sx.fold) * 100)}% 0px` },
  );
  // A block below the fold waits for it, once per visit (data-sx-unit stays
  // on what has entered; Pause clears it from what was still waiting).
  const enter = (el: HTMLElement) => {
    if (el.dataset.sxUnit !== undefined) return;
    el.dataset.sxUnit = "";
    const r = el.getBoundingClientRect();
    if (r.top < H) return; // already showing: never hide what you can see
    el.dataset.sxIn = "wait";
    waiting.set(el, { el, top: r.top + scrollY, h: r.height });
    enterIo.observe(el);
  };
  // Start loading pictures a screen ahead.
  const nearIo = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        nearIo.unobserve(e.target);
        e.target.querySelectorAll<HTMLImageElement>("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
      }),
    { rootMargin: "0px 0px 100% 0px" },
  );

  /* ---------- geometry ---------- */
  const remeasure = () => {
    H = innerHeight;
    inset = parseFloat(getComputedStyle(root).scrollPaddingBottom) || 0;
    maxScroll = root.scrollHeight - H;
    texts.forEach(measure);
    pics.forEach(place);
    waiting.forEach((u) => {
      const r = u.el.getBoundingClientRect();
      u.top = r.top + scrollY;
      u.h = r.height;
    });
  };
  const resized = new ResizeObserver((es) => {
    // The page grew or shrank (a filter, the archive, a font): everything below moved.
    if (es.some((e) => e.target === main)) remeasure();
    else
      es.forEach((e) => {
        const t = texts.get(e.target as HTMLElement);
        if (t) measure(t);
      });
    frame(scrollY);
  });
  resized.observe(main);

  /* ---------- what's ours ---------- */
  const scan = () => {
    H = innerHeight;
    maxScroll = root.scrollHeight - H;
    // Text: outermost blocks first, so a block and its paragraphs never both reveal.
    main.querySelectorAll<HTMLElement>(TEXT).forEach((el) => {
      if (texts.has(el) || passed.has(el)) return;
      const inside = [...texts.keys()].some((t) => t.contains(el) || el.contains(t));
      const kind = motionKind(el);
      if (kind === "entrance") return; // the entrance pass takes it
      if (inside || kind !== "reveal" || !below(el)) return void passed.add(el);
      const t: Text = { el, lines: [], peak: [], top: 0, last: "-" };
      texts.set(el, t);
      measure(t);
      paint(t, scrollY); // dimmed while still off screen, never in view
      resized.observe(el);
    });
    // Pictures: one entrance on the frame (or its group), depth inside it.
    // Wessel's own objects keep their motion, but their images still load
    // ahead and show only once decoded, like every other picture.
    main.querySelectorAll<HTMLElement>("img,video").forEach((m) => {
      if (pics.has(m) || passed.has(m)) return;
      const own = !!m.closest(OWN);
      if (m.closest(NOT_PICTURE) || m.parentElement?.closest("[aria-hidden='true']:not(.hand)"))
        return void passed.add(m);
      // Not sized yet (still loading, in a hidden row): looked at again next scan.
      const frame = frameOf(m);
      if (!frame || frame.clientHeight < MIN_FRAME_PX || !below(frame)) return;
      passed.add(m);
      nearIo.observe(frame);
      if (m instanceof HTMLImageElement && !(m.complete && m.naturalWidth)) {
        m.dataset.sxImg = "wait";
        const ok = () => void (m.dataset.sxImg = "ok");
        m.addEventListener("load", () => void m.decode().then(ok, ok), { once: true });
        m.addEventListener("error", ok, { once: true });
      }
      if (own) return;
      passed.delete(m);
      const p: Pic = { m, frame, top: 0, h: 0, last: "" };
      place(p);
      pics.set(m, p);
      m.style.scale = String(sx.depth.scale);
      enter(unitOf(frame));
    });
    // Labels, facts, controls: the house entrance, never around text or a picture.
    const taken = (el: HTMLElement) =>
      [...texts.keys()].some((t) => t.contains(el) || el.contains(t)) ||
      [...pics.values()].some((p) => el.contains(p.frame) || p.frame.contains(el));
    main.querySelectorAll<HTMLElement>(`${ENTER_GROUPS},${ENTER_LEAVES},${TEXT}`).forEach((el) => {
      if (passed.has(el) || el.closest("[data-sx-unit]")) return;
      const loose = !el.matches(ENTER_GROUPS) && el.parentElement?.closest(ENTER_GROUPS);
      if (loose || motionKind(el) !== "entrance" || taken(el)) return void passed.add(el);
      if (!below(el)) return;
      if (el.offsetHeight) enter(el);
    });
    // Gone from the page (a filter, a live edit): let go.
    texts.forEach((t, el) => {
      if (el.isConnected) return;
      resized.unobserve(el);
      texts.delete(el);
    });
    pics.forEach((p, m) => {
      if (m.isConnected) return;
      nearIo.unobserve(p.frame);
      pics.delete(m);
    });
    waiting.forEach((u, el) => !el.isConnected && land(el));
    sides = [...body.querySelectorAll<HTMLElement>(".frame > .side")];
  };

  /* ---------- each scroll frame: compute from scrollY, then write ---------- */
  const frame = (y: number) => {
    // Text not yet lit, from the bottom of the screen up (a jump past a
    // block lights it too, so scrolling back never finds it dim).
    texts.forEach((t) => t.last !== "" && t.top - y < H && paint(t, y));
    pics.forEach((p) => {
      if (p.top + p.h < y || p.top > y + H) return;
      const d = clamp((p.top - y + p.h / 2 - H / 2) / H, -1, 1);
      const v = `0 ${(d * sx.depth.shiftPct).toFixed(2)}%`;
      if (v !== p.last) p.m.style.translate = p.last = v;
    });
    // Jumped right past it: it's above the screen, so it simply lands.
    waiting.forEach((u, el) => u.top + u.h < y && land(el));
    // The dots trail the page: 70% of scroll, wrapped to one dot step.
    const dot = `${((((y * (1 - sx.dots.speed)) % step) + step) % step).toFixed(2)}px`;
    sides.forEach((s) => s.style.setProperty("--dot-y", dot));
  };

  inset = parseFloat(getComputedStyle(root).scrollPaddingBottom) || 0;
  scan();
  root.dataset.sx = "on";
  const stopScroll = scroll((_p: number, info: { y: { current: number } }) => frame(info.y.current));
  const onResize = () => {
    remeasure();
    frame(scrollY);
  };
  addEventListener("resize", onResize);
  let pending = 0;
  const mo = new MutationObserver(() => {
    clearTimeout(pending);
    pending = window.setTimeout(() => {
      scan();
      frame(scrollY);
    }, RESCAN_MS);
  });
  mo.observe(body, { childList: true, subtree: true });
  document.fonts?.ready.then(onResize);
  frame(scrollY);

  return () => {
    stopScroll();
    removeEventListener("resize", onResize);
    clearTimeout(pending);
    mo.disconnect();
    resized.disconnect();
    enterIo.disconnect();
    nearIo.disconnect();
    playing.forEach((a) => a.cancel());
    delete root.dataset.sx;
    texts.forEach(clearText);
    pics.forEach(({ m }) => {
      m.style.scale = "";
      m.style.translate = "";
      if (m.dataset.sxImg) m.dataset.sxImg = "ok";
    });
    // What hadn't entered yet gets its entrance again when motion comes back.
    waiting.forEach((_, el) => {
      delete el.dataset.sxIn;
      delete el.dataset.sxUnit;
    });
    sides.forEach((s) => s.style.removeProperty("--dot-y"));
  };
}
