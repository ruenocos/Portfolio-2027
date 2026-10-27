"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { Play } from "@/components/parts/Arrow";
import { MockTag } from "@/components/parts/Pills";
import { useMotion } from "@/components/useMotion";
import { useBeat } from "@/components/canvas/useBeat";
import type { HomeContent } from "@/content/home";
import { BOOT_KEY, getMotion } from "@/lib/motion";
import { Bot, isAsleep, isBusy, live, pageBox, put, putPin, select, wait, wessel, type XY } from "@/lib/wessel";

const calm = () => getMotion().calm;
const mobile = () => innerWidth < 900;
const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
const zone = () =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", timeZoneName: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value ?? "";

/** A point on an element, in page coordinates (for marks on #ovl). */
const pp = (el: Element, fx = 0, fy = 0, dx = 0, dy = 0): XY => {
  const r = pageBox(el);
  return [r.x + r.w * fx + dx, r.y + r.h * fy + dy];
};

// The first visit's wireframe boot (DESIGN.md §8): named empty frames draw
// in, fill like a wireframe, then the real hero springs in. ~1.2s, any
// input skips it. Shared, so the hello beat can wait for it.
let booting: Promise<void> | null = null;
function boot(hero: HTMLElement, parts: [Element | null, string][]) {
  return (booting ||= (async () => {
    const root = document.documentElement;
    if (!root.dataset.boot) return;
    try {
      sessionStorage.setItem(BOOT_KEY, "1");
    } catch {}
    let skip = false;
    const stop = () => (skip = true);
    const evs = ["wheel", "keydown", "pointerdown", "touchstart"] as const;
    evs.forEach((e) => addEventListener(e, stop, { once: true, passive: true }));
    const hold = (ms: number) =>
      new Promise<void>((r) => {
        const t0 = performance.now();
        const k = setInterval(() => {
          if (skip || performance.now() - t0 >= ms) {
            clearInterval(k);
            r();
          }
        }, 30);
      });
    const hr = hero.getBoundingClientRect();
    const frames = parts.flatMap(([el, name], i) => {
      if (!el) return [];
      const r = el.getBoundingClientRect();
      const d = document.createElement("div");
      d.className = "frm";
      d.style.cssText = `--i:${i};left:${r.left - hr.left - 4}px;top:${r.top - hr.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px`;
      d.innerHTML = `<span class="text-micro-caps">${name}</span>`;
      hero.appendChild(d);
      return [d];
    });
    await hold(480);
    frames.forEach((d) => d.classList.add("f"));
    await hold(420);
    delete root.dataset.boot;
    frames.forEach((d) => d.classList.add("out"));
    await wait(640);
    frames.forEach((d) => d.remove());
    evs.forEach((e) => removeEventListener(e, stop));
  })());
}

/** The letters Wessel plays with: the W, the u of Oud, and both words. */
function letters(n: HTMLElement) {
  const words = n.querySelectorAll(".w");
  return { W: words[0].querySelector<HTMLElement>(".lt")!, U: words[1].querySelectorAll<HTMLElement>(".lt")[1], words };
}
// Before he arrives (day, not calm): the W is only an outline and the u of Oud sits crooked.
function prepName(n: HTMLElement) {
  if (calm() || isAsleep()) return;
  const { W, U } = letters(n);
  W.classList.add("ol");
  U.classList.add("off");
}
function unprepName(n: HTMLElement) {
  const { W, U } = letters(n);
  W.classList.remove("ol", "plop");
  U.classList.remove("off", "snap");
  U.style.transform = "";
}

// Wessel's "this way down" nod: two quick dips at the bottom of the hero.
const nodSpot = (): [number, number, number] => (mobile() ? [0.14, 0.7, 0] : [0.32, 1, -44]);
async function nodDown(hero: HTMLElement) {
  const [fx, fy, dy] = nodSpot();
  for (let k = 0; k < 2; k++) {
    await wessel.go(wessel.at(hero, fx, fy, 0, dy + 22), { k: 320, timeout: 260 });
    await wessel.go(wessel.at(hero, fx, fy, 0, dy), { k: 320, timeout: 260 });
  }
}

/** Splits a word into letters Wessel can grab; group = [from, to) kept together. */
function Letters({ word, group }: { word: string; group?: [number, number] }) {
  const ch = [...word];
  const lt = (c: string, i: number) => (
    <span key={i} className="lt">
      {c}
    </span>
  );
  if (!group) return <>{ch.map(lt)}</>;
  return (
    <>
      {ch.slice(0, group[0]).map(lt)}
      <span className="grp">{ch.slice(group[0], group[1]).map((c, i) => lt(c, i + group[0]))}</span>
      {ch.slice(group[1]).map((c, i) => lt(c, i + group[1]))}
    </>
  );
}

/**
 * Hero (DESIGN.md §6, §7): mono meta, the name row WESSEL [reel] OUD on
 * glyph height, the role in Wessel's voice. By day his hello intro plays
 * once per mode; by night Rename layers names every letter.
 */
export function Hero({ hero: c }: { hero: HomeContent["hero"] }) {
  const { calm: still } = useMotion();
  const nm = useRef<HTMLDivElement>(null);
  const reel = useRef<HTMLAnchorElement>(null);
  const loop = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLElement>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const full = useRef<HTMLVideoElement>(null);
  const meta = useRef<HTMLParagraphElement>(null);
  const role = useRef<HTMLParagraphElement>(null);
  const time = useRef<HTMLTimeElement>(null);
  const reelOn = useRef(false);
  const nudge = useRef({ on: false, nods: 0, still: 0, nodding: false });


  // Local time, live, after hydration (so the server never renders a stale one).
  useEffect(() => {
    const tick = () => {
      if (time.current) time.current.textContent = `${clock.format(new Date())} ${zone()}`;
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  // The name fills the row: Display 192 is the base, fitted to the width.
  useLayoutEffect(() => {
    const n = nm.current;
    if (!n) return;
    const fit = () => {
      n.style.fontSize = "";
      const parts = [...n.children].reduce((a, ch) => a + (ch as HTMLElement).offsetWidth, 0);
      const w = n.clientWidth;
      const base = parseFloat(getComputedStyle(n).fontSize);
      if (mobile()) {
        if (parts + base * 0.12 > w) n.style.fontSize = `${Math.floor((base * w) / (parts + base * 0.12))}px`;
      } else n.style.fontSize = `${Math.min(Math.floor((base * w) / (parts + base * 0.3)), 240)}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    let t = 0;
    const rz = () => {
      clearTimeout(t);
      t = window.setTimeout(fit, 150);
    };
    addEventListener("resize", rz);
    return () => {
      removeEventListener("resize", rz);
      clearTimeout(t);
    };
  }, []);

  // The reel's loop plays once Wessel has invited you to it (or at once at
  // night), only on screen, never while calm. A grape bar tracks its time.
  const syncReel = useRef(() => {});
  useEffect(() => {
    const v = loop.current;
    const r = reel.current;
    if (!v || !r) return;
    let visible = false;
    let raf = 0;
    const draw = () => {
      if (v.duration && bar.current) bar.current.style.transform = `scaleX(${(v.currentTime / v.duration).toFixed(4)})`;
      raf = visible && !v.paused ? requestAnimationFrame(draw) : 0;
    };
    syncReel.current = () => {
      if (visible && reelOn.current && !still && !dlg.current?.open) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        v.play().then(() => (raf ||= requestAnimationFrame(draw)), () => {});
      } else v.pause();
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      syncReel.current();
    });
    io.observe(r);
    const on = () => (v.dataset.on = "true");
    v.addEventListener("playing", on);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      v.removeEventListener("playing", on);
      v.pause();
    };
  }, [still]);
  const playReel = () => {
    reelOn.current = true;
    reel.current?.setAttribute("data-on", "");
    syncReel.current();
  };

  // Magnetism: the reel leans toward your pointer as it comes near.
  useEffect(() => {
    const r = reel.current;
    if (!r) return;
    r.style.transform = "";
    if (still || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const m = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    const draw = () => {
      m.x += (m.tx - m.x) * 0.12;
      m.y += (m.ty - m.y) * 0.12;
      r.style.transform = `translate(${m.x.toFixed(2)}px,${m.y.toFixed(2)}px)`;
      raf = Math.abs(m.tx - m.x) + Math.abs(m.ty - m.y) > 0.05 ? requestAnimationFrame(draw) : 0;
    };
    const move = (e: PointerEvent) => {
      const b = r.getBoundingClientRect();
      const dx = e.clientX - (b.left + b.width / 2 - m.x);
      const dy = e.clientY - (b.top + b.height / 2 - m.y);
      const reach = Math.max(b.width, b.height) * 0.5 + 140;
      const d = Math.hypot(dx, dy);
      if (d < reach) {
        const f = 0.28 * (1 - Math.max(0, d - b.width * 0.4) / reach);
        m.tx = dx * f;
        m.ty = dy * f;
      } else m.tx = m.ty = 0;
      raf ||= requestAnimationFrame(draw);
    };
    addEventListener("pointermove", move, { passive: true });
    return () => {
      removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
      r.style.transform = "";
    };
  }, [still]);

  // Touch: a tap within 12px of the small reel opens it (the reel keeps its
  // size, so Wessel's selection still measures the real thing).
  useEffect(() => {
    const n = nm.current;
    const r = reel.current;
    if (!n || !r || !matchMedia("(hover: none)").matches) return;
    const tap = (e: MouseEvent) => {
      if ((e.target as Element).closest(".reel")) return;
      const b = r.getBoundingClientRect();
      const s = 12;
      if (e.clientX > b.left - s && e.clientX < b.right + s && e.clientY > b.top - s && e.clientY < b.bottom + s) r.click();
    };
    n.addEventListener("click", tap);
    return () => n.removeEventListener("click", tap);
  }, []);

  const openReel = (e: React.MouseEvent) => {
    e.preventDefault();
    const d = dlg.current;
    const v = full.current;
    if (!d || !v) return;
    d.showModal();
    loop.current?.pause();
    v.currentTime = 0;
    v.play().catch(() => {});
  };
  const closedReel = () => {
    full.current?.pause();
    syncReel.current();
    reel.current?.focus({ preventScroll: true });
  };

  const prep = () => nm.current && prepName(nm.current);
  const unprep = () => nm.current && unprepName(nm.current);
  useLayoutEffect(() => {
    if (nm.current) prepName(nm.current);
  }, []);

  const bootParts = (): [Element | null, string][] => {
    const n = nm.current;
    return [
      [meta.current, "Meta"],
      [n?.children[0] ?? null, "Name"],
      [reel.current, "Reel"],
      [n?.children[2] ?? null, "Name"],
      [role.current, "Role"],
    ];
  };

  const hero = useBeat<HTMLDivElement>({
    async day(g) {
      const h = hero.current!;
      await boot(h, bootParts());
      live(g);
      // It skips once the hero is scrolled 45% away, or on any key or click.
      let skip = false;
      let su: ReturnType<typeof select> | null = null;
      const away = () => {
        if (scrollY > h.offsetHeight * 0.45) skip = true;
      };
      const input = () => (skip = true);
      addEventListener("scroll", away, { passive: true });
      addEventListener("keydown", input);
      addEventListener("pointerdown", input);
      const chk = () => {
        live(g);
        if (skip) throw new Error("skip");
      };
      const breath = async (ms: number) => {
        await wait(ms);
        chk();
      };
      const r = reel.current!;
      const { W, U, words } = letters(nm.current!);
      let pin: ReturnType<typeof putPin> | null = null;
      // Each line is a fresh pin that pops in, then types.
      const say = async (txt: string, at: XY) => {
        if (pin) {
          const old = pin.pin;
          old.classList.add("bye");
          setTimeout(() => old.remove(), 260);
        }
        pin = putPin(at);
        await breath(260);
        for (const ch of txt) {
          pin.bub.textContent += ch;
          await wait(85);
          chk();
        }
      };
      // The reel plays from the start; he invites you to it later.
      playReel();
      try {
        if (calm()) throw new Error("skip");
        await breath(450);
        // He glides in next to the outlined W and says hello.
        await wessel.go(wessel.at(W, 0.96, 0.04), { k: 120, timeout: 1400 });
        chk();
        await breath(200);
        await say("Hello!", pp(W, 0.96, 0.04, 8, -46));
        await breath(700);
        // Over to the middle of the W, one click: the fill plops in.
        await wessel.go(wessel.at(W, 0.5, 0.55), { k: 150, timeout: 1200 });
        chk();
        await breath(320);
        wessel.press(true);
        await breath(160);
        W.classList.remove("ol");
        W.classList.add("plop");
        const b = pageBox(W);
        const ring = put("hi-ring", "", [b.x + b.w / 2, b.y + b.h / 2]);
        setTimeout(() => ring.remove(), 900);
        wessel.press(false);
        await breath(700);
        W.classList.remove("plop");
        await breath(200);
        // The crooked u: select it, drag it straight, it snaps on a guide.
        await wessel.go(wessel.at(U, 0.5, 0.5), { k: 140, timeout: 1300 });
        chk();
        su = select(U, { label: false, ms: 0 });
        await breath(420);
        wessel.press(true);
        await breath(120);
        let fixed = false;
        await wessel.drag(wessel.at(U, 0.5, 0.5), wessel.at(U, 0.5, 0.5), 820, (e) => {
          if (fixed) return;
          const k = 1 - e;
          U.style.transform = `translate(${(0.05 * k).toFixed(3)}em,${(0.11 * k).toFixed(3)}em) rotate(${(-7 * k).toFixed(2)}deg)`;
        });
        fixed = true;
        U.classList.remove("off");
        U.style.transform = "";
        U.classList.add("snap");
        chk();
        const o = pageBox(words[1]);
        const guide = put("hi-guide", "", [o.x - 32, o.y + o.h * 0.86, o.w + 64, 1]);
        setTimeout(() => guide.remove(), 1100);
        wessel.press(false);
        await breath(600);
        U.classList.remove("snap");
        su.done();
        su = null;
        await breath(250);
        // The reel: he drags a selection open, the size pops, and he invites you in.
        await wessel.go(wessel.at(r, 0, 0, -2, -2), { k: 140, timeout: 1300 });
        chk();
        await breath(200);
        wessel.press(true);
        const s = select(r, { label: false, ms: 0, grow: 0.02 });
        await wessel.drag(wessel.at(r, 0, 0, -2, -2), wessel.at(r, 1, 1), 640, (e) => (s.grow = Math.max(0.02, e)));
        live(g);
        s.grow = 1;
        s.size();
        wessel.press(false);
        playReel();
        r.dataset.invite = "";
        try {
          await wait(300);
          await say("Have a look", pp(r, 1, 0, 12, -44));
          await wait(1800);
        } finally {
          s.done();
          delete r.dataset.invite;
        }
        // Then he points you down himself and nods twice.
        const [fx, fy, dy] = nodSpot();
        await wessel.go(wessel.at(h, fx, fy, 0, dy), { k: 150, timeout: 1200 });
        chk();
        await say("More below", pp(h, fx, fy, 16, dy - 68));
        await nodDown(h);
        nudge.current.on = true;
        await wait(1200);
      } catch (e) {
        live(g);
        if (!(e instanceof Error) || e.message !== "skip") throw e;
        unprep();
        playReel();
      } finally {
        su?.done();
        removeEventListener("scroll", away);
        removeEventListener("keydown", input);
        removeEventListener("pointerdown", input);
        // The pin shrinks to a dot.
        const p = (pin as ReturnType<typeof putPin> | null)?.pin;
        if (p) {
          p.dataset.dot = "true";
          setTimeout(() => p.remove(), 2600);
        }
      }
    },
    async night(g) {
      const h = hero.current!;
      await boot(h, bootParts());
      live(g);
      unprep();
      // A bot names every letter as a layer, then leaves.
      const B = new Bot("Rename layers");
      const ls = [...nm.current!.querySelectorAll<HTMLElement>(".lt")];
      const labels: HTMLElement[] = [];
      for (const [i, l] of ls.entries()) {
        const [x, y] = pp(l, 0.5, 0, 0, -8);
        if (i === 0 || i === ls.length - 1 || i === 6) await B.to(x, y - 10);
        live(g);
        const t = put("lt-lab text-micro", l.textContent ?? "", [x, y]);
        t.style.animationDelay = `${i * 60}ms`;
        labels.push(t);
      }
      playReel();
      await wait(1400);
      live(g);
      for (const t of labels) {
        t.style.transition = "opacity .3s";
        t.style.opacity = "0";
        setTimeout(() => t.remove(), 320);
      }
      await B.leave();
    },
    // Calm: the finished hero, reel on its poster.
    still() {
      unprep();
      playReel();
    },
    reset() {
      reelOn.current = false;
      reel.current?.removeAttribute("data-on");
      loop.current?.pause();
      nudge.current.on = false;
      unprep();
      prep();
    },
  });

  // Night, or calm, or a reload halfway down: the hero is simply finished.
  useEffect(() => {
    if (still && nm.current) {
      unprepName(nm.current);
      reelOn.current = true;
    }
  }, [still]);

  // The idle nod: if you sit still on the hero after the intro, he repeats
  // it after 7s, 12s and 17s, three times at most.
  useEffect(() => {
    const n = nudge.current;
    n.still = performance.now();
    const moved = () => (n.still = performance.now());
    const evs = ["pointermove", "pointerdown", "wheel", "keydown", "touchstart", "scroll"] as const;
    evs.forEach((e) => addEventListener(e, moved, { passive: true }));
    const id = setInterval(async () => {
      const h = hero.current;
      if (!h || !n.on || n.nodding || isBusy() || calm() || isAsleep() || document.hidden || n.nods >= 3) return;
      if (performance.now() - n.still < 7000 + n.nods * 5000 || scrollY > h.offsetHeight * 0.3) return;
      n.nodding = true;
      n.nods++;
      const [fx, fy, dy] = nodSpot();
      await wessel.go(wessel.at(h, fx, fy, 0, dy), { k: 170, timeout: 1100 });
      await nodDown(h);
      wessel.free();
      n.still = performance.now();
      n.nodding = false;
    }, 500);
    return () => {
      clearInterval(id);
      evs.forEach((e) => removeEventListener(e, moved));
    };
  }, [hero]);

  return (
    <section className="frame" data-row data-still aria-labelledby="h-name">
      <div className="side" />
      <div ref={hero} className="cell hero bg-dots" data-hero>
      <p ref={meta} className="hmeta text-label">
        <span>Based in</span>
        <b>{c.basedIn}</b>
        <span>Local time</span>
        <b>
          <time ref={time} suppressHydrationWarning>
            --:--
          </time>
        </b>
      </p>
      <h1 id="h-name" className="sr-only">
        {`Wessel Oud, ${c.role.join(" ").replace(/^./, (m) => m.toLowerCase())}`}
      </h1>
      <div ref={nm} className="name text-display">
        <span className="w" aria-hidden="true">
          <Letters word="Wessel" group={[2, 6]} />
        </span>
        <a
          ref={reel}
          className="reel"
          href="#reel"
          aria-label="Play the reel"
          onClick={openReel}
          data-mock={c.reel.mock ? "" : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a poster frame, served as it is */}
          {c.reel.poster && <img src={c.reel.poster} alt="" />}
          {c.reel.loop && <video ref={loop} data-src={c.reel.loop} muted loop playsInline preload="none" aria-hidden="true" />}
          <i ref={bar} className="ph" />
          <span className="gpill text-micro-caps play" data-size="small">
            <Play /> <span className="pt">Reel</span>
          </span>
        </a>
        <span className="w" aria-hidden="true">
          <Letters word="Oud" />
        </span>
      </div>
      <p ref={role} className="role text-accent" aria-hidden="true">
        {c.role[0]}
        <br />
        {c.role[1]}
      </p>
      <dialog ref={dlg} className="reelbox" aria-label="Reel" onClose={closedReel} onClick={(e) => e.target === e.currentTarget && dlg.current?.close()}>
        {c.reel.full && <video ref={full} controls playsInline loop preload="none" poster={c.reel.poster} src={c.reel.full} />}
        <div className="db">
          <span className="text-label">Reel {c.reel.mock && <MockTag>placeholder</MockTag>}</span>
          <button type="button" className="text-link" onClick={() => dlg.current?.close()}>
            Close
          </button>
        </div>
      </dialog>
      </div>
      <div className="side" />
    </section>
  );
}
