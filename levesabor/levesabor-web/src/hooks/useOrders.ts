// FE-C09 · useOrders — GET /stores + GET/POST /me/orders + PATCH /me/orders/{id}/cancel (F3-CLI-07)
// "Encomendar rancho" — pedir itens da lista de compras a uma loja parceira. Sem pagamento nem
// escolha de método de entrega/levantamento no frontend: isso é combinado diretamente com a loja
// (contacto devolvido no próprio Order), por decisão de produto já fechada.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type Store = components["schemas"]["Store"];
export type Order = components["schemas"]["Order"];
export type OrderRequest = components["schemas"]["OrderRequest"];
export type OrderStatus = components["schemas"]["OrderStatus"];

// NOTA: não usar `NonNullable<...PageEnvelope["data"]>` diretamente — esse tipo é
// `PageResponse & { items?: Store[] }`, e como `PageResponse.items` já é `unknown[]`, o
// TypeScript resolve a interseção da propriedade `items` para `unknown[] & Store[]`, cujo
// `.map()` acaba a inferir o parâmetro como `unknown` (armadilha conhecida de interseção com
// propriedade em comum). `Omit<PageResponse, "items">` remove o `items: unknown[]` conflituoso
// antes de voltar a acrescentar a versão tipada.
type PageResponse = components["schemas"]["PageResponse"];
type StorePage = Omit<PageResponse, "items"> & { items?: Store[] };
type OrderPage = Omit<PageResponse, "items"> & { items?: Order[] };

export const storesQueryKey = ["stores"] as const;
export const ordersQueryKey = ["orders"] as const;

/** Lojas parceiras ativas — GET /stores (já filtrado a ACTIVE pelo mock). */
export function useActiveStores() {
  return useQuery({
    queryKey: storesQueryKey,
    queryFn: () => api<StorePage>("/stores"),
  });
}

/** As encomendas do cliente, mais recentes primeiro — GET /me/orders. */
export function useOrders() {
  return useQuery({
    queryKey: ordersQueryKey,
    queryFn: () => api<OrderPage>("/me/orders"),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: OrderRequest) => api<Order>("/me/orders", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKey });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => api<Order>(`/me/orders/${orderId}/cancel`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKey });
    },
  });
}
