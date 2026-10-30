import { playIntro } from "@/lib/intro/iris";
import { getMotion, helloSeen, markHelloSeen } from "@/lib/motion";
import { live, pageBox, put, putPin, select, wait, wessel, type XY } from "@/lib/wessel";
import { narrow } from "@/lib/media";
import { nameLetters, unprepName } from "./name";
import { goToNodSpot, nodDown, nodSpot, type IdleNod } from "./nod";

// Someone who first came on an earlier day gets "Welcome back!".
// The day is stored each visit; same day reads as one visit.
const SEEN_KEY = "wsl-seen";
const returning = () => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const last = localStorage.getItem(SEEN_KEY);
    localStorage.setItem(SEEN_KEY, today);
    return !!last && last !== today;
  } catch {
    return false;
  }
};

/** A point on an element, in page coordinates (for marks on #ovl). */
const pagePoint = (el: Element, fx = 0, fy = 0, dx = 0, dy = 0): XY => {
  const box = pageBox(el);
  return [box.x + box.w * fx + dx, box.y + box.h * fy + dy];
};

class Skip extends Error {
  constructor() {
    super("skip");
  }
}

type Hello = {
  /** The beat's generation: live(gate) throws once the beat is cancelled. */
  gate: number;
  hero: HTMLElement;
  name: HTMLElement;
  reel: HTMLElement;
  playLoop: () => void;
  idle: IdleNod;
};

/**
 * Wessel's hello on the hero, after the first-visit intro hands over: he
 * says hi by the W and fills it, straightens the crooked u, selects the
 * reel and invites you in, then nods you down the page. It skips once the
 * hero is scrolled 45% away, or on any key or click. Once per session:
 * back on home later he just nods you down (shortHello).
 */
export async function playHello(hello: Hello) {
  const { gate, hero, name, reel, playLoop, idle } = hello;
  if (helloSeen()) return shortHello(hello);
  // After the intro he glides in from the edge instead of appearing mid-hero.
  const afterIntro = !!document.documentElement.dataset.boot;
  await playIntro();
  if (afterIntro && hero.isConnected) wessel.offstage();
  live(gate);

  let skip = false;
  let letterSelection: ReturnType<typeof select> | null = null;
  const scrolledAway = () => {
    if (scrollY > hero.offsetHeight * 0.45) skip = true;
  };
  const input = () => (skip = true);
  addEventListener("scroll", scrolledAway, { passive: true });
  addEventListener("keydown", input);
  addEventListener("pointerdown", input);
  const check = () => {
    live(gate);
    if (skip) throw new Skip();
  };
  const breath = async (ms: number) => {
    await wait(ms);
    check();
  };

  const { letterW, letterU, words } = nameLetters(name);
  let pin: ReturnType<typeof putPin> | null = null;
  // Each line is a fresh pin that pops in, then types.
  const say = async (text: string, at: XY) => {
    if (pin) {
      const old = pin.pin;
      old.classList.add("bye");
      setTimeout(() => old.remove(), 260);
    }
    pin = putPin(at);
    await breath(260);
    for (const char of text) {
      pin.bub.textContent += char;
      await wait(85);
      check();
    }
  };

  // The reel holds its poster while he works on the name (one mover at a
  // time); its loop starts when he invites you to it, or on a skip.
  try {
    if (getMotion().calm) throw new Skip();
    await breath(450);
    // He glides in next to the outlined W and says hello.
    // Phones: the name fills the width, so he says it from the empty corner
    // above it, right of the based-in lines: his tag in the band over the
    // letters, the pin above him, clear of the name and the reel.
    const small = narrow();
    await wessel.go(small ? wessel.at(name, 0.68, 0, 0, -46) : wessel.at(letterW, 0.96, 0.04), { k: 120, timeout: 1400 });
    check();
    await breath(200);
    await say(
      returning() ? "Welcome back!" : "Hello!",
      small ? pagePoint(name, 0.64, 0, 0, -50) : pagePoint(letterW, 0.96, 0.04, 10, -6),
    );
    await breath(700);

    // Over to the middle of the W, one click: the fill plops in.
    await wessel.go(wessel.at(letterW, 0.5, 0.55), { k: 150, timeout: 1200 });
    check();
    await breath(320);
    wessel.press(true);
    await breath(160);
    letterW.classList.remove("ol");
    letterW.classList.add("plop");
    const wBox = pageBox(letterW);
    const ring = put("hi-ring", "", [wBox.x + wBox.w / 2, wBox.y + wBox.h / 2]);
    setTimeout(() => ring.remove(), 900);
    wessel.press(false);
    await breath(700);
    letterW.classList.remove("plop");
    await breath(200);

    // The crooked u: select it, drag it straight, it snaps on a guide.
    await wessel.go(wessel.at(letterU, 0.5, 0.5), { k: 140, timeout: 1300 });
    check();
    letterSelection = select(letterU, { label: false, ms: 0 });
    await breath(420);
    wessel.press(true);
    await breath(120);
    let straight = false;
    await wessel.drag(wessel.at(letterU, 0.5, 0.5), wessel.at(letterU, 0.5, 0.5), 820, (e) => {
      if (straight) return;
      const k = 1 - e;
      letterU.style.transform = `translate(${(0.05 * k).toFixed(3)}em,${(0.11 * k).toFixed(3)}em) rotate(${(-7 * k).toFixed(2)}deg)`;
    });
    straight = true;
    letterU.classList.remove("off");
    letterU.style.transform = "";
    letterU.classList.add("snap");
    check();
    const oud = pageBox(words[1]);
    const guide = put("hi-guide", "", [oud.x - 32, oud.y + oud.h * 0.86, oud.w + 64, 1]);
    setTimeout(() => guide.remove(), 1100);
    wessel.press(false);
    await breath(600);
    letterU.classList.remove("snap");
    letterSelection.done();
    letterSelection = null;
    await breath(250);

    // The reel: he drags a selection open, the size pops, and he invites you in.
    await wessel.go(wessel.at(reel, 0, 0, -2, -2), { k: 140, timeout: 1300 });
    check();
    await breath(200);
    wessel.press(true);
    const reelSelection = select(reel, { label: false, ms: 0, grow: 0.02 });
    // Phones: he lets go just inside the corner so his tag stays off the role.
    const inset = narrow() ? -16 : 0;
    await wessel.drag(wessel.at(reel, 0, 0, -2, -2), wessel.at(reel, 1, 1, inset, inset), 640, (e) => {
      reelSelection.grow = Math.max(0.02, e);
    });
    live(gate);
    reelSelection.grow = 1;
    // Phones: the reel already holds his tag, the pin and the Reel chip; no size label.
    if (!narrow()) reelSelection.size();
    wessel.press(false);
    playLoop();
    reel.dataset.invite = "";
    try {
      await wait(300);
      // Phones: the reel is full width, so the pin sits inside it, under its
      // caption, clear of the name, the size label and the role.
      await say("Have a look", narrow() ? pagePoint(reel, 0, 0, 12, 84) : pagePoint(reel, 1, 0, 12, -4));
      await wait(1800);
    } finally {
      reelSelection.done();
      delete reel.dataset.invite;
    }

    // Then he points you down himself and nods twice.
    await goToNodSpot(hero);
    check();
    const [fx, fy, dy] = nodSpot(hero);
    // Phones: he parks right of centre, so the pin opens to his left to stay on screen.
    await say("More below", narrow() ? pagePoint(hero, fx, fy, -168, dy + 20) : pagePoint(hero, fx, fy, 16, dy - 24));
    await nodDown(hero);
    idleFromNow(idle);
    await wait(1200);
  } catch (e) {
    live(gate);
    if (!(e instanceof Skip)) throw e;
    unprepName(name);
    playLoop();
    // Off the name: he waits where he'd have pointed you down. Awaited, so
    // he has his aim there before the beat lets him go (else he parks on the W).
    await goToNodSpot(hero);
  } finally {
    markHelloSeen();
    letterSelection?.done();
    removeEventListener("scroll", scrolledAway);
    removeEventListener("keydown", input);
    removeEventListener("pointerdown", input);
    // The pin shrinks to a dot.
    const last = (pin as ReturnType<typeof putPin> | null)?.pin;
    if (last) {
      last.dataset.dot = "true";
      setTimeout(() => last.remove(), 2600);
    }
  }
}

// The idle nod counts its quiet from his last nod, not from page load.
function idleFromNow(idle: IdleNod) {
  idle.stillSince = performance.now();
  idle.on = true;
}

/** Back on home in the same session: the name is already finished, so he
 *  goes straight to the nod spot and dips once. */
async function shortHello({ gate, hero, name, playLoop, idle }: Hello) {
  unprepName(name);
  playLoop();
  if (getMotion().calm) return;
  await goToNodSpot(hero);
  live(gate);
  await nodDown(hero, 1);
  idleFromNow(idle);
}
