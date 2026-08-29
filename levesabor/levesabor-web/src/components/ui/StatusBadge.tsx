// FE-B02 · StatusBadge — etiqueta de estado (cor sólida por estado + texto branco), rótulo em português
import type { HTMLAttributes } from "react";
import styles from "./StatusBadge.module.css";

export type Status =
  | "ACTIVE"
  | "SUSPENDED"
  | "DRAFT"
  | "PUBLISHED"
  | "AI_GENERATED"
  // FE-D07 · Ingredient.active (boolean) mapeado para um estado exibível, mesmo padrão dos outros
  | "INACTIVE"
  // F3-CLI-07 · estados de encomenda (Order.status)
  | "PENDENTE"
  | "ACEITE"
  | "EM_PREPARACAO"
  | "PRONTA"
  | "CONCLUIDA"
  | "RECUSADA"
  | "CANCELADA";

export type StatusBadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  status: Status;
};

const STATUS_LABEL: Record<Status, string> = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  DRAFT: "Rascunho",
  PUBLISHED: "Publicada",
  AI_GENERATED: "Gerada por IA",
  INACTIVE: "Inativo",
  PENDENTE: "Pendente",
  ACEITE: "Aceite",
  EM_PREPARACAO: "Em preparação",
  PRONTA: "Pronta",
  CONCLUIDA: "Concluída",
  RECUSADA: "Recusada",
  CANCELADA: "Cancelada",
};

// ACTIVE/PUBLISHED/PRONTA/CONCLUIDA → forest (sucesso) · SUSPENDED/RECUSADA → terracotta (aviso/perigo)
// · DRAFT/PENDENTE/CANCELADA → clay-soft (neutro/mudo) · ACEITE/EM_PREPARACAO → amber (em curso)
const STATUS_TONE: Record<Status, string> = {
  ACTIVE: styles.forest,
  PUBLISHED: styles.forest,
  AI_GENERATED: styles.amber,
  SUSPENDED: styles.terracotta,
  DRAFT: styles.claySoft,
  INACTIVE: styles.claySoft,
  PENDENTE: styles.claySoft,
  ACEITE: styles.amber,
  EM_PREPARACAO: styles.amber,
  PRONTA: styles.forest,
  CONCLUIDA: styles.forest,
  RECUSADA: styles.terracotta,
  CANCELADA: styles.claySoft,
};

export function StatusBadge({ status, className, ...rest }: StatusBadgeProps) {
  const classes = [styles.badge, STATUS_TONE[status], className].filter(Boolean).join(" ");

  return (
    <span className={classes} {...rest}>
      {STATUS_LABEL[status]}
    </span>
  );
}
