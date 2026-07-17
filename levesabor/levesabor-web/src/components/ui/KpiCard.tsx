// FE-B09 · KpiCard — cartão de métrica (label + valor mono + hint opcional), variante do Card
// Usado no dashboard admin (T-09: Utilizadores, Novos no período, Planos gerados, Taxa de sucesso da IA).
import type { HTMLAttributes } from "react";
import { Card } from "./Card";
import { Skeleton } from "./Skeleton";
import styles from "./KpiCard.module.css";

export type KpiCardProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  /** Nome curto da métrica (ex.: "Utilizadores", "Taxa de sucesso da IA"). */
  label: string;
  /** Valor já formatado pelo chamador (ex.: "97%", "18.42", 1234). */
  value: string | number;
  /** Texto de apoio opcional (ex.: "+17 no período"). */
  hint?: string;
  /** Mostra o skeleton (mesma geometria) em vez do conteúdo. */
  isLoading?: boolean;
};

export function KpiCard({
  label,
  value,
  hint,
  isLoading = false,
  className,
  ...rest
}: KpiCardProps) {
  const classes = [styles.card, className].filter(Boolean).join(" ");

  if (isLoading) {
    return (
      <Card className={classes} aria-busy="true" {...rest}>
        <Skeleton variant="text" width="55%" height="12px" />
        <Skeleton variant="text" width="70%" height="30px" style={{ marginTop: 10 }} />
        <Skeleton variant="text" width="40%" height="12px" style={{ marginTop: 8 }} />
      </Card>
    );
  }

  return (
    <Card className={classes} {...rest}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </Card>
  );
}
