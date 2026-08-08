// FE-D06 · Vocabulário fechado de tags de saúde/receita (01-functional-plan.md F2-ADM-05) — 6
// tags médicas + 4 de preferência do cliente (as mesmas 4 de src/mocks/fixtures.ts
// DIETARY_PREFERENCES_VOCAB, repetidas aqui de propósito: aquela lista cobre só as 4 de
// preferência usadas no onboarding/perfil; esta cobre as 10 usadas no multi-select de receitas
// do admin). Fonte única para o formulário de receitas nesta ronda — onboarding/perfil mantêm a
// sua própria lista de 4, fora de escopo (evitar mexer numa feature já fechada por um gap noutra).
export type HealthTag = { value: string; label: string };

export const HEALTH_TAGS_VOCAB: HealthTag[] = [
  { value: "sem_gluten", label: "Sem glúten" },
  { value: "baixo_sodio", label: "Baixo em sódio" },
  { value: "acucar_controlado", label: "Açúcar controlado" },
  { value: "alto_sodio", label: "Alto em sódio" },
  { value: "alto_acucar", label: "Alto em açúcar" },
  { value: "vegetariana", label: "Vegetariana" },
  { value: "vegan", label: "Vegana" },
  { value: "sem_lactose", label: "Sem lactose" },
  { value: "alta_proteina", label: "Alta proteína" },
  { value: "baixo_calorico", label: "Baixo em calorias" },
];

export function healthTagLabel(value: string): string {
  return HEALTH_TAGS_VOCAB.find((tag) => tag.value === value)?.label ?? value;
}
