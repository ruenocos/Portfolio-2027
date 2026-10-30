// Small number helpers shared by Wessel, the intro, the scroll system and
// the toys. Pure, so they're safe on the server too.

export const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Slow in, fast through the middle, slow out (easings.net easeInOutCubic). */
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Smooth start, smooth stop, no lingering tail: how a hand moves a mouse
 *  (Flash & Hogan 1985, minimum jerk). */
export const minJerk = (t: number) => t * t * t * (10 - 15 * t + 6 * t * t);
/** A point at t (0–1) on the cubic bezier p0 p1 p2 p3. */
export function bezierAt(t: number, p0: readonly number[], p1: readonly number[], p2: readonly number[], p3: readonly number[]): [number, number] {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}
/** A motion-tokens bezier ([x1, y1, x2, y2]) as a CSS / WAAPI easing. */
export const cssBezier = (b: readonly number[]) => `cubic-bezier(${b.join(",")})`;
