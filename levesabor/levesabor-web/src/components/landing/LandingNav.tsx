"use client";
// FE-P03 · LandingNav v2 — nav sticky da landing pública (project/Leve Sabor AI.dc.html linhas 34-44).
// Ganha âncoras de secção (escondidas <768px) e um estado de scroll que dá mais ênfase ao CTA
// depois de passar o hero — pequena ilha cliente, sem custo de dados relevante.
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./LandingNav.module.css";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [hasShadow, setHasShadow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 400);
      setHasShadow(window.scrollY > 20);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={[styles.nav, hasShadow ? styles.navShadow : ""].filter(Boolean).join(" ")}>
      <a href="#top" className={styles.brand}>
        <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true" style={{ flex: "none" }}>
          <circle cx="20" cy="20" r="16" fill="none" stroke="var(--ink)" strokeWidth={3} opacity={0.12} />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="var(--terracotta)"
            strokeWidth={3}
            strokeDasharray="34 66"
            transform="rotate(-90 20 20)"
          />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="var(--amber)"
            strokeWidth={3}
            strokeDasharray="24 76"
            strokeDashoffset="-34"
            transform="rotate(-90 20 20)"
          />
        </svg>
        <span className={styles.wordmark}>ottimizo</span>
      </a>
      <div className={styles.links}>
        <a href="#como-funciona" className={styles.link}>
          Como funciona
        </a>
        <a href="#pratos" className={styles.link}>
          Pratos
        </a>
        <a href="#faq" className={styles.link}>
          FAQ
        </a>
      </div>
      <div className={styles.actions}>
        <Link href="/login" className={styles.loginLink}>
          Entrar
        </Link>
        <Link href="/registo" className={[styles.cta, scrolled ? styles.ctaEmphasis : ""].filter(Boolean).join(" ")}>
          Criar conta
        </Link>
      </div>
    </nav>
  );
}
