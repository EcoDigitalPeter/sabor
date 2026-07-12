// FE-B05 · MacroRing — componente-assinatura (técnica stroke-dasharray da landing)
// Ordem e cores FIXAS: Proteína → Carboidratos → Gordura → Fibra (docs/plano/02-ui-ux-plan.md §1)

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

export function MacroRing({ macros, kcal, size = "md" }: MacroRingProps) {
  // TODO FE-B05: SVG com circumference = 2πr; por segmento dasharray=(pct/100)*C, dashoffset acumulado negativo;
  // rotate(-90) no grupo; kcal ao centro em var(--font-mono); animação ls-ring-in; legenda quando size==="lg".
  return <svg role="img" aria-label={`${kcal} kcal`} />;
}
