// FE-B04 · Skeleton — placeholder pulsante para o estado "loading" (mesma geometria do conteúdo real)
// Composição: cada tela monta os seus skeletons combinando várias instâncias (ex.: "3 cartões de refeição").

import type { CSSProperties, HTMLAttributes } from "react";
import styles from "./Skeleton.module.css";

export type SkeletonVariant = "text" | "rect" | "circle";

export type SkeletonProps = {
  /** Forma base e defaults de tamanho: "text" (linha ~1em), "rect" (bloco), "circle" (avatar/ícone). Default: "rect". */
  variant?: SkeletonVariant;
  /** Valor CSS livre (ex.: "64px", "100%", "3rem"). Sobrepõe o default do variant. */
  width?: string | number;
  height?: string | number;
  /** Sobrepõe o border-radius do variant (ex.: "18px" para imitar um Card). */
  borderRadius?: string;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

const VARIANT_DEFAULTS: Record<SkeletonVariant, { width: string; height: string; borderRadius: string }> = {
  text: { width: "100%", height: "1em", borderRadius: "4px" },
  rect: { width: "100%", height: "100%", borderRadius: "var(--radius-card-sm)" },
  circle: { width: "40px", height: "40px", borderRadius: "50%" },
};

export function Skeleton({
  variant = "rect",
  width,
  height,
  borderRadius,
  className,
  style,
  ...rest
}: SkeletonProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const resolvedStyle: CSSProperties = {
    width: width ?? defaults.width,
    height: height ?? defaults.height,
    borderRadius: borderRadius ?? defaults.borderRadius,
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      className={[styles.skeleton, className].filter(Boolean).join(" ")}
      style={resolvedStyle}
      {...rest}
    />
  );
}
