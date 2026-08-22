// FE-B04 · ErrorState — cartão de erro com ícone, mensagem em português claro e "Tentar novamente"
// Erros de campo de formulário NÃO são deste componente — ver FormField (FE-B06).

import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import styles from "./ErrorState.module.css";

export type ErrorStateProps = {
  /** Slot para ilustração contextual; se omitido, usa o ícone compacto antigo. */
  illustration?: ReactNode;
  /** Mensagem em português claro, sem detalhe técnico (responsabilidade de quem chama). */
  message: string;
  /** Quando fornecido, mostra o botão "Tentar novamente". */
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({ illustration, message, onRetry, className }: ErrorStateProps) {
  return (
    <div role="alert" className={[styles.container, className].filter(Boolean).join(" ")}>
      {illustration ? (
        <div className={styles.illustration}>{illustration}</div>
      ) : (
        <AlertCircle className={styles.icon} aria-hidden="true" size={32} strokeWidth={2} />
      )}
      <p className={styles.message}>{message}</p>
      {onRetry ? (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
