// FE-C09 · MonthProgressRing — anel de progresso do mês (T-04). Reutiliza a técnica
// stroke-dasharray de MacroRing (components/macro-ring/MacroRing.tsx) simplificada a UM único
// segmento terracotta: (dias com >=1 refeição marcada) / (total de dias do plano). Não é sobre
// macros, por isso vive em plan/ e não em macro-ring/. Texto central em mono, mesma geometria/peso
// visual das variantes sm/md do MacroRing — nada de troféus/confetti, só o número.
import styles from "./MonthProgressRing.module.css";

export type MonthProgressRingProps = {
  completedDays: number;
  totalDays: number;
  /** 44px / 112px — mesmas dimensões das variantes sm/md do MacroRing. */
  size?: "sm" | "md";
  className?: string;
};

type Size = NonNullable<MonthProgressRingProps["size"]>;

const SIZE_PX: Record<Size, number> = { sm: 44, md: 112 };

// Mesma geometria (viewBox/raio/stroke/fontSize) das variantes sm/md de MacroRing — mesmo peso
// visual, só um segmento em vez de quatro.
const GEOMETRY: Record<Size, { viewBox: number; radius: number; stroke: number; fontSize: number }> = {
  sm: { viewBox: 100, radius: 40, stroke: 12, fontSize: 24 },
  md: { viewBox: 160, radius: 70, stroke: 20, fontSize: 22 },
};

export function MonthProgressRing({ completedDays, totalDays, size = "sm", className }: MonthProgressRingProps) {
  const px = SIZE_PX[size];
  const { viewBox, radius, stroke, fontSize } = GEOMETRY[size];
  const center = viewBox / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = totalDays > 0 ? Math.min(Math.max(completedDays / totalDays, 0), 1) : 0;
  const length = fraction * circumference;
  const dasharray = `${length} ${Math.max(circumference - length, 0)}`;

  return (
    <svg
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      width={px}
      height={px}
      role="img"
      aria-label={`${completedDays} de ${totalDays} dias com refeições marcadas este mês`}
      className={className}
      style={{ flex: "none" }}
    >
      <g className={styles.ringGroup}>
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={stroke} className={styles.track} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={dasharray}
          className={styles.segment}
        />
      </g>
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        className={styles.countText}
        style={{ fontSize }}
      >
        {completedDays}/{totalDays}
      </text>
    </svg>
  );
}
