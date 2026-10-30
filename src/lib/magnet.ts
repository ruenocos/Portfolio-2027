import motionTokens from "../../design/motion-tokens.json";

const MAG = motionTokens.magnetism.projectMedia;
const MAX = MAG.max.match(/\d+/g)!.map(Number);
const ROT = Number(MAG.rotate.match(/[\d.]+/)![0]);

/**
 * Project media magnetism: el leans toward a pointer (pull and cap from
 * motion-tokens) with a tilt that follows the lean, and eases back on rest().
 * Callers decide when it's on (fine pointer, not calm) and which pointer
 * moves count.
 */
export function magnet(el: HTMLElement) {
  const m = { x: 0, y: 0, tx: 0, ty: 0 };
  let raf = 0;
  const draw = () => {
    m.x += (m.tx - m.x) * MAG.ease;
    m.y += (m.ty - m.y) * MAG.ease;
    el.style.transform = `translate(${m.x.toFixed(2)}px,${m.y.toFixed(2)}px) rotate(${(m.x * ROT).toFixed(3)}deg)`;
    raf = Math.abs(m.tx - m.x) + Math.abs(m.ty - m.y) > 0.05 ? requestAnimationFrame(draw) : 0;
  };
  const kick = () => void (raf ||= requestAnimationFrame(draw));
  return {
    toward(x: number, y: number) {
      // From its resting centre, so the lean doesn't feed back into itself.
      const b = el.getBoundingClientRect();
      const cx = b.left + b.width / 2 - m.x;
      const cy = b.top + b.height / 2 - m.y;
      m.tx = Math.max(-MAX[0], Math.min(MAX[0], (x - cx) * MAG.pull));
      m.ty = Math.max(-MAX[1], Math.min(MAX[1], (y - cy) * MAG.pull));
      kick();
    },
    rest() {
      m.tx = m.ty = 0;
      kick();
    },
    stop() {
      cancelAnimationFrame(raf);
      el.style.transform = "";
    },
  };
}
