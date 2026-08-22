// FE-C03 · DaySummary — total de kcal + repartição de macros do dia selecionado (T-04, F1-CLI-03)
import { Card } from "@/components/ui/Card";
import { MacroRing, MACRO_ORDER } from "@/components/macro-ring/MacroRing";
import { isWithinDailyTarget } from "@/lib/planStats";
import type { components } from "@/types/api";
import styles from "./DaySummary.module.css";

type MealPlanDay = components["schemas"]["MealPlanDay"];

export type DaySummaryProps = {
  day: MealPlanDay;
  className?: string;
};

export function DaySummary({ day, className }: DaySummaryProps) {
  const kcal = day.totalKcal ?? 0;
  const macros = {
    proteina: day.macros?.proteina ?? 0,
    carbs: day.macros?.carbs ?? 0,
    gordura: day.macros?.gordura ?? 0,
    fibra: day.macros?.fibra ?? 0,
  };
  // FE-Y05 · "🟢 Dentro do objectivo" — indicador simples pedido pelo cliente ("ajuda muito o
  // utilizador"); ver comentário na função isWithinDailyTarget sobre a origem de targetKcal.
  const withinTarget = isWithinDailyTarget(kcal, day.targetKcal);

  return (
    <Card className={[styles.card, className].filter(Boolean).join(" ")}>
      <div className={styles.row}>
        <MacroRing macros={macros} kcal={kcal} size="md" />
        <div className={styles.breakdown}>
          <p className={styles.label}>Total do dia</p>
          <p className={styles.kcal}>{kcal} kcal</p>
          {withinTarget ? <p className={styles.targetBadge}>🟢 Dentro do objectivo</p> : null}
          <ul className={styles.legend}>
            {MACRO_ORDER.map(([key, label, color]) => (
              <li key={key} className={styles.legendRow}>
                <span className={styles.swatch} style={{ background: color }} aria-hidden="true" />
                <span className={styles.legendLabel}>{label}</span>
                <span className={styles.legendValue}>{Math.round(macros[key])}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
