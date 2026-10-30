import tokens from "../../design/tokens.json";

// The device questions components ask, in one place. Browser only: call
// them in effects and handlers, never while rendering on the server.

/** The one layout breakpoint (tokens.json breakpoint.stack): below it the canvas stacks for phones. */
export const STACK_PX = parseFloat(tokens.breakpoint.stack.$value);

/** Below the stack breakpoint: the phone and small-tablet layout. */
export const narrow = () => innerWidth < STACK_PX;
/** A mouse or trackpad: hover effects, magnetism, the "You" cursor, Lenis. */
export const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;
let av1: boolean | undefined;
/** Plays AV1 (most browsers; Safari only with the hardware for it). */
const playsAv1 = () =>
  (av1 ??= document.createElement("video").canPlayType('video/mp4; codecs="av01.0.08M.08"') === "probably");
/** The lightest copy of a loop this browser plays. */
export const pickVideo = (mp4?: string, av1Copy?: string) => (av1Copy && playsAv1() ? av1Copy : mp4);
/** Touch first: nothing can hover. */
export const touch = () => matchMedia("(hover: none)").matches;
