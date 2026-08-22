"use client";
// FE-P02 · Reveal — revela conteúdo com fade+translate ao entrar no viewport (IntersectionObserver).
// Sem JS ou antes do observer montar o conteúdo está sempre visível (a classe "hidden" só é
// aplicada depois do useEffect correr); sob prefers-reduced-motion revela de imediato, sem esperar
// o scroll. Peça partilhada de motion (originalmente só da landing v2, promovida para o resto da
// app) — nunca esconde conteúdo indexável.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./motion.module.css";

export type RevealProps = {
  children: ReactNode;
  /** Atraso do stagger, em ms — aplicado via --reveal-delay. */
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
};

export function Reveal({ children, delay = 0, as = "div", className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    setMounted(true);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as as "div";
  const classes = [styles.reveal, mounted && !visible ? styles.hidden : "", className]
    .filter(Boolean)
    .join(" ");
  const style = { "--reveal-delay": `${delay}ms` } as CSSProperties;

  return (
    <Tag ref={ref} className={classes} style={style}>
      {children}
    </Tag>
  );
}
