// FE-B09 · LineChart — gráfico de linhas leve, SVG hand-rolled (sem lib), estilo do MacroRing
// (geometria calculada a partir das props, cor via var(--...) dos tokens). Usado no dashboard
// admin (T-09: "planos gerados/dia"), mas é genérico — qualquer série { date, count }.
import { Skeleton } from "./Skeleton";
import styles from "./LineChart.module.css";

export type LineChartPoint = { date: string; count: number };

export type LineChartProps = {
  data: LineChartPoint[];
  /** Rótulo curto do que os pontos representam (ex.: "Planos gerados por dia"); usado no aria-label por omissão. */
  label?: string;
  /** Dimensões do viewBox — definem a proporção do gráfico; o SVG escala de forma fluida à
   *  largura do contentor (não é um tamanho fixo em px), pelo que funciona a partir de ~360px. */
  width?: number;
  height?: number;
  /** Cor do traço/preenchimento — um token de `tokens.css` (ex.: "var(--terracotta)"). */
  color?: string;
  /** Sobrepõe o aria-label gerado automaticamente a partir dos dados. */
  ariaLabel?: string;
  /** Mostra o skeleton (mesma proporção) em vez do gráfico. */
  isLoading?: boolean;
  className?: string;
};

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 120;
const PAD_X = 4;
const PAD_Y = 8;

function buildAriaLabel(label: string | undefined, data: LineChartPoint[]): string {
  const prefix = label ? `${label}: ` : "";

  if (data.length === 0) return `${prefix}sem dados`;
  if (data.length === 1) return `${prefix}1 ponto, valor ${data[0].count}`;

  const first = data[0];
  const last = data[data.length - 1];
  const values = data.map((point) => point.count);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const trend = last.count > first.count ? "a subir" : last.count < first.count ? "a descer" : "estável";

  return `${prefix}${data.length} pontos, de ${first.count} a ${last.count} (${trend}), entre ${min} e ${max}`;
}

export function LineChart({
  data,
  label,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  color = "var(--terracotta)",
  ariaLabel,
  isLoading = false,
  className,
}: LineChartProps) {
  const wrapperClasses = [styles.wrapper, className].filter(Boolean).join(" ");
  const wrapperStyle = { aspectRatio: `${width} / ${height}` };

  if (isLoading) {
    return (
      <div className={wrapperClasses} style={wrapperStyle} aria-busy="true">
        <Skeleton borderRadius="var(--radius-card-sm)" />
      </div>
    );
  }

  const resolvedAriaLabel = ariaLabel ?? buildAriaLabel(label, data);

  if (data.length === 0) {
    return (
      <div className={wrapperClasses} style={wrapperStyle}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={resolvedAriaLabel}
          className={styles.svg}
        />
      </div>
    );
  }

  const values = data.map((point) => point.count);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const innerWidth = width - PAD_X * 2;
  const innerHeight = height - PAD_Y * 2;

  const xForIndex = (index: number) =>
    data.length === 1 ? width / 2 : PAD_X + (index / (data.length - 1)) * innerWidth;

  const yForValue = (value: number) =>
    range === 0 ? height / 2 : PAD_Y + innerHeight - ((value - min) / range) * innerHeight;

  const points = data.map((point, index) => [xForIndex(index), yForValue(point.count)] as const);
  const [lastX, lastY] = points[points.length - 1];

  const linePoints = points.map(([x, y]) => `${x},${y}`).join(" ");
  const baseline = height - PAD_Y;
  const areaPath =
    points.length > 1
      ? `M${points[0][0]},${baseline} ${points.map(([x, y]) => `L${x},${y}`).join(" ")} L${lastX},${baseline} Z`
      : "";

  return (
    <div className={wrapperClasses} style={wrapperStyle}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={resolvedAriaLabel}
        className={styles.svg}
      >
        {areaPath ? <path d={areaPath} className={styles.area} style={{ fill: color }} /> : null}
        {points.length > 1 ? (
          <polyline points={linePoints} className={styles.line} style={{ stroke: color }} />
        ) : null}
        <circle cx={lastX} cy={lastY} r={PAD_Y / 2} className={styles.dot} style={{ fill: color }} />
      </svg>
    </div>
  );
}
