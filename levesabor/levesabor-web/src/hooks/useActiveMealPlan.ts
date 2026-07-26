// FE-C03 · useActiveMealPlan — GET /me/meal-plans/active. Extraído de plano/page.tsx para ser
// partilhado com /inicio (mesma queryKey, mesma cache do TanStack Query).
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type MealPlan = components["schemas"]["MealPlan"];

export const activeMealPlanQueryKey = ["active-meal-plan"] as const;

export function useActiveMealPlan() {
  return useQuery<MealPlan>({
    queryKey: activeMealPlanQueryKey,
    queryFn: () => api<MealPlan>("/me/meal-plans/active"),
    retry: false,
  });
}
