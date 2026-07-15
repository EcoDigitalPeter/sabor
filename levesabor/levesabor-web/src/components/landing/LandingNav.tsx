// FE-P01 · LandingNav — nav sticky da landing pública (project/Leve Sabor AI.dc.html linhas 34-44)
import Link from "next/link";
import styles from "./LandingNav.module.css";

export function LandingNav() {
  return (
    <nav className={styles.nav}>
      <a href="#top" className={styles.brand}>
        <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true" style={{ flex: "none" }}>
          <circle cx="20" cy="20" r="16" fill="none" stroke="#241A14" strokeWidth={3} opacity={0.12} />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="#C43E1C"
            strokeWidth={3}
            strokeDasharray="34 66"
            transform="rotate(-90 20 20)"
          />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="#E3A72E"
            strokeWidth={3}
            strokeDasharray="24 76"
            strokeDashoffset="-34"
            transform="rotate(-90 20 20)"
          />
        </svg>
        <span className={styles.wordmark}>
          leve <span className={styles.accent}>sabor</span>
        </span>
      </a>
      <Link href="/registo" className={styles.cta}>
        Criar conta
      </Link>
    </nav>
  );
}
