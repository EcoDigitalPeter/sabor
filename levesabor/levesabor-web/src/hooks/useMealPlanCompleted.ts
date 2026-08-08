// FE-C09 · useToggleMealPlanEntryCompleted — PATCH /me/meal-plans/entries/{id}/completed (T-04)
// Mutação otimista sobre a query "active-meal-plan" (mesma chave usada em
// app/(cliente)/plano/page.tsx), espelhando o idioma de useShoppingList.ts
// (useUpdateShoppingItem/useToggleShoppingItem): assume-se sucesso, atualiza-se o cache de
// imediato, e só um erro genuíno do servidor reverte para o snapshot anterior.
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type MealPlan = components["schemas"]["MealPlan"];
export type MealPlanEntry = components["schemas"]["MealPlanEntry"];

// Mesma chave literal usada em app/(cliente)/plano/page.tsx — o TanStack Query compara chaves
// por valor, não por referência, por isso não é preciso importar/partilhar a constante.
export const activeMealPlanQueryKey = ["active-meal-plan"] as const;

export type ToggleMealPlanEntryCompletedVars = { id: number; completed: boolean };

function setEntryCompletedRequest({ id, completed }: ToggleMealPlanEntryCompletedVars) {
  return api<MealPlanEntry>(`/me/meal-plans/entries/${id}/completed`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });
}

export function useToggleMealPlanEntryCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setEntryCompletedRequest,
    onMutate: async ({ id, completed }: ToggleMealPlanEntryCompletedVars) => {
      await queryClient.cancelQueries({ queryKey: activeMealPlanQueryKey });
      const previous = queryClient.getQueryData<MealPlan>(activeMealPlanQueryKey);

      queryClient.setQueryData<MealPlan>(activeMealPlanQueryKey, (current) => {
        if (!current?.days) return current;
        return {
          ...current,
          days: current.days.map((day) => ({
            ...day,
            entries: day.entries?.map((entry) => (entry.id === id ? { ...entry, completed } : entry)),
          })),
        };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(activeMealPlanQueryKey, context.previous);
      }
    },
  });
}
