// FE-B05 · MacroRing — componente-assinatura (técnica stroke-dasharray da landing)
// Ordem e cores FIXAS: Proteína → Carboidratos → Gordura → Fibra (docs/plano/02-ui-ux-plan.md §1)
//
// Técnica (replicada de `project/Leve Sabor AI.dc.html`, secção "VISUALIZAÇÃO DE MACROS" e o
// mini-resultado do quiz do hero): um círculo de fundo ("track") + 4 <circle> concêntricos
// (mesmo cx/cy/r) por cima, cada um com stroke-dasharray = "comprimento_do_segmento resto" e
// stroke-dashoffset = -(soma acumulada dos segmentos anteriores), para que fiquem encostados
// uns aos outros ao longo do perímetro. Em vez de rodar cada <circle> individualmente (como a
// landing faz para o ícone do nav) ou rodar o <svg> inteiro e depois contra-rodar os <text>
// (como a landing faz no anel do hero), aqui aplicamos a rotação apenas ao grupo dos círculos
// (via `transform-box:fill-box; transform-origin:center` + a keyframe `ls-ring-in`, que já
// termina em `rotate(-90deg)`) — mesmo resultado visual (segmento 1 começa às 12h), sem que o
// texto do kcal precise de nenhuma contra-rotação.
import styles from "./MacroRing.module.css";

export const MACRO_ORDER = [
  ["proteina", "Proteína", "var(--macro-proteina)"],
  ["carbs", "Carboidratos", "var(--macro-carbs)"],
  ["gordura", "Gordura", "var(--macro-gordura)"],
  ["fibra", "Fibra", "var(--macro-fibra)"],
] as const;

export type Macros = { proteina: number; carbs: number; gordura: number; fibra: number };
export type MacroRingProps = {
  macros: Macros;            // percentagens, somam ~100
  kcal: number;
  size?: "sm" | "md" | "lg"; // 44 / 112 / 220 px; lg inclui legenda
};

type Size = NonNullable<MacroRingProps["size"]>;

// Tamanhos reais em px — exportado para outros cartões (ex.: skeletons que precisam da mesma
// geometria do conteúdo, padrão de loading do 02-ui-ux-plan.md).
export const MACRO_RING_SIZE: Record<Size, number> = { sm: 44, md: 112, lg: 220 };

// Geometria SVG por variante. `md` e `lg` replicam exatamente os números da landing
// (viewBox/raio/stroke-width/font-size do anel do hero e da secção "Macros", respetivamente);
// `sm` não tem exemplo direto na landing (o ícone do nav é decorativo, só 2 segmentos fixos),
// pelo que segue a mesma proporção raio/viewBox (~0.4) e espessura/viewBox (~0.12).
const GEOMETRY: Record<Size, { viewBox: number; radius: number; stroke: number; fontSize: number }> = {
  sm: { viewBox: 100, radius: 40, stroke: 12, fontSize: 30 },
  md: { viewBox: 160, radius: 70, stroke: 20, fontSize: 22 },
  lg: { viewBox: 200, radius: 86, stroke: 24, fontSize: 28 },
};

export function MacroRing({ macros, kcal, size = "md" }: MacroRingProps) {
  const px = MACRO_RING_SIZE[size];
  const { viewBox, radius, stroke, fontSize } = GEOMETRY[size];
  const center = viewBox / 2;
  const circumference = 2 * Math.PI * radius;

  const total = MACRO_ORDER.reduce((sum, [key]) => sum + (macros[key] ?? 0), 0);

  let cumulative = 0;
  const segments = MACRO_ORDER.map(([key, label, color]) => {
    const value = macros[key] ?? 0;
    const fraction = total > 0 ? value / total : 0;
    const length = fraction * circumference;
    const dasharray = `${length} ${Math.max(circumference - length, 0)}`;
    const dashoffset = -cumulative;
    cumulative += length;
    return { key, label, color, value, dasharray, dashoffset };
  });

  const ariaLabel = `${kcal} kcal — ${segments
    .map((seg) => `${seg.label} ${Math.round(seg.value)}%`)
    .join(", ")}`;

  const ring = (
    <svg
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      width={px}
      height={px}
      role="img"
      aria-label={ariaLabel}
      style={{ flex: "none" }}
    >
      <g className={styles.ringGroup}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={styles.track}
        />
        {segments.map((seg) => (
          <circle
            key={seg.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={seg.dasharray}
            strokeDashoffset={seg.dashoffset}
            style={{ stroke: seg.color }}
          />
        ))}
      </g>
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        className={styles.kcalText}
        style={{ fontSize }}
      >
        {kcal}
      </text>
    </svg>
  );

  if (size !== "lg") return ring;

  return (
    <div className={styles.withLegend}>
      {ring}
      <div className={styles.legend}>
        {segments.map((seg) => (
          <div key={seg.key} className={styles.legendRow}>
            <span className={styles.swatch} style={{ background: seg.color }} />
            <span className={styles.legendLabel}>{seg.label}</span>
            <span className={styles.legendValue}>{Math.round(seg.value)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
