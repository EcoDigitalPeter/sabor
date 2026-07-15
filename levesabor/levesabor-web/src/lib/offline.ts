// FE-C08 · Offline/PWA — fila local de toggles da lista de compras com sync best-effort
// Regras: docs/plano/01-functional-plan.md (F1-CLI-03/06) e 02-ui-ux-plan.md §5
//
// Módulo agnóstico de framework (sem imports de React) — persiste operações de toggle da lista de
// compras em localStorage enquanto o pedido PATCH não chega ao servidor (offline ou falha de rede),
// e permite repô-las quando a rede volta. A wiring com React/TanStack Query vive em
// src/hooks/useShoppingList.ts, que injeta a função que efetivamente chama a API.

const STORAGE_KEY = "levesabor:offline:shopping-toggle-queue";

export type QueuedToggle = {
  id: number;
  checked: boolean;
  /** epoch ms de quando foi colocado em fila — só para depuração/ordenação, sem TTL. */
  queuedAt: number;
};

export type FlushResult = "ok" | "network-error" | "server-error";

type QueueListener = (queue: QueuedToggle[]) => void;

const listeners = new Set<QueueListener>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readQueue(): QueuedToggle[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedToggle[]) : [];
  } catch {
    // JSON corrompido ou localStorage indisponível — trata como fila vazia.
    return [];
  }
}

function writeQueue(queue: QueuedToggle[]): void {
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // Quota excedida ou modo privado sem storage — falha silenciosa; a UI já refletiu o estado
      // otimista, só perdemos a garantia de sync entre recarregamentos da página.
    }
  }
  for (const listener of listeners) listener(queue);
}

/**
 * Regista (ou substitui) uma operação de toggle pendente para um item. Se o utilizador voltar a
 * tocar no mesmo item antes de sincronizar, só a última intenção fica em fila.
 */
export function enqueueShoppingToggle(id: number, checked: boolean): void {
  const queue = readQueue().filter((op) => op.id !== id);
  queue.push({ id, checked, queuedAt: Date.now() });
  writeQueue(queue);
}

/** Remove uma operação da fila (tipicamente após sincronizar com sucesso). */
export function dequeueShoppingToggle(id: number): void {
  const queue = readQueue().filter((op) => op.id !== id);
  writeQueue(queue);
}

/** Lê as operações atualmente em fila (ordem de enfileiramento). */
export function getQueuedShoppingToggles(): QueuedToggle[] {
  return readQueue();
}

/** Nº de toggles por sincronizar — alimenta o badge "por sincronizar" (T-06). */
export function getPendingShoppingSyncCount(): number {
  return readQueue().length;
}

/** Subscreve alterações à fila (ex.: um hook React a espelhar em estado local). */
export function subscribeShoppingQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Repõe as operações em fila contra a API real, pela ordem em que foram enfileiradas.
 *
 * `syncOne` é injetado pelo chamador (o hook, que conhece `lib/api.ts`) para este módulo se manter
 * agnóstico de framework/transporte. Comportamento por resultado:
 * - "ok": remove da fila e continua para a próxima.
 * - "network-error": ainda sem rede (ou caiu outra vez a meio) — pára já; tenta tudo de novo no
 *   próximo evento `online` ou na próxima chamada a `flush`.
 * - "server-error": o pedido chegou ao servidor e foi rejeitado — não há reconciliação automática
 *   possível, por isso remove da fila e continua (evita ficar preso a repetir um pedido inválido).
 */
export async function flushShoppingQueue(syncOne: (op: QueuedToggle) => Promise<FlushResult>): Promise<void> {
  const queue = readQueue();
  for (const op of queue) {
    const result = await syncOne(op);
    if (result === "network-error") return;
    dequeueShoppingToggle(op.id);
  }
}

/**
 * Liga um callback ao evento `online` do browser. Devolve função de remoção do listener (para usar
 * no cleanup de um `useEffect`). Não faz nada em SSR/build (sem `window`).
 */
export function onBackOnline(callback: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("online", callback);
  return () => window.removeEventListener("online", callback);
}
