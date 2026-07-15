// FE-C03 · DayTabs — tabs de dias seg–dom, scroll horizontal, dia atual pré-selecionado (T-04, F1-CLI-03)
"use client";

import styles from "./DayTabs.module.css";

export type DayTabItem = {
  /** Formato YYYY-MM-DD — igual ao MealPlanDay.date devolvido pelo backend. */
  date: string;
  /** Nome completo em pt-PT (ex. "segunda-feira") — igual ao MealPlanDay.weekday devolvido pelo backend. */
  weekday: string;
};

export type DayTabsProps = {
  days: DayTabItem[];
  /** Índice do dia atualmente selecionado dentro de `days`. */
  selectedIndex: number;
  onSelect: (dayIndex: number) => void;
  /** Índice do dia de hoje dentro de `days`, quando a semana o inclui — mostra um indicador extra. */
  todayIndex?: number;
  className?: string;
};

const WEEKDAY_ABBR: Record<string, string> = {
  "segunda-feira": "seg",
  "terça-feira": "ter",
  "quarta-feira": "qua",
  "quinta-feira": "qui",
  "sexta-feira": "sex",
  sábado: "sáb",
  domingo: "dom",
};

function dayOfMonth(dateIso: string): string {
  return dateIso.split("-")[2] ?? "";
}

export function DayTabs({ days, selectedIndex, onSelect, todayIndex, className }: DayTabsProps) {
  return (
    <div
      className={[styles.scroller, className].filter(Boolean).join(" ")}
      role="tablist"
      aria-label="Dias da semana"
    >
      {days.map((day, index) => {
        const selected = index === selectedIndex;
        const isToday = index === todayIndex;
        return (
          <button
            key={day.date || index}
            type="button"
            role="tab"
            aria-selected={selected}
            className={[styles.tab, selected ? styles.selected : ""].filter(Boolean).join(" ")}
            onClick={() => onSelect(index)}
          >
            <span className={styles.weekday}>{WEEKDAY_ABBR[day.weekday] ?? day.weekday.slice(0, 3)}</span>
            <span className={styles.date}>{dayOfMonth(day.date)}</span>
            {isToday && !selected ? <span className={styles.todayDot} aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}
