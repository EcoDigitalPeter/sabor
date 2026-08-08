// F3-CLI-07 · "Encomendar rancho" — escolher loja + rever itens/quantidades/nota + confirmar.
// Mesmo padrão de máquina de fases do wizard "Pedir receita agora" (plano/pedir-agora/page.tsx):
// os 2 passos de escolha vivem dentro do Wizard genérico; a confirmação final é um ecrã à parte
// (fora do Wizard), tal como lá o resultado/erro/limite também não fazem parte dos `steps`.
//
// Sem ecrã de pagamento nem escolha de método de entrega/levantamento — decisão de produto já
// fechada (ver CLAUDE.md): a confirmação mostra apenas o contacto da loja, combinado diretamente
// com ela.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import type { components } from "@/types/api";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useActiveStores, useCreateOrder, type Order, type OrderRequest } from "@/hooks/useOrders";
import { Wizard, type WizardStep } from "@/components/ui/Wizard";
import { OptionCard } from "@/components/onboarding/OptionCard";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import styles from "./page.module.css";

type ShoppingListItem = components["schemas"]["ShoppingListItem"];

const MAX_NOTE_LENGTH = 140;

function parseQuantity(raw: string): number {
  const parsed = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export default function EncomendarPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const storesQuery = useActiveStores();
  const shoppingListQuery = useShoppingList();
  const createOrder = useCreateOrder();

  const [stepIndex, setStepIndex] = useState(0);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");
  const [itemsInitialized, setItemsInitialized] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const items: ShoppingListItem[] = useMemo(() => shoppingListQuery.data?.items ?? [], [shoppingListQuery.data]);

  // Pré-seleciona todos os itens (default sensato, "todos marcados por omissão" — F3-CLI-07) assim
  // que a lista carrega; quantidade inicial = quantidade agregada do item, editável a seguir.
  useEffect(() => {
    if (itemsInitialized || items.length === 0) return;
    const nextSelected: Record<number, boolean> = {};
    const nextQuantities: Record<number, string> = {};
    for (const item of items) {
      if (item.id === undefined) continue;
      nextSelected[item.id] = true;
      nextQuantities[item.id] = String(item.quantity ?? 0);
    }
    setSelected(nextSelected);
    setQuantities(nextQuantities);
    setItemsInitialized(true);
  }, [items, itemsInitialized]);

  function toggleItem(id: number) {
    setSelected((current) => ({ ...current, [id]: !current[id] }));
  }

  function changeQuantity(id: number, value: string) {
    setQuantities((current) => ({ ...current, [id]: value }));
  }

  const selectedItems = items.filter((item) => item.id !== undefined && selected[item.id]);

  function handleConfirmOrder() {
    if (storeId === null) return;

    const requestItems = selectedItems
      .map((item) => ({ itemId: item.id as number, quantity: parseQuantity(quantities[item.id as number] ?? "0") }))
      .filter((entry) => entry.quantity > 0);

    if (requestItems.length === 0) {
      setSubmitError("Escolhe pelo menos um item com quantidade válida.");
      return;
    }

    setSubmitError(null);
    const body: OrderRequest = { storeId, note: note.trim() || undefined, items: requestItems };
    createOrder.mutate(body, {
      onSuccess: (order) => {
        showToast("Encomenda enviada.", "success");
        setConfirmedOrder(order);
      },
      onError: (error) => {
        setSubmitError(
          error instanceof ApiError ? error.message : "Não foi possível enviar a encomenda. Tenta novamente.",
        );
      },
    });
  }

  // ── Confirmação — sem pagamento/entrega, só o contacto da loja (ver nota de topo) ────────────
  if (confirmedOrder) {
    return (
      <main className={styles.main}>
        <div className={styles.confirmPanel}>
          <h1 className={styles.title}>Encomenda enviada</h1>
          <p className={styles.confirmText}>
            A tua encomenda foi enviada para <strong>{confirmedOrder.storeName}</strong>.
          </p>
          <p className={styles.confirmText}>
            Combina diretamente com a loja o levantamento ou entrega, e o pagamento.
            {confirmedOrder.storeContact ? (
              <>
                {" "}
                Contacto: <strong>{confirmedOrder.storeContact}</strong>
              </>
            ) : null}
          </p>
          <Button type="button" variant="primary" onClick={() => router.push("/encomendas")}>
            Ver as minhas encomendas
          </Button>
        </div>
      </main>
    );
  }

  if (storesQuery.isLoading || shoppingListQuery.isLoading) {
    return (
      <main className={styles.main}>
        <Skeleton variant="text" width="55%" height="22px" className={styles.skeletonTitle} />
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            variant="rect"
            height="64px"
            borderRadius="var(--radius-card-sm)"
            className={styles.skeletonRow}
          />
        ))}
      </main>
    );
  }

  if (storesQuery.isError) {
    return (
      <main className={styles.main}>
        <ErrorState
          message={
            storesQuery.error instanceof ApiError ? storesQuery.error.message : "Não foi possível carregar as lojas."
          }
          onRetry={() => storesQuery.refetch()}
        />
      </main>
    );
  }

  if (shoppingListQuery.isError) {
    return (
      <main className={styles.main}>
        <ErrorState
          message={
            shoppingListQuery.error instanceof ApiError
              ? shoppingListQuery.error.message
              : "Não foi possível carregar a lista de compras."
          }
          onRetry={() => shoppingListQuery.refetch()}
        />
      </main>
    );
  }

  const stores = storesQuery.data?.items ?? [];

  const steps: WizardStep[] = [
    {
      id: "loja",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Escolhe a loja</h1>
          {stores.length === 0 ? (
            <EmptyState
              title="Sem lojas disponíveis"
              description="De momento não há lojas parceiras ativas para encomendas. Tenta novamente mais tarde."
            />
          ) : (
            <div className={styles.storeList}>
              {stores.map((store) => (
                <OptionCard
                  key={store.id}
                  label={store.name ?? ""}
                  description={[[store.neighborhood, store.city].filter(Boolean).join(", "), store.contact ?? null]
                    .filter(Boolean)
                    .join(" · ")}
                  selected={storeId === store.id}
                  onSelect={() => store.id !== undefined && setStoreId(store.id)}
                />
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "rever",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Rever encomenda</h1>
          <p className={styles.hint}>Desmarca o que não precisas agora e ajusta as quantidades.</p>

          {items.length === 0 ? (
            <EmptyState
              title="Sem itens na lista"
              description="A tua lista de compras ainda não tem itens para encomendar."
            />
          ) : (
            <ul className={styles.itemList}>
              {items.map((item) =>
                item.id !== undefined ? (
                  <li key={item.id} className={styles.itemRow}>
                    <Checkbox
                      label={<span className={styles.itemName}>{item.ingredientName}</span>}
                      checked={!!selected[item.id]}
                      onChange={() => toggleItem(item.id as number)}
                    />
                    <div className={styles.qtyGroup}>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        className={styles.qtyInput}
                        value={quantities[item.id] ?? ""}
                        disabled={!selected[item.id]}
                        onChange={(event) => changeQuantity(item.id as number, event.target.value)}
                        aria-label={`Quantidade de ${item.ingredientName ?? "item"}`}
                      />
                      <span className={styles.unit}>{item.unit}</span>
                    </div>
                  </li>
                ) : null,
              )}
            </ul>
          )}

          <FormField
            label="Nota para a loja (opcional)"
            htmlFor="encomenda-nota"
            hint={`${note.length}/${MAX_NOTE_LENGTH} caracteres`}
          >
            <Input
              id="encomenda-nota"
              type="text"
              value={note}
              maxLength={MAX_NOTE_LENGTH}
              placeholder="ex.: prefiro levantar ao fim da tarde"
              onChange={(event) => setNote(event.target.value)}
            />
          </FormField>

          {submitError ? (
            <p role="alert" className={styles.submitError}>
              {submitError}
            </p>
          ) : null}
        </div>
      ),
    },
  ];

  const isLastStep = stepIndex === steps.length - 1;
  const canGoNext = isLastStep ? selectedItems.length > 0 && !createOrder.isPending : storeId !== null;

  function handleNext() {
    if (isLastStep) {
      handleConfirmOrder();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function handleBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <main className={styles.main}>
      <Wizard
        steps={steps}
        currentStepIndex={stepIndex}
        onNext={handleNext}
        onBack={handleBack}
        canGoNext={canGoNext}
        nextLabel={isLastStep ? (createOrder.isPending ? "A enviar…" : "Confirmar encomenda") : "Continuar"}
      />
    </main>
  );
}
