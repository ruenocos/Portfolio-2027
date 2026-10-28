"use client";

import { usePathname } from "next/navigation";
import { useBeat } from "@/components/canvas/useBeat";
import { live, pageBox, putPin, select, wait, wessel, type XY } from "@/lib/wessel";

// The footer moment: on every page but home (home has the bookend), Wessel
// does one small job on the email once its row is half in view. A different
// one per page, so it reads as hand-placed. He always parks beside the
// address, never on it, and does nothing while calm (Pause, reduced motion).
type Kind = "work" | "about" | "playground" | "case";

function kindOf(path: string): Kind | null {
  if (path === "/work") return "work";
  if (path.startsWith("/work/")) return "case";
  if (path === "/about") return "about";
  if (path === "/playground") return "playground";
  return null;
}

// His cursor + name tag, about this big to the right of and below his tip.
const CUR_W = 110;
const CUR_H = 44;

/** Where he parks: just right of the address, or under its start on a
 *  phone when the address fills the row. Null: no clear spot, so he skips. */
function spot(a: HTMLElement): (() => XY) | null {
  const cell = a.closest(".cell") ?? a;
  const r = a.getBoundingClientRect();
  const c = cell.getBoundingClientRect();
  if (c.right - r.right >= CUR_W + 20) return wessel.at(a, 1, 0.55, 14, 0);
  // Under it (a phone, where the address fills the row): his room runs to
  // the next words below, the labels of the stacked cells. The box already
  // has 12px of air under the text.
  const below = [...document.querySelectorAll("#contact h3, .legal")]
    .map((e) => e.getBoundingClientRect().top)
    .filter((t) => t > r.bottom);
  if (Math.min(innerHeight, ...below) - r.bottom >= CUR_H + 4)
    return () => {
      const b = a.getBoundingClientRect();
      return [b.left + 48, b.bottom + 2];
    };
  return null;
}

/** The address (and the room he needs beside it) is fully on screen. */
function clear(a: HTMLElement) {
  const r = a.getBoundingClientRect();
  const hdr = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--spacing-header")) || 90;
  return r.top > hdr + 8 && r.bottom + CUR_H + 8 < innerHeight;
}

function Moment({ kind, children }: { kind: Kind; children: React.ReactNode }) {
  const cell = useBeat<HTMLDivElement>({
    need: 0.5,
    async day(g) {
      const a = cell.current?.querySelector<HTMLElement>(".mail");
      if (!a) return;
      // Pages that keep him off the page on phones (Work, case) stay that way.
      const cur = document.querySelector<HTMLElement>(".cur.wes");
      if (!cur || getComputedStyle(cur).display === "none") return;
      // Let the scroll settle until the address is clear of both screen edges.
      for (let i = 0; i < 12 && !clear(a); i++) {
        await wait(100);
        live(g);
      }
      // Never on something you're using: hovering, focused or just copied.
      if (!clear(a) || a.matches(":hover, :focus-visible, [data-copied]")) return;
      const at = spot(a);
      if (!at) return;
      // Parking under it and coming from above: round the address by the
      // right edge, so he never sweeps across the text.
      const ay = at()[1];
      const [wx, wy] = wessel.pos();
      const r0 = a.getBoundingClientRect();
      if (ay > r0.bottom && wy < r0.bottom && wx > r0.left - 40) {
        await wessel.go([Math.max(innerWidth - 8, r0.right + 60), ay + 24], { k: 260, timeout: 500 });
        live(g);
      }
      await wessel.go(at, { k: 220, timeout: 900 });
      live(g);

      if (kind === "work") {
        // Click to select, then a breath with it held, as if about to ⌘C.
        wessel.press(true);
        const s = select(a, { label: false, ms: 0 });
        await wait(110);
        wessel.press(false);
        await wait(1300);
        s.done();
        live(g);
      } else if (kind === "playground") {
        // A double-tap: two quick press/release dips.
        await wait(160);
        for (let k = 0; k < 2; k++) {
          wessel.press(true);
          await wait(90);
          wessel.press(false);
          await wait(110);
        }
        live(g);
        await wait(500);
      } else if (kind === "case") {
        // He points at it and nods twice, the home's "this way" nod.
        const to = (dy: number) => (): XY => {
          const [x, y] = at();
          return [x, y + dy];
        };
        for (let k = 0; k < 2; k++) {
          await wessel.go(to(12), { k: 320, timeout: 260 });
          await wessel.go(to(0), { k: 320, timeout: 260 });
        }
        live(g);
        await wait(400);
      } else {
        // About: a comment pin by the address. Name and local time only; there's
        // no line written for it. Its corner sits on the address's top-right
        // (or over the label's row on a phone), never on the text.
        const r = pageBox(a);
        const label = cell.current?.querySelector<HTMLElement>("h3");
        const right = cell.current!.getBoundingClientRect().right - a.getBoundingClientRect().right >= CUR_W + 20;
        const pinAt: XY = right
          ? [r.x + r.w + 6, r.y + 10]
          : [Math.max(r.x + 96, label ? pageBox(label).x + pageBox(label).w + 16 : 0), r.y + 2];
        // One pin on screen at a time.
        document.querySelectorAll<HTMLElement>(".pin[data-live]").forEach((p) => (p.hidden = true));
        wessel.press(true);
        const { pin, bub } = putPin(pinAt);
        bub.remove();
        await wait(110);
        wessel.press(false);
        await wait(1700);
        live(g);
        pin.dataset.dot = "true";
        setTimeout(() => pin.remove(), 2600);
      }
    },
  });
  return (
    <div ref={cell} className="cell">
      {children}
    </div>
  );
}

/** The footer's email cell. Keyed by page, so each page view gets its one beat. */
export function FooterMoment({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const kind = kindOf(path);
  if (!kind) return <div className="cell">{children}</div>;
  return (
    <Moment key={path} kind={kind}>
      {children}
    </Moment>
  );
}
