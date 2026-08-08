// FE-L04 · useLojaOrders — GET /loja/orders (lista) + GET/{id} + PATCH {id}/status.
// Mesmo padrão de src/hooks/useOrders.ts.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type Order = components["schemas"]["Order"];
export type OrderStatus = components["schemas"]["OrderStatus"];
type PageResponse = components["schemas"]["PageResponse"];
type OrderPage = Omit<PageResponse, "items"> & { items?: Order[] };

export type LojaOrdersQuery = { page?: number; size?: number };

function buildQueryString(query: LojaOrdersQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function lojaOrdersQueryKey(query: LojaOrdersQuery) {
  return ["loja-orders", query] as const;
}

export function useLojaOrders(query: LojaOrdersQuery = {}) {
  return useQuery({
    queryKey: lojaOrdersQueryKey(query),
    queryFn: () => api<OrderPage>(`/loja/orders${buildQueryString(query)}`),
  });
}

export function useLojaOrder(id: number) {
  return useQuery({
    queryKey: ["loja-order", id] as const,
    queryFn: () => api<Order>(`/loja/orders/${id}`),
    enabled: Number.isFinite(id),
  });
}

export function useSetLojaOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api<Order>(`/loja/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loja-orders"] });
      queryClient.invalidateQueries({ queryKey: ["loja-order", variables.id] });
    },
  });
}
