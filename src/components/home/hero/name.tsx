import { useLayoutEffect, type RefObject } from "react";
import { getMotion } from "@/lib/motion";
import { narrow } from "@/lib/media";

/** The letters Wessel plays with: the W, the u of Oud, and both words. */
export function nameLetters(name: HTMLElement) {
  const words = name.querySelectorAll(".w");
  return {
    letterW: words[0].querySelector<HTMLElement>(".lt")!,
    letterU: words[1].querySelectorAll<HTMLElement>(".lt")[1],
    words,
  };
}

// Before he arrives (day, not calm): the W is only an outline and the u of Oud sits crooked.
export function prepName(name: HTMLElement) {
  if (getMotion().calm) return;
  const { letterW, letterU } = nameLetters(name);
  letterW.classList.add("ol");
  letterU.classList.add("off");
}

export function unprepName(name: HTMLElement) {
  const { letterW, letterU } = nameLetters(name);
  letterW.classList.remove("ol", "plop");
  letterU.classList.remove("off", "snap");
  letterU.style.transform = "";
}

/** Splits a word into letters Wessel can grab; group = [from, to) kept together. */
export function Letters({ word, group }: { word: string; group?: [number, number] }) {
  const chars = [...word];
  const letter = (char: string, index: number) => (
    <span key={index} className="lt">
      {char}
    </span>
  );
  if (!group) return <>{chars.map(letter)}</>;
  const [from, to] = group;
  return (
    <>
      {chars.slice(0, from).map(letter)}
      <span className="grp">{chars.slice(from, to).map((char, i) => letter(char, i + from))}</span>
      {chars.slice(to).map((char, i) => letter(char, i + to))}
    </>
  );
}

/** The name fills the row: Display 192 is the base, fitted to the width. */
export function useFitName(nameRef: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const name = nameRef.current;
    if (!name) return;
    const fit = () => {
      name.style.fontSize = "";
      const width = name.clientWidth;
      const base = parseFloat(getComputedStyle(name).fontSize);
      // Phones: the reel has its own row, so the two words fill the line.
      if (narrow()) {
        const words = [...name.querySelectorAll<HTMLElement>(":scope > .w")].reduce((sum, el) => sum + el.offsetWidth, 0);
        name.style.fontSize = `${Math.min(Math.floor((base * width) / (words + base * 0.25)), 160)}px`;
      } else {
        const parts = [...name.children].reduce((sum, el) => sum + (el as HTMLElement).offsetWidth, 0);
        name.style.fontSize = `${Math.min(Math.floor((base * width) / (parts + base * 0.3)), 240)}px`;
      }
    };
    fit();
    document.fonts?.ready.then(fit);
    let timer = 0;
    const resized = () => {
      clearTimeout(timer);
      timer = window.setTimeout(fit, 150);
    };
    addEventListener("resize", resized);
    return () => {
      removeEventListener("resize", resized);
      clearTimeout(timer);
    };
  }, [nameRef]);
}
