"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useBeat } from "@/components/canvas/useBeat";
import { SectionLabel } from "@/components/parts/SectionLabel";
import { getMotion } from "@/lib/motion";
import { finePointer, headerHeight, narrow } from "@/lib/media";
import { isBusy, live, wait, wessel, type XY } from "@/lib/wessel";

// The footer's hello: the email across the full width, its letters leaning
// up and turning grape toward a pointer (yours, or Wessel's). Once per page
// view Wessel sweeps across it so you see the lean, the underline draws in,
// and he parks under the end of it. If your pointer gets to the address
// first he skips the sweep. Parked there he waves now and then; wave back
// or click him for a high five. Calm (Pause, reduced motion): no sweep, no
// lean, the underline is just there.

const REACH_MIN = 70;
// His cursor + name tag, about this big to the right of and below his tip.
const CUR_H = 44;

const header = headerHeight;
const wes = () => document.querySelector<HTMLElement>(".cur.wes");
const here = (spot: XY) => {
  const [x, y] = wessel.pos();
  return Math.hypot(x - spot[0], y - spot[1]) < 30;
};

function Hello({ email }: { email: string }) {
  const chs = useRef<HTMLSpanElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const five = useRef<HTMLButtonElement>(null);
  // Wessel's tip while he sweeps, for the lean.
  const ghost = useRef<(() => XY) | null>(null);
  const wake = useRef<() => void>(() => {});
  // Your pointer reached the address: he steps aside.
  const yours = useRef(false);
  const alive = useRef(true);
  const waves = useRef(0);
  const lastSpot = useRef<XY>([0, 0]);

  const on = () => link.current?.setAttribute("data-on", "");
  /** His parking spot: under the end of the address, clear of the letters. */
  const spot = (): XY => {
    // A page you left stays mounted but hidden: its refs let go before its
    // observers do, so the last spot stands in for that moment.
    const box = chs.current;
    if (!box) return lastSpot.current;
    const r = box.getBoundingClientRect();
    return (lastSpot.current = [r.right - Math.min(150, r.width * 0.2), r.bottom + (narrow() ? 22 : 26)]);
  };

  // The lean. Letter centres are measured once per layout; each frame only
  // reads the address's box. It runs while something is moving, then stops.
  useEffect(() => {
    const box = chs.current!;
    const letters = [...box.querySelectorAll<HTMLElement>(".ch")];
    const k = letters.map(() => 0);
    let mid: number[] = [];
    let h = 0;
    // Fit the address to the row. The face's optical size makes small
    // sizes wider, so no single ratio fits: measure and scale, twice.
    const a = box.parentElement!;
    const cell = a.parentElement!;
    let room = 0;
    const measure = (force = false) => {
      const cs = getComputedStyle(cell);
      const w = cell.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (w !== room || force) {
        room = w;
        for (let i = 0; i < 2; i++) {
          const fs = parseFloat(getComputedStyle(a).fontSize);
          a.style.fontSize = `${Math.min(170, Math.floor((fs * w * 99.8) / box.offsetWidth) / 100)}px`;
        }
      }
      mid = letters.map((c) => c.offsetLeft + c.offsetWidth / 2);
      h = box.offsetHeight;
    };
    const ro = new ResizeObserver(() => measure());
    ro.observe(cell);
    document.fonts?.ready.then(() => measure(true));

    let ptr: XY | null = null;
    let raf = 0;
    const pull = (p: XY, x: number, cy: number, reach: number) => {
      const dx = p[0] - x;
      const dy = Math.max(0, Math.abs(p[1] - cy) - h * 0.4);
      return Math.exp(-(dx * dx + dy * dy * 2) / (reach * reach));
    };
    const tick = () => {
      raf = 0;
      const calm = getMotion().calm;
      const r = box.getBoundingClientRect();
      const reach = Math.max(REACH_MIN, h * 1.1);
      const cy = r.top + h / 2;
      const g = ghost.current?.();
      let moving = !!g;
      letters.forEach((c, i) => {
        const x = r.left + mid[i];
        const aim = calm ? 0 : Math.max(ptr ? pull(ptr, x, cy, reach) : 0, g ? pull(g, x, cy, reach * 0.8) : 0);
        const was = k[i];
        k[i] += (aim - k[i]) * 0.18;
        if (Math.abs(aim - k[i]) > 0.002) moving = true;
        if (Math.abs(k[i] - was) > 0.0005 || (aim === 0 && was !== 0)) c.style.setProperty("--k", k[i] < 0.002 ? "0" : k[i].toFixed(3));
      });
      if (moving) raf = requestAnimationFrame(tick);
    };
    wake.current = () => (raf ||= requestAnimationFrame(tick));

    // Your pointer only matters while the band is on screen.
    const fine = finePointer();
    const move = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      if (e.clientX > r.left - 30 && e.clientX < r.right + 30 && e.clientY > r.top - 30 && e.clientY < r.bottom + 30)
        yours.current = true;
      if (!fine || e.pointerType !== "mouse") return;
      ptr = [e.clientX, e.clientY];
      wake.current();
    };
    const leave = () => {
      ptr = null;
      wake.current();
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        addEventListener("pointermove", move, { passive: true });
        document.addEventListener("pointerleave", leave);
      } else {
        removeEventListener("pointermove", move);
        document.removeEventListener("pointerleave", leave);
        leave();
      }
    });
    io.observe(box);
    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  // The underline shows anyway after 3s on screen with no beat running
  // (he's hidden on this page, or his beat was cut short).
  useEffect(() => {
    const a = link.current!;
    let t = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        clearInterval(t);
        if (!e.isIntersecting) return;
        let idle = 0;
        t = window.setInterval(() => {
          idle = isBusy() ? 0 : idle + 1;
          if (idle >= 6 || a.hasAttribute("data-on")) {
            clearInterval(t);
            on();
          }
        }, 500);
      },
      { threshold: 0.5 },
    );
    io.observe(a);
    return () => {
      clearInterval(t);
      io.disconnect();
    };
  }, []);

  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  // The high-five button rides on his parking spot. It only takes the
  // mouse while he's there; the keyboard can always call him over.
  useEffect(() => {
    const b = five.current!;
    const cell = b.parentElement!;
    let t = 0;
    const place = () => {
      if (!chs.current) return;
      const c = cell.getBoundingClientRect();
      const [x, y] = spot();
      b.style.left = `${x - c.left}px`;
      b.style.top = `${y - c.top}px`;
    };
    // Ring bursts where the hands meet, in the cell's own coordinates.
    const ring = ([x, y]: XY, c: string) => {
      const r = cell.getBoundingClientRect();
      const i = document.createElement("i");
      i.className = "ring";
      i.style.left = `${x - r.left + 4}px`;
      i.style.top = `${y - r.top + 4}px`;
      i.style.setProperty("--c", c);
      cell.append(i);
      setTimeout(() => i.remove(), 700);
    };
    const wave = () => {
      const w = wes();
      if (!w) return;
      w.removeAttribute("data-wave");
      void w.offsetWidth;
      w.setAttribute("data-wave", "");
    };
    let busy = false;
    const go = async (from: XY | null) => {
      const w = wes();
      if (busy || isBusy() || !w || getComputedStyle(w).display === "none") return;
      busy = true;
      const calm = getMotion().calm;
      wessel.show();
      if (!here(spot())) await wessel.go(spot, { k: 220, timeout: 900 });
      const [hx, hy] = spot();
      // He leans in toward your hand, the two meet halfway, then he springs back.
      const meet: XY = from ? [(hx + from[0]) / 2, (hy + from[1]) / 2] : [hx - 18, hy - 14];
      await wessel.go(meet, { k: 520, timeout: 320 });
      wessel.press(true);
      if (!calm) {
        ring(meet, "var(--tang)");
        setTimeout(() => ring(meet, "var(--grape)"), 90);
      }
      await wait(90);
      wessel.press(false);
      await wait(calm ? 0 : 260);
      await wessel.go(spot, { k: 300, timeout: 700 });
      if (alive.current) wessel.free();
      waves.current = 0;
      busy = false;
    };

    const click = (e: MouseEvent) => go(e.detail ? [e.clientX, e.clientY] : null);
    b.addEventListener("click", click);

    // Waving at him: four quick turns left and right close to his cursor.
    let turns: number[] = [];
    let lastX: number | null = null;
    let dir = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const at = here(spot());
      b.toggleAttribute("data-here", at);
      if (!at || busy) return;
      const [hx, hy] = wessel.pos();
      if (Math.hypot(e.clientX - hx, e.clientY - hy) > 140) {
        turns = [];
        lastX = null;
        return;
      }
      if (lastX !== null) {
        const d = Math.sign(e.clientX - lastX);
        if (d && d !== dir) {
          dir = d;
          turns.push(performance.now());
        }
      }
      lastX = e.clientX;
      turns = turns.filter((s) => performance.now() - s < 700);
      if (turns.length >= 4) {
        turns = [];
        go([e.clientX, e.clientY]);
      }
    };

    const io = new IntersectionObserver(([e]) => {
      clearInterval(t);
      if (!e.isIntersecting) return removeEventListener("pointermove", move);
      // No Wessel on this page (Work and the case on phones): no button either.
      const w = wes();
      b.hidden = !w || getComputedStyle(w).display === "none";
      place();
      addEventListener("pointermove", move, { passive: true });
      // A few waves per visit, only while he's parked there with nothing to do.
      t = window.setInterval(() => {
        if (getMotion().calm || busy || isBusy() || waves.current >= 3 || !here(spot())) return;
        waves.current++;
        wave();
      }, 5000);
    });
    io.observe(cell);
    const ro = new ResizeObserver(place);
    ro.observe(cell);
    return () => {
      clearInterval(t);
      io.disconnect();
      ro.disconnect();
      b.removeEventListener("click", click);
      removeEventListener("pointermove", move);
    };
  }, []);

  const cell = useBeat<HTMLDivElement>({
    need: 0.6,
    look: () => link.current,
    async day(g) {
      const box = chs.current;
      const w = wes();
      // Pages that keep him off the page on phones (Work, case) stay that way.
      if (!box || !w || getComputedStyle(w).display === "none") return on();
      // Let the scroll settle until the address and his spot under it are clear.
      const clear = () => {
        const r = box.getBoundingClientRect();
        return r.top > header() + 8 && r.bottom + 26 + CUR_H < innerHeight;
      };
      for (let i = 0; i < 12 && !clear(); i++) {
        await wait(100);
        live(g);
      }
      // One mover at a time: stickers still landing above (About) go first.
      for (let i = 0; i < 12 && document.querySelector("main [data-landing]"); i++) {
        await wait(100);
        live(g);
      }
      if (!yours.current && clear()) {
        const ends = () => {
          const r = box.getBoundingClientRect();
          return { x0: r.left - 24, x1: r.right + 8, y: r.top + r.height * 0.55 };
        };
        await wessel.go(() => [ends().x0, ends().y], { k: 220, timeout: 900 });
        live(g);
        if (!yours.current) {
          const { x0, x1 } = ends();
          const dur = Math.min(2200, 900 + (x1 - x0) * 1.1);
          let e = 0;
          let wob = 0;
          const target = (): XY => {
            const p = ends();
            return [p.x0 + (p.x1 - p.x0) * e, p.y + wob];
          };
          wessel.go(target, { k: 1400, timeout: dur + 400 });
          ghost.current = wessel.pos;
          wake.current();
          const t0 = performance.now();
          await new Promise<void>((done) => {
            const step = (n: number) => {
              const t = Math.min(1, (n - t0) / dur);
              if (yours.current || !alive.current) return done();
              e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
              wob = Math.sin(t * Math.PI * 3) * 4;
              if (t < 1) requestAnimationFrame(step);
              else done();
            };
            requestAnimationFrame(step);
          });
          ghost.current = null;
          wake.current();
          live(g);
        }
      }
      on();
      await wessel.go(spot, { k: 220, timeout: 900 });
      live(g);
    },
    still: on,
  });

  return (
    <div ref={cell} className="cell hello bg-dots">
      <SectionLabel name="Contact" id="h-contact" />
      <a ref={link} id="mail" className="big" href={`mailto:${email}`} style={{ "--n": email.length } as React.CSSProperties}>
        <span className="sr-only">{email}</span>
        <span ref={chs} className="chs" aria-hidden="true">
          {[...email].map((c, i) => (
            <span key={i} className="ch">
              {c}
            </span>
          ))}
        </span>
      </a>
      <button ref={five} type="button" className="five" aria-label="High five Wessel" />
    </div>
  );
}

/** Keyed by page, so each page view gets its one sweep. */
export function FooterHello({ email }: { email: string }) {
  return <Hello key={usePathname()} email={email} />;
}
