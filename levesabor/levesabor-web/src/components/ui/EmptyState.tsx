// FE-B04 · EmptyState — ilustração + título Bricolage + frase de ação + CTA primário (tom otimista, não clínico)
// Ilustração real vem de FE-B10; aqui é apenas um slot reservado (nada renderiza se omitido).

import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export type EmptyStateProps = {
  /** Slot para a ilustração (SVG/imagem) fornecida por FE-B10. Nada é renderizado se omitido. */
  illustration?: ReactNode;
  /** Título em destaque, renderizado em var(--font-display). */
  title: string;
  /** Frase de apoio/ação, tom otimista. */
  description?: string;
  /** Rótulo do botão CTA — só é usado quando `action` não é passado. */
  ctaLabel?: string;
  /** Handler do CTA — só é usado quando `action` não é passado. */
  onCtaClick?: () => void;
  /** Slot de ação alternativo (ex.: <Link> do Next.js). Tem precedência sobre ctaLabel/onCtaClick. */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  illustration,
  title,
  description,
  ctaLabel,
  onCtaClick,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={[styles.container, className].filter(Boolean).join(" ")}>
      {illustration ? <div className={styles.illustration}>{illustration}</div> : null}
      <h2 className={styles.title}>{title}</h2>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? (
        <div className={styles.action}>{action}</div>
      ) : ctaLabel ? (
        <button type="button" className={styles.cta} onClick={onCtaClick}>
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}
