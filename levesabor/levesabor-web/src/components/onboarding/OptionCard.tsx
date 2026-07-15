// FE-C02 · OptionCard — cartão-botão selecionável para grelhas de 1-de-N (T-03 Onboarding: objetivo,
// condição de saúde, orçamento). Local a esta feature (não faz parte de src/components/ui/**) porque
// não há um componente de biblioteca equivalente ainda e o cartão de tarefas pede isolamento por
// feature enquanto outros agentes tocam ficheiros partilhados em paralelo.
"use client";

import type { ReactNode } from "react";
import styles from "./OptionCard.module.css";

export type OptionCardProps = {
  /** Rótulo principal do cartão (label exato do enum/landing — ver docs/plano/01-functional-plan.md). */
  label: string;
  /** Texto de apoio opcional, mais pequeno, sob o rótulo. */
  description?: string;
  /** Estado selecionado (grupo de seleção única — o consumidor garante exclusividade). */
  selected: boolean;
  /** Chamado ao clicar/ativar por teclado (é um <button>, recebe Enter/Space nativamente). */
  onSelect: () => void;
  icon?: ReactNode;
};

export function OptionCard({ label, description, selected, onSelect, icon }: OptionCardProps) {
  const classNames = [styles.card, selected ? styles.selected : ""].filter(Boolean).join(" ");

  return (
    <button type="button" className={classNames} onClick={onSelect} aria-pressed={selected}>
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{label}</span>
      {description ? <span className={styles.description}>{description}</span> : null}
    </button>
  );
}
