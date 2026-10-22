import Link from "next/link";
import styles from "./Header.module.css";

const nav = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/playground", label: "Playground" },
  { href: "/#contact", label: "Contact" },
];

export function Header({ name }: { name: string }) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.name}>
        {name}
      </Link>
      <nav aria-label="Main">
        <ul className={styles.nav}>
          {nav.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
