// FE-C03 · useActiveMealPlan — GET /me/meal-plans/active. Extraído de plano/page.tsx para ser
// partilhado com /inicio (mesma queryKey, mesma cache do TanStack Query).
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@/types/api";
import { DAYS_PER_WEEK, daysInMonth, isWeekFullyCompleted } from "@/lib/planStats";

export type MealPlan = components["schemas"]["MealPlan"];

export const activeMealPlanQueryKey = ["active-meal-plan"] as const;

// FE-Y09 (ago/2026) · o backend passou a gerar o plano por semanas de 7 dias — a semana
// seguinte só nasce quando o cliente termina de marcar "Comi isto" em toda a semana actual, em
// segundo plano no servidor (pode levar alguns segundos, é uma chamada real a um modelo de IA).
// Mesmo intervalo de polling do ecrã "a gerar plano" (plano/gerar/page.tsx).
const NEXT_WEEK_POLL_INTERVAL_MS = 4000;

/** true só enquanto a última semana já devolvida está 100% concluída e o mês ainda não está
 * todo gerado — é a janela em que o backend pode estar a gerar a semana seguinte. */
function isWaitingForNextWeek(plan: MealPlan | undefined): boolean {
  if (!plan) return false;
  const days = plan.days ?? [];
  if (days.length === 0) return false;
  const totalDaysInMonth = daysInMonth(plan.monthStart ?? days[0]?.date ?? "");
  if (days.length >= totalDaysInMonth) return false;
  const lastWeekStart = (Math.ceil(days.length / DAYS_PER_WEEK) - 1) * DAYS_PER_WEEK;
  const lastWeekDays = days.slice(lastWeekStart, lastWeekStart + DAYS_PER_WEEK);
  return isWeekFullyCompleted(lastWeekDays);
}

export function useActiveMealPlan() {
  return useQuery<MealPlan>({
    queryKey: activeMealPlanQueryKey,
    queryFn: () => api<MealPlan>("/me/meal-plans/active"),
    retry: false,
    // Polling ligeiro só na janela de espera pela semana seguinte — nos restantes casos o
    // refetch normal do TanStack Query chega, sem martelar o endpoint sem necessidade.
    refetchInterval: (query) => (isWaitingForNextWeek(query.state.data) ? NEXT_WEEK_POLL_INTERVAL_MS : false),
  });
}
