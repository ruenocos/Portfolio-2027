import type { Site } from "@/content/site";
import styles from "./Footer.module.css";

export function Footer({ site }: { site: Site }) {
  return (
    <footer className={styles.footer}>
      <span>
        {site.name}, {site.role}
      </span>
      <span className={styles.links}>
        <a href={`mailto:${site.email}`}>{site.email}</a>
        <a href={site.linkedin} rel="noreferrer" target="_blank">
          LinkedIn
        </a>
      </span>
    </footer>
  );
}
