// FE-D03 · useAdminStores — GET /admin/stores (lista) + GET/POST/PUT/DELETE/{id} + PATCH status.
// Mesmo padrão de src/hooks/useOrders.ts.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type Store = components["schemas"]["Store"];
export type StoreRequest = components["schemas"]["StoreRequest"];
type PageResponse = components["schemas"]["PageResponse"];
type StorePage = Omit<PageResponse, "items"> & { items?: Store[] };

export type AdminStoresQuery = { page?: number; size?: number; sort?: string; q?: string };

function buildQueryString(query: AdminStoresQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  if (query.sort) params.set("sort", query.sort);
  if (query.q) params.set("q", query.q);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function adminStoresQueryKey(query: AdminStoresQuery) {
  return ["admin-stores", query] as const;
}

export function useAdminStores(query: AdminStoresQuery) {
  return useQuery({
    queryKey: adminStoresQueryKey(query),
    queryFn: () => api<StorePage>(`/admin/stores${buildQueryString(query)}`),
  });
}

export function useAdminStore(id: number) {
  return useQuery({
    queryKey: ["admin-store", id] as const,
    queryFn: () => api<Store>(`/admin/stores/${id}`),
    enabled: Number.isFinite(id),
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StoreRequest) => api<Store>("/admin/stores", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
    },
  });
}

export function useUpdateStore(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StoreRequest) =>
      api<Store>(`/admin/stores/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin-store", id] });
    },
  });
}

export function useSetStoreStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "ACTIVE" | "SUSPENDED" }) =>
      api<Store>(`/admin/stores/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin-store", variables.id] });
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<null>(`/admin/stores/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
    },
  });
}
