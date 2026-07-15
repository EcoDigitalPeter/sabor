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
  enqueueShoppingToggle,
  flushShoppingQueue,
  getPendingShoppingSyncCount,
  onBackOnline,
  subscribeShoppingQueue,
  type FlushResult,
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

type ToggleShoppingItemVars = {
  id: number;
  checked: boolean;
};

function toggleShoppingItemRequest({ id, checked }: ToggleShoppingItemVars) {
  return api<ShoppingListItem>(`/me/shopping-list/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ checked }),
  });
}

/**
 * `fetch` rejeita com um `TypeError` quando o pedido nem chega ao servidor (offline, DNS, CORS,
 * etc.) — `lib/api.ts` só lança `ApiError` depois de receber e desembrulhar uma resposta HTTP real.
 * Portanto `!(err instanceof ApiError)` é o sinal de "falha de rede" usado em toda esta fila.
 */
function isNetworkFailure(err: unknown): boolean {
  return !(err instanceof ApiError);
}

export function useToggleShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleShoppingItemRequest,
    onMutate: async ({ id, checked }: ToggleShoppingItemVars) => {
      await queryClient.cancelQueries({ queryKey: shoppingListQueryKey });
      const previous = queryClient.getQueryData<ShoppingList>(shoppingListQueryKey);

      queryClient.setQueryData<ShoppingList>(shoppingListQueryKey, (current) => {
        if (!current?.items) return current;
        const wasChecked = current.items.find((item) => item.id === id)?.checked ?? false;
        const delta = checked === wasChecked ? 0 : checked ? 1 : -1;
        return {
          ...current,
          checkedItems: (current.checkedItems ?? 0) + delta,
          items: current.items.map((item) => (item.id === id ? { ...item, checked } : item)),
        };
      });

      return { previous };
    },
    onError: (err, { id, checked }, context) => {
      if (isNetworkFailure(err)) {
        // Offline: fica tal como o utilizador tocou ("funciona offline") e sincroniza-se depois.
        enqueueShoppingToggle(id, checked);
        return;
      }
      // Erro do servidor (chegou e foi rejeitado) — reverte a atualização otimista, como antes.
      if (context?.previous) {
        queryClient.setQueryData(shoppingListQueryKey, context.previous);
      }
    },
    onSettled: (_data, err) => {
      // Não invalidar em falha de rede: um refetch aqui reverteria o estado otimista antes de o
      // toggle em fila ter oportunidade de sincronizar.
      if (err && isNetworkFailure(err)) return;
      queryClient.invalidateQueries({ queryKey: shoppingListQueryKey });
    },
  });
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
            await toggleShoppingItemRequest(op);
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
