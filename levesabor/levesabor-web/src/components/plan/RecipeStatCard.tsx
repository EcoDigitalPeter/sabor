// FE-Q04 · RecipeStatCard — cartão de estatística preenchido (Tempo/Custo no detalhe da receita).
// Componente novo e independente do KpiCard admin (tom neutro, feito para outro contexto) —
// aqui queremos o par colorido âmbar/floresta inspirado nas referências de benchmark.
import styles from "./RecipeStatCard.module.css";

export type RecipeStatCardProps = {
  label: string;
  value: string;
  tone: "amber" | "forest";
};

export function RecipeStatCard({ label, value, tone }: RecipeStatCardProps) {
  const toneClass = tone === "amber" ? styles.amber : styles.forest;
  return (
    <div className={[styles.card, toneClass].join(" ")}>
      <p className={styles.value}>{value}</p>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
