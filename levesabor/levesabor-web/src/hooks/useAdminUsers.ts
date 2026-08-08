// FE-D02 · useAdminUsers — GET /admin/users (lista) + GET/{id} + GET/{id}/health-profile +
// PATCH/{id}/status + POST (criar admin). Mesmo padrão de src/hooks/useOrders.ts.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type User = components["schemas"]["User"];
export type Profile = components["schemas"]["Profile"];
// Ver nota em useOrders.ts sobre a armadilha de interseção de PageResponse.items (unknown[]).
type PageResponse = components["schemas"]["PageResponse"];
type UserPage = Omit<PageResponse, "items"> & { items?: User[] };

export type AdminUsersQuery = { page?: number; size?: number; sort?: string; q?: string };

function buildQueryString(query: AdminUsersQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  if (query.sort) params.set("sort", query.sort);
  if (query.q) params.set("q", query.q);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function adminUsersQueryKey(query: AdminUsersQuery) {
  return ["admin-users", query] as const;
}

export function useAdminUsers(query: AdminUsersQuery) {
  return useQuery({
    queryKey: adminUsersQueryKey(query),
    queryFn: () => api<UserPage>(`/admin/users${buildQueryString(query)}`),
  });
}

export function useAdminUser(id: number) {
  return useQuery({
    queryKey: ["admin-user", id] as const,
    queryFn: () => api<User>(`/admin/users/${id}`),
    enabled: Number.isFinite(id),
  });
}

// Só disparado quando o admin clica explicitamente em "Ver perfil de saúde" (F2-ADM-01: reveal
// auditado) — por isso `enabled` fica sempre a cargo de quem chama, nunca true por omissão.
export function useAdminUserHealthProfile(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-user-health-profile", id] as const,
    queryFn: () => api<Profile>(`/admin/users/${id}/health-profile`),
    enabled: enabled && Number.isFinite(id),
  });
}

export function useSetUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "ACTIVE" | "SUSPENDED" }) =>
      api<User>(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user", variables.id] });
    },
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; email: string }) =>
      api<User>("/admin/users", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
