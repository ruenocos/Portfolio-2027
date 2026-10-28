// Small number helpers shared by Wessel, the intro, the scroll system and
// the toys. Pure, so they're safe on the server too.

export const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Slow in, fast through the middle, slow out (easings.net easeInOutCubic). */
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** A motion-tokens bezier ([x1, y1, x2, y2]) as a CSS / WAAPI easing. */
export const cssBezier = (b: readonly number[]) => `cubic-bezier(${b.join(",")})`;
