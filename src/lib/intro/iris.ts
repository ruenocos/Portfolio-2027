// Home's first-visit intro, "Iris" (DESIGN.md §8): a
// tangerine sheet covers the page from the first paint, Wessel's sharpie
// smiley draws itself on it, flies into the header logo, and a round hole
// that follows it opens the sheet onto the finished page. The page itself
// never animates: under the sheet it renders as usual, only the header logo
// waits for the smiley to land.
//
// Foolproof by design: one memoised promise that never rejects, one
// idempotent finish(), a timer watchdog, try/catch around setup and every
// frame, and any input, a hidden tab or a real resize skips to the end.
// <html data-boot> is set before the first paint by bootScript; CSS draws
// the sheet until this takes over and clears it by itself at 4s if it never
// does.

import motionTokens from "../../../design/motion-tokens.json";
import { BOOT_KEY, getMotion, subscribeMotion } from "../motion";
import { FACE, FEATURES } from "../smiley";
import { clamp, lerp } from "../math";

const I = motionTokens.intro;
const END = I.endS;

const prog = (t: number, [a, b]: number[]) => clamp((t - a) / (b - a));
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const f = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 26; i++) {
      const m = (lo + hi) / 2;
      if (f(m, x1, x2) < x) lo = m;
      else hi = m;
    }
    return f((lo + hi) / 2, y1, y2);
  };
}
const [u1, u2, u3, u4] = motionTokens.easing.ui.bezier;
const ui = bezier(u1, u2, u3, u4);
// "move" is the intro's own in-out, not a house token.
const move = bezier(0.65, 0, 0.35, 1);
const back = (x: number) => {
  const s = 1.5;
  x = clamp(x);
  return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;
};

// Each eye pops over most of the eyes window, the second a beat later.
const EYE = I.draw.eyes[1] - I.draw.eyes[0] - 0.06;
const EYES = [
  [I.draw.eyes[0], I.draw.eyes[0] + EYE],
  [I.draw.eyes[0] + 0.06, I.draw.eyes[1]],
];

/** The smiley, drawn as one sharpie loop: a stroke mask reveals the face,
 *  rect masks pop the eyes and pull the smile down. */
function drawnSmiley(layer: HTMLElement) {
  const box = document.createElement("div");
  box.className = "ismi";
  const id = `im${Math.random().toString(36).slice(2, 7)}`;
  box.innerHTML = `<svg viewBox="0 0 212 212" overflow="visible" aria-hidden="true"><defs>
<mask id="${id}r" maskUnits="userSpaceOnUse" x="0" y="0" width="212" height="212"><circle cx="106" cy="106" r="86" fill="none" stroke="#fff" stroke-width="44" pathLength="1" stroke-dasharray="1 1" transform="rotate(-128 106 106)"/></mask>
<mask id="${id}e" maskUnits="userSpaceOnUse" x="0" y="0" width="212" height="212"><rect class="me" x="66" y="40" width="28" height="56" fill="#fff"/><rect class="me" x="98" y="36" width="26" height="64" fill="#fff"/><rect class="ms" x="54" y="100" width="60" height="0" fill="#fff"/></mask>
</defs><path fill="currentColor" fill-rule="evenodd" mask="url(#${id}r)" d="${FACE}"/><path class="feat" fill="currentColor" mask="url(#${id}e)" d="${FEATURES}"/></svg>`;
  layer.appendChild(box);
  const q = <T extends Element>(s: string) => box.querySelector<T>(s)!;
  const rc = q<SVGCircleElement>("circle");
  const eyes = [...box.querySelectorAll<SVGRectElement>(".me")];
  const ms = q<SVGRectElement>(".ms");
  const feat = q<SVGPathElement>(".feat");
  feat.style.transformBox = "fill-box";
  feat.style.transformOrigin = "50% 50%";
  const pop = (r: SVGRectElement, k: number) => {
    const cx = r.x.baseVal.value + r.width.baseVal.value / 2;
    r.setAttribute("transform", `translate(${cx} 68) scale(${Math.max(0, k)}) translate(${-cx} -68)`);
  };
  return {
    box,
    feat,
    draw(t: number) {
      rc.setAttribute("stroke-dashoffset", String(1 - move(prog(t, I.draw.outline))));
      eyes.forEach((r, i) => pop(r, back(prog(t, EYES[i]))));
      ms.setAttribute("height", String(70 * move(prog(t, I.draw.smile))));
    },
  };
}

/** A quadratic arc from a to b that lifts on the way. */
function arc(a: number[], b: number[], k: number, lift: number) {
  const c = [lerp(a[0], b[0], 0.2), Math.min(a[1], b[1]) - lift];
  const u = 1 - k;
  return [u * u * a[0] + 2 * u * k * c[0] + k * k * b[0], u * u * a[1] + 2 * u * k * c[1] + k * k * b[1]];
}

/** What the iris opens onto: the fonts and the reel poster. */
function pageReady() {
  const poster = document.querySelector<HTMLImageElement>(".hero .reel img");
  return Promise.all([
    document.fonts?.ready.catch(() => {}),
    poster?.decode().catch(() => {}),
  ]).then(() => {});
}

let playing: Promise<void> | null = null;
let stop = () => {};

/** Plays the intro if <html data-boot> asks for it. Memoised and never
 *  rejects: the hello beat and Wessel's cursor wait on the same promise. */
export function playIntro(): Promise<void> {
  return (playing ||= new Promise<void>((resolve) => {
    const root = document.documentElement;
    let done = false;
    let skip = false;
    let raf = 0;
    let layer: HTMLDivElement | null = null;
    let btn: HTMLButtonElement | null = null;
    let logo: SVGElement | null = null;
    const sk = () => (skip = true);
    // A scroll counts too, input or not (find in page, a screen reader jump).
    const evs = ["wheel", "keydown", "pointerdown", "touchstart", "scroll"] as const;
    const vw0 = innerWidth;
    const vh0 = innerHeight;
    // A phone's address bar collapsing fires resize too: only a width change
    // or a big height change counts.
    const onResize = () => {
      if (innerWidth !== vw0 || Math.abs(innerHeight - vh0) > 150) sk();
    };
    // rAF stops in a hidden tab, so end it here rather than skip.
    const onVis = () => document.hidden && finish();
    let unMotion = () => {};
    const onShow = (e: PageTransitionEvent) => e.persisted && finish();
    let watchdog = 0;

    function finish() {
      if (done) return;
      done = true;
      try {
        cancelAnimationFrame(raf);
        clearTimeout(watchdog);
        evs.forEach((e) => removeEventListener(e, sk));
        removeEventListener("resize", onResize);
        unMotion();
        removeEventListener("pageshow", onShow);
        document.removeEventListener("visibilitychange", onVis);
        if (logo) logo.style.opacity = "";
        delete root.dataset.boot;
        sessionStorage.setItem(BOOT_KEY, "1");
        // Focus never stays on the pill as it goes. Blurred rather than moved,
        // so the next Tab starts at the top: skip link, logo, nav.
        if (btn) btn.tabIndex = -1;
        if (btn && document.activeElement === btn) btn.blur();
      } catch {}
      // The pill fades, then the layer goes (the sheet is already clear).
      btn?.classList.add("out");
      const l = layer;
      const b = btn;
      setTimeout(() => {
        l?.remove();
        b?.remove();
      }, 260);
      resolve();
    }

    stop = finish;
    if (!root.dataset.boot) return resolve();
    // Pause or reduced motion switched on since the first paint, too late
    // (JS arrived after the CSS failsafe cleared the sheet), or a background
    // tab, or already scrolled (a restored scroll): the finished page, no intro.
    if (getMotion().calm || performance.now() > I.failsafeS * 1000 || document.hidden || scrollY > 0) return finish();
    // JS came late: the sheet has been up a while already, so no ready gate.
    const late = performance.now() > I.gate.lateS * 1000;

    try {
      logo = document.querySelector<SVGElement>(".hd .home .logo");
      layer = document.createElement("div");
      layer.className = "ilayer";
      layer.setAttribute("aria-hidden", "true");
      const sheet = document.createElement("div");
      sheet.className = "isheet";
      layer.appendChild(sheet);
      document.body.appendChild(layer);
      const sm = drawnSmiley(layer);
      if (logo) logo.style.opacity = "0";
      root.dataset.boot = "playing";

      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "iskip text-micro-caps";
      btn.textContent = "Skip intro";
      btn.addEventListener("click", sk);
      // First in the tab order.
      document.body.prepend(btn);

      evs.forEach((e) => addEventListener(e, sk, { passive: true }));
      unMotion = subscribeMotion(() => getMotion().calm && sk());
      addEventListener("resize", onResize);
      addEventListener("pageshow", onShow);
      document.addEventListener("visibilitychange", onVis);
      // The intro's own watchdog: the longest it can run, plus a second.
      watchdog = window.setTimeout(finish, (END + I.gate.maxWait + 1) * 1000);

      // Measured once; a real resize skips.
      const L = logo?.getBoundingClientRect();
      const SZ = Math.min(200, innerWidth * 0.4);
      const home = [innerWidth / 2, innerHeight / 2];
      let dest = L ? [L.left + L.width / 2, L.top + L.height / 2] : [40, 40];
      // Measured again once the fonts are in, in case the header moved.
      const measure = () => {
        const R = logo?.getBoundingClientRect();
        if (R?.width) dest = [R.left + R.width / 2, R.top + R.height / 2];
      };
      const end = L?.width || 32;
      const diag = Math.hypot(innerWidth, innerHeight);
      const lift = innerHeight * 0.05;
      const B = btn.getBoundingClientRect();
      const pill = [B.left + B.width / 2, B.top + B.height / 2];
      let drift = [0, 0];

      const seek = (t: number) => {
        sm.draw(t);
        // The glance eases back as he lands, so the swap to the logo doesn't jump.
        const g = ui(prog(t, I.glance));
        const ret = ui(prog(t, [I.fly.t[1] - 0.14, I.fly.t[1]]));
        sm.feat.style.translate = `${lerp(lerp(drift[0], -9, g), 0, ret)}px ${lerp(lerp(drift[1], -7, g), 0, ret)}px`;
        sm.feat.style.scale = "";
        const k = move(prog(t, I.fly.t));
        const p = arc(home, dest, k, lift);
        const s = lerp(SZ, end, k);
        const landed = t >= I.fly.t[1];
        Object.assign(sm.box.style, {
          width: `${s}px`,
          height: `${s}px`,
          translate: `${p[0] - s / 2}px ${p[1] - s / 2}px`,
          opacity: landed ? "0" : "1",
          color: `color-mix(in srgb, var(--tang) ${k * 100}%, var(--canvas))`,
        });
        if (logo) logo.style.opacity = landed ? "" : "0";
        // The hole follows the smiley, so it pulls the page open on its way.
        const r = move(prog(t, I.iris.t)) * diag * 1.05;
        const m = `radial-gradient(circle at ${p[0]}px ${p[1]}px, transparent ${r}px, #000 ${r + 0.5}px)`;
        sheet.style.maskImage = m;
        sheet.style.setProperty("-webkit-mask-image", m);
        sheet.style.opacity = t < I.iris.t[1] + 0.03 ? "1" : "0";
        // The pill leaves as the hole reaches it: it lives on the sheet.
        btn?.classList.toggle("out", r > Math.hypot(pill[0] - p[0], pill[1] - p[1]) - 40);
      };
      // While the gate waits, the eyes wander and blink once.
      const wander = (w: number) => {
        const in_ = clamp(w / 0.15);
        drift = [Math.sin(w * 4.2) * 7 * in_, (Math.sin(w * 2.9 + 1) - Math.sin(1)) * 3.5 * in_];
        sm.feat.style.translate = `${drift[0]}px ${drift[1]}px`;
        const bl = clamp((w - 0.5) / 0.12);
        sm.feat.style.scale = `1 ${1 - Math.sin(bl * Math.PI) * 0.85}`;
      };

      let ready = false;
      pageReady().then(() => {
        ready = true;
        measure();
      });
      const t0 = performance.now();
      let shift = 0;
      let waitFrom = -1;
      const frame = (now: number) => {
        if (done) return;
        try {
          let t = (now - t0) / 1000 - shift;
          // The ready gate: the face holds at gate.at until the page is
          // ready, gate.maxWait at most, then goes on regardless.
          if (!skip && !late && t >= I.gate.at && waitFrom !== -2) {
            if (waitFrom < 0) waitFrom = now;
            const w = (now - waitFrom) / 1000;
            const blinking = w > 0.5 && w < 0.62;
            if ((!ready || blinking) && w < I.gate.maxWait) {
              seek(I.gate.at);
              wander(w);
              raf = requestAnimationFrame(frame);
              return;
            }
            shift += t - I.gate.at;
            t = I.gate.at;
            waitFrom = -2;
          }
          if (skip) t = END;
          seek(Math.min(t, END));
          if (t < END) {
            raf = requestAnimationFrame(frame);
            return;
          }
        } catch (e) {
          console.warn("Intro: a frame failed, finishing.", e);
        }
        finish();
      };
      seek(0);
      raf = requestAnimationFrame(frame);
    } catch (e) {
      console.warn("Intro: setup failed, showing the page.", e);
      finish();
    }
  }));
}

/** The hero holds the intro while it's mounted. Leaving home mid-intro
 *  ends it; a remount (dev, or a cached route coming back) doesn't. */
let holders = 0;
export function holdIntro() {
  holders++;
  void playIntro();
  return () => {
    holders--;
    setTimeout(() => holders || stop(), 0);
  };
}

/** Runs fn once the intro has handed over (at once if there is none). */
export function afterIntro(fn: () => void): () => void {
  const root = document.documentElement;
  if (!root.dataset.boot) {
    fn();
    return () => {};
  }
  const mo = new MutationObserver(() => {
    if (root.dataset.boot) return;
    mo.disconnect();
    fn();
  });
  mo.observe(root, { attributes: true, attributeFilter: ["data-boot"] });
  return () => mo.disconnect();
}
