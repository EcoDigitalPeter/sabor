// FE-C09 · WeekSelector — chips "Semana 1..5" para navegar as ~30 fatias de 7 dias do plano
// mensal (T-04). 30 dias não cabem em DayTabs num ecrã de 360px, por isso este componente
// filtra `plan.days` em fatias de 7 (a última pode ter menos) e o `page.tsx` passa só a fatia
// selecionada para o <DayTabs> existente — DayTabs continua a receber a mesma forma de `days`
// que já recebia, sem alterações internas.
"use client";

import styles from "./WeekSelector.module.css";

export type WeekSelectorProps = {
  /** Número total de semanas (chips) a mostrar — ex. 5 para um plano de 30 dias. */
  weekCount: number;
  /** Índice da semana atualmente selecionada (0-based). */
  selectedIndex: number;
  onSelect: (weekIndex: number) => void;
  className?: string;
};

export function WeekSelector({ weekCount, selectedIndex, onSelect, className }: WeekSelectorProps) {
  if (weekCount <= 1) return null;

  return (
    <div
      className={[styles.scroller, className].filter(Boolean).join(" ")}
      role="tablist"
      aria-label="Semanas do plano"
    >
      {Array.from({ length: weekCount }, (_, index) => {
        const selected = index === selectedIndex;
        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={selected}
            className={[styles.chip, selected ? styles.selected : ""].filter(Boolean).join(" ")}
            onClick={() => onSelect(index)}
          >
            {`Semana ${index + 1}`}
          </button>
        );
      })}
    </div>
  );
}
