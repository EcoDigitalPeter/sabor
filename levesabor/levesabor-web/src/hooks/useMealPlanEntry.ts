// FE-C05 · Hook colocado para T-05 — chama diretamente GET /me/meal-plans/entries/{entryId}.
// Decisão documentada em docs/plano/01-functional-plan.md (F1-CLI-04, "Tarefas — Backend"): o
// endpoint embebido no plano ativo é a via normal, este é o fallback de deep-link — usado aqui
// de propósito para este ecrã não ter dependência de ordem de carregamento com a query do
// dashboard (FE-C03, "active-meal-plan").
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type MealPlanEntry = components["schemas"]["MealPlanEntry"];

export function mealPlanEntryQueryKey(entryId: string) {
  return ["meal-plan-entry", entryId] as const;
}

export function useMealPlanEntry(entryId: string) {
  return useQuery({
    queryKey: mealPlanEntryQueryKey(entryId),
    queryFn: () => api<MealPlanEntry>(`/me/meal-plans/entries/${entryId}`),
    enabled: entryId.length > 0,
    // 404 (LSA005_NOT_FOUND) é um resultado válido e estável para esta tela ("Refeição não
    // encontrada"), não uma falha transitória — não vale a pena repetir automaticamente.
    retry: false,
  });
}
