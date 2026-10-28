import tokens from "../../design/tokens.json";

// The device questions components ask, in one place. Browser only: call
// them in effects and handlers, never while rendering on the server.

/** The one layout breakpoint (tokens.json breakpoint.stack): below it the canvas stacks for phones. */
export const STACK_PX = parseFloat(tokens.breakpoint.stack.$value);

/** Below the stack breakpoint: the phone and small-tablet layout. */
export const narrow = () => innerWidth < STACK_PX;
/** A mouse or trackpad: hover effects, magnetism, the "You" cursor, Lenis. */
export const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;
/** Touch first: nothing can hover. */
export const touch = () => matchMedia("(hover: none)").matches;
