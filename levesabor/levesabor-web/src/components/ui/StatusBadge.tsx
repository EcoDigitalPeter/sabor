// FE-B02 · StatusBadge — etiqueta de estado (cor sólida por estado + texto branco), rótulo em português
import type { HTMLAttributes } from "react";
import styles from "./StatusBadge.module.css";

export type Status = "ACTIVE" | "SUSPENDED" | "DRAFT" | "PUBLISHED";

export type StatusBadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  status: Status;
};

const STATUS_LABEL: Record<Status, string> = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  DRAFT: "Rascunho",
  PUBLISHED: "Publicada",
};

// ACTIVE/PUBLISHED → forest (sucesso) · SUSPENDED → terracotta (aviso/perigo) · DRAFT → clay-soft (neutro/mudo)
const STATUS_TONE: Record<Status, string> = {
  ACTIVE: styles.forest,
  PUBLISHED: styles.forest,
  SUSPENDED: styles.terracotta,
  DRAFT: styles.claySoft,
};

export function StatusBadge({ status, className, ...rest }: StatusBadgeProps) {
  const classes = [styles.badge, STATUS_TONE[status], className].filter(Boolean).join(" ");

  return (
    <span className={classes} {...rest}>
      {STATUS_LABEL[status]}
    </span>
  );
}
