import styles from "./PageIntro.module.css";

// Simple page header used while a page is still being built.
export function PageIntro({ title, text }: { title: string; text: string }) {
  return (
    <section className={styles.intro}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.text}>{text}</p>
    </section>
  );
}
