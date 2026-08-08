// FE-D07 · useAdminIngredients — GET /admin/ingredients (lista) + POST/PUT/DELETE/{id}.
// Mesmo padrão de src/hooks/useOrders.ts.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type Ingredient = components["schemas"]["Ingredient"];
export type IngredientRequest = components["schemas"]["IngredientRequest"];
type PageResponse = components["schemas"]["PageResponse"];
type IngredientPage = Omit<PageResponse, "items"> & { items?: Ingredient[] };

export type AdminIngredientsQuery = { page?: number; size?: number; sort?: string; q?: string };

function buildQueryString(query: AdminIngredientsQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  if (query.sort) params.set("sort", query.sort);
  if (query.q) params.set("q", query.q);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function adminIngredientsQueryKey(query: AdminIngredientsQuery) {
  return ["admin-ingredients", query] as const;
}

export function useAdminIngredients(query: AdminIngredientsQuery) {
  return useQuery({
    queryKey: adminIngredientsQueryKey(query),
    queryFn: () => api<IngredientPage>(`/admin/ingredients${buildQueryString(query)}`),
  });
}

export function useCreateIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: IngredientRequest) =>
      api<Ingredient>("/admin/ingredients", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ingredients"] });
    },
  });
}

export function useUpdateIngredient(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: IngredientRequest) =>
      api<Ingredient>(`/admin/ingredients/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ingredients"] });
    },
  });
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<null>(`/admin/ingredients/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ingredients"] });
    },
  });
}
