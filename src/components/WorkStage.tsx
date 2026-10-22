"use client";

import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/content/site";
import styles from "./WorkStage.module.css";

// Selected work: one project in focus, a list to switch.
export function WorkStage({ projects }: { projects: Project[] }) {
  const [index, setIndex] = useState(0);
  const active = projects[index];

  return (
    <section id="work" className={styles.stage} aria-labelledby="work-title">
      <div className={styles.visual} id="work-panel" role="tabpanel" aria-labelledby={`tab-${active.slug}`}>
        <div key={active.slug} className={styles.frame}>
          {active.visual === "stat" && active.stat && (
            <div className={styles.stat}>
              <span className={styles.note}>Demo clip goes here</span>
              <div className={styles.statRow}>
                <span className={styles.statValue}>{active.stat.value}</span>
                <span className={styles.statLabel}>{active.stat.label}</span>
              </div>
            </div>
          )}
          {active.visual === "media" && active.cover && (
            <div className={styles.media}>
              {active.cover.video ? (
                <video src={active.cover.src} aria-label={active.cover.alt} autoPlay muted loop playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${active.cover.src}?w=1600&auto=format`} alt={active.cover.alt} />
              )}
            </div>
          )}
          {active.visual === "browser" && (
            <div className={styles.browser}>
              <div className={styles.chrome}>
                <span />
                <span />
                <span />
                <em>{active.url}</em>
              </div>
              <div className={styles.capture}>Scrolling capture of the site goes here</div>
            </div>
          )}
          {active.visual === "locked" && (
            <div className={styles.locked}>
              <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <p className={styles.lockedTitle}>This project is under NDA</p>
              <p className={styles.lockedText}>Ask me for the password and I&apos;ll walk you through it.</p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.side}>
        <div className={styles.copy}>
          <h2 id="work-title" className={styles.heading}>
            Selected work
          </h2>
          <p className={styles.kind}>{active.kind}</p>
          <h3 className={styles.title}>{active.title}</h3>
          <p className={styles.summary}>{active.summary}</p>
          <Link href={`/work/${active.slug}`} className={styles.link}>
            Read the case study
          </Link>
        </div>
        <div role="tablist" aria-label="Projects" className={styles.list}>
          {projects.map((project, i) => (
            <button
              key={project.slug}
              id={`tab-${project.slug}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-controls="work-panel"
              className={styles.row}
              onClick={() => setIndex(i)}
            >
              <span>{project.short}</span>
              <span className={styles.bar} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
