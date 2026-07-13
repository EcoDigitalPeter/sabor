// FE-B02 · Chip — pílula mono (ex.: "620 kcal · 35 min"), estilo landing; conteúdo é responsabilidade do chamador
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Chip.module.css";

export type ChipVariant = "tan" | "cream";

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: ChipVariant;
};

export function Chip({ children, variant = "tan", className, ...rest }: ChipProps) {
  const classes = [styles.chip, variant === "cream" ? styles.cream : styles.tan, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
