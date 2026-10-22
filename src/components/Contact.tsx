"use client";

import { useState } from "react";
import type { Site } from "@/content/site";
import styles from "./Contact.module.css";

export function Contact({ site }: { site: Pick<Site, "email" | "linkedin"> }) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${site.email}`;
    }
  }

  return (
    <section id="contact" className={styles.contact} aria-labelledby="contact-title">
      <div className={styles.copy}>
        <h2 id="contact-title" className={styles.heading}>
          Get in touch
        </h2>
        <a href={`mailto:${site.email}`} className={styles.email}>
          {site.email}
        </a>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={copyEmail}>
          {copied ? "Copied" : "Copy email"}
        </button>
        <a href={site.linkedin} className={styles.primary} rel="noreferrer" target="_blank">
          LinkedIn
        </a>
        <span className="visually-hidden" aria-live="polite">
          {copied ? "Email copied" : ""}
        </span>
      </div>
    </section>
  );
}
