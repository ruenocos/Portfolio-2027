"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./TokenFlow.module.css";

// The hero's one orchestrated loop: Figma variables become SCSS.
// It only runs while it is on screen.
export function TokenFlow() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <figure
      ref={ref}
      className={styles.flow}
      data-paused={!visible}
      aria-label="A Figma variables panel turning into generated SCSS"
    >
      <div className={styles.panel}>
        <div className={styles.bar}>Figma variables</div>
        <div className={styles.tokens}>
          <div className={`${styles.token} ${styles.t1}`}>
            <span className={styles.swatch} style={{ background: "#3DFF8C" }} />
            color/signal
          </div>
          <div className={`${styles.token} ${styles.t2}`}>
            <span className={`${styles.swatch} ${styles.ground}`} />
            color/ground
          </div>
          <div className={`${styles.token} ${styles.t3}`}>
            <span className={styles.aa}>Aa</span>
            text/h1
          </div>
        </div>
      </div>

      <div className={styles.wire} aria-hidden="true">
        <span className={styles.pulse} />
      </div>

      <div className={`${styles.panel} ${styles.code}`}>
        <div className={`${styles.bar} ${styles.mono}`}>_tokens.scss</div>
        <div className={styles.lines}>
          <div className={styles.l1}>
            <span className={styles.key}>$signal</span>: #3DFF8C;
          </div>
          <div className={styles.l2}>
            <span className={styles.key}>$ground</span>: #0D0E10;
          </div>
          <div className={styles.l3}>
            <span className={styles.key}>@mixin</span> h1 {"{ … }"}
          </div>
          <div className={`${styles.l4} ${styles.comment}`}>{"// mobile sizes included"}</div>
        </div>
      </div>
    </figure>
  );
}
