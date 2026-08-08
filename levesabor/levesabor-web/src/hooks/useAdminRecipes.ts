// FE-D06 · useAdminRecipes — GET /admin/recipes (lista) + GET/POST/PUT/DELETE/{id} + PATCH status
// + GET/{id}/swap-reasons (FE-Q06, motivos de troca recentes — endpoint só de mock, sem schema
// OpenAPI dedicado, ver nota em src/mocks/fixtures.ts getRecentSwapReasons). Mesmo padrão de
// src/hooks/useOrders.ts.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type Recipe = components["schemas"]["Recipe"];
export type RecipeRequest = components["schemas"]["RecipeRequest"];
export type RecipeStatus = NonNullable<Recipe["status"]>;
type PageResponse = components["schemas"]["PageResponse"];
type RecipePage = Omit<PageResponse, "items"> & { items?: Recipe[] };
export type RecentSwapReason = { reason: string; at: string };

export type AdminRecipesQuery = { page?: number; size?: number; sort?: string; q?: string };

function buildQueryString(query: AdminRecipesQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  if (query.sort) params.set("sort", query.sort);
  if (query.q) params.set("q", query.q);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function adminRecipesQueryKey(query: AdminRecipesQuery) {
  return ["admin-recipes", query] as const;
}

export function useAdminRecipes(query: AdminRecipesQuery) {
  return useQuery({
    queryKey: adminRecipesQueryKey(query),
    queryFn: () => api<RecipePage>(`/admin/recipes${buildQueryString(query)}`),
  });
}

export function useAdminRecipe(id: number) {
  return useQuery({
    queryKey: ["admin-recipe", id] as const,
    queryFn: () => api<Recipe>(`/admin/recipes/${id}`),
    enabled: Number.isFinite(id),
  });
}

export function useRecentSwapReasons(recipeId: number) {
  return useQuery({
    queryKey: ["admin-recipe-swap-reasons", recipeId] as const,
    queryFn: () => api<RecentSwapReason[]>(`/admin/recipes/${recipeId}/swap-reasons`),
    enabled: Number.isFinite(recipeId),
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RecipeRequest) =>
      api<Recipe>("/admin/recipes", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
    },
  });
}

export function useUpdateRecipe(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RecipeRequest) =>
      api<Recipe>(`/admin/recipes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-recipe", id] });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<null>(`/admin/recipes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
    },
  });
}

export function useSetRecipeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: RecipeStatus }) =>
      api<Recipe>(`/admin/recipes/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-recipe", variables.id] });
    },
  });
}
