// FE-C06 · useShoppingList — GET /me/shopping-list + PATCH /me/shopping-list/items/{id} (F1-CLI-06)
// Mutação otimista: assume-se sucesso e reflete-se de imediato no cache.
// FE-C08: falha de REDE (offline) mantém o estado otimista e enfileira o toggle para sync (lib/offline.ts);
// só um erro genuíno do SERVIDOR (envelope ApiError) reverte a UI — ver distinção em onError abaixo.
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { components } from "@/types/api";
import {
  enqueueShoppingPatch,
  flushShoppingQueue,
  getPendingShoppingSyncCount,
  onBackOnline,
  subscribeShoppingQueue,
  type FlushResult,
  type ShoppingItemPatch,
} from "@/lib/offline";

export type ShoppingList = components["schemas"]["ShoppingList"];
export type ShoppingListItem = components["schemas"]["ShoppingListItem"];

export const shoppingListQueryKey = ["shopping-list"] as const;

export function useShoppingList() {
  return useQuery({
    queryKey: shoppingListQueryKey,
    queryFn: () => api<ShoppingList>("/me/shopping-list"),
  });
}

export type ShoppingItemUpdateVars = { id: number } & ShoppingItemPatch;

function updateShoppingItemRequest({ id, ...patch }: ShoppingItemUpdateVars) {
  return api<ShoppingListItem>(`/me/shopping-list/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// FE-R01: custo "a comprar" de um item — mesma fórmula pro-rata do mock (src/mocks/fixtures.ts),
// duplicada aqui para a atualização otimista refletir de imediato, sem esperar pelo round-trip.
function remainingCost(item: ShoppingListItem): number | null {
  if (item.estimatedCostMt == null) return null;
  const quantity = item.quantity ?? 0;
  if (quantity <= 0) return item.estimatedCostMt;
  const remaining = Math.max(0, quantity - (item.haveQuantity ?? 0));
  return item.estimatedCostMt * (remaining / quantity);
}

/**
 * `fetch` rejeita com um `TypeError` quando o pedido nem chega ao servidor (offline, DNS, CORS,
 * etc.) — `lib/api.ts` só lança `ApiError` depois de receber e desembrulhar uma resposta HTTP real.
 * Portanto `!(err instanceof ApiError)` é o sinal de "falha de rede" usado em toda esta fila.
 */
function isNetworkFailure(err: unknown): boolean {
  return !(err instanceof ApiError);
}

/**
 * Mutação genérica sobre um item da lista de compras — aceita `checked` e/ou `haveQuantity` no
 * mesmo patch (FE-R01). `useToggleShoppingItem` abaixo é um wrapper fino só para `checked`, para
 * não obrigar a mexer nas chamadas existentes.
 */
export function useUpdateShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateShoppingItemRequest,
    onMutate: async ({ id, checked, haveQuantity }: ShoppingItemUpdateVars) => {
      await queryClient.cancelQueries({ queryKey: shoppingListQueryKey });
      const previous = queryClient.getQueryData<ShoppingList>(shoppingListQueryKey);

      queryClient.setQueryData<ShoppingList>(shoppingListQueryKey, (current) => {
        if (!current?.items) return current;
        const wasChecked = current.items.find((item) => item.id === id)?.checked ?? false;
        const checkedDelta = checked === undefined || checked === wasChecked ? 0 : checked ? 1 : -1;

        const items = current.items.map((item) =>
          item.id === id
            ? {
                ...item,
                ...(checked !== undefined ? { checked } : {}),
                ...(haveQuantity !== undefined ? { haveQuantity: Math.max(0, haveQuantity) } : {}),
              }
            : item,
        );

        return {
          ...current,
          checkedItems: (current.checkedItems ?? 0) + checkedDelta,
          estimatedCostMt: items.reduce((sum, item) => sum + (remainingCost(item) ?? 0), 0),
          items,
        };
      });

      return { previous };
    },
    onError: (err, { id, checked, haveQuantity }, context) => {
      if (isNetworkFailure(err)) {
        // Offline: fica tal como o utilizador ajustou ("funciona offline") e sincroniza-se depois.
        enqueueShoppingPatch(id, { checked, haveQuantity });
        return;
      }
      // Erro do servidor (chegou e foi rejeitado) — reverte a atualização otimista, como antes.
      if (context?.previous) {
        queryClient.setQueryData(shoppingListQueryKey, context.previous);
      }
    },
    onSettled: (_data, err) => {
      // Não invalidar em falha de rede: um refetch aqui reverteria o estado otimista antes de o
      // patch em fila ter oportunidade de sincronizar.
      if (err && isNetworkFailure(err)) return;
      queryClient.invalidateQueries({ queryKey: shoppingListQueryKey });
    },
  });
}

/** Wrapper fino sobre {@link useUpdateShoppingItem} para o toggle "comprado" (chamadas existentes). */
export function useToggleShoppingItem() {
  return useUpdateShoppingItem();
}

/**
 * Estado de sincronização da fila offline para T-06: nº de toggles por sincronizar + se um flush
 * está em curso neste momento. Faz flush automaticamente ao montar (fila de uma sessão anterior) e
 * sempre que o browser reportar `online`.
 */
export function useShoppingSync(): { pendingCount: number; isSyncing: boolean } {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(() => getPendingShoppingSyncCount());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => subscribeShoppingQueue((queue) => setPendingCount(queue.length)), []);

  useEffect(() => {
    async function runFlush() {
      setIsSyncing(true);
      try {
        await flushShoppingQueue(async (op): Promise<FlushResult> => {
          try {
            await updateShoppingItemRequest({ id: op.id, ...op.patch });
            return "ok";
          } catch (err) {
            return isNetworkFailure(err) ? "network-error" : "server-error";
          }
        });
      } finally {
        setIsSyncing(false);
        queryClient.invalidateQueries({ queryKey: shoppingListQueryKey });
      }
    }

    if (getPendingShoppingSyncCount() > 0) {
      void runFlush();
    }
    return onBackOnline(() => void runFlush());
  }, [queryClient]);

  return { pendingCount, isSyncing };
}
