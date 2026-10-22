import Link from "next/link";
import type { Site } from "@/content/site";
import { TokenFlow } from "./TokenFlow";
import styles from "./Hero.module.css";

export function Hero({ site }: { site: Site }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.copy}>
        <h1 id="hero-title" className={styles.title}>
          {site.headline}
        </h1>
        <p className={styles.intro}>{site.intro}</p>
        <div className={styles.actions}>
          <Link href="/#work" className={styles.primary}>
            See the work
          </Link>
          <Link href="/#contact" className={styles.secondary}>
            Get in touch
          </Link>
        </div>
      </div>
      <div className={styles.visual}>
        <TokenFlow />
      </div>
    </section>
  );
}
