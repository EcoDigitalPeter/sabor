// FE-B02 · Card — contentor genérico da biblioteca base (fundo cream-card/cream-card-alt, radius-card, sombra leve)
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

export type CardVariant = "default" | "alt";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** "alt" usa --cream-card-alt — para cartões aninhados dentro de outros cartões (ex.: linhas de lista). */
  variant?: CardVariant;
};

export function Card({ children, variant = "default", className, ...rest }: CardProps) {
  const classes = [styles.card, variant === "alt" ? styles.alt : styles.default, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
