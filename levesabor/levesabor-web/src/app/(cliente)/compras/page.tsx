// FE-C06 · T-06 Lista de compras — grupos por categoria (ícones P-06), checkboxes otimistas (F1-CLI-06)
"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import {
  useShoppingList,
  useShoppingSync,
  useUpdateShoppingItem,
  type ShoppingListItem,
} from "@/hooks/useShoppingList";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { ShoppingGroup } from "@/components/plan/ShoppingGroup";
import { ShoppingSummary } from "@/components/plan/ShoppingSummary";
import type { ShoppingCategory } from "@/components/ui/CategoryIcon";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { BrandIllustration } from "@/components/ui/BrandIllustration";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { Button } from "@/components/ui/Button";
import { AddItemSheet } from "./AddItemSheet";
import styles from "./page.module.css";

// Ordem fixa das categorias na lista (docs/plano/02-ui-ux-plan.md §3 T-06)
const CATEGORY_ORDER: ShoppingCategory[] = [
  "CEREAIS_E_FARINHAS",
  "PROTEINA",
  "VEGETAIS_E_FOLHAS",
  "LEGUMINOSAS",
  "TEMPEROS_E_OLEOS",
  "OUTROS",
];

function groupByCategory(items: ShoppingListItem[]): Partial<Record<ShoppingCategory, ShoppingListItem[]>> {
  const groups: Partial<Record<ShoppingCategory, ShoppingListItem[]>> = {};
  for (const item of items) {
    const category: ShoppingCategory = item.category ?? "OUTROS";
    const bucket = groups[category] ?? [];
    bucket.push(item);
    groups[category] = bucket;
  }
  return groups;
}

export default function ComprasPage() {
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, error, refetch } = useShoppingList();
  const updateMutation = useUpdateShoppingItem();
  const { pendingCount, isSyncing } = useShoppingSync();
  // FE-W04/F1-CLI-06B: bottom-sheet "+ Adicionar item" — visível tanto com a lista vazia como
  // carregada (ver JSX abaixo); a invalidação de cache no hook trata de atualizar a lista.
  const [addItemOpen, setAddItemOpen] = useState(false);

  function handleToggle(id: number, checked: boolean) {
    updateMutation.mutate({ id, checked });
  }

  function handleHaveQuantity(id: number, haveQuantity: number) {
    updateMutation.mutate({ id, haveQuantity });
  }

  if (isLoading) {
    return (
      <main className={styles.main}>
        <Skeleton variant="text" width="55%" height="20px" className={styles.skeletonSubtitle} />
        <Skeleton variant="text" width="35%" height="16px" className={styles.skeletonMeta} />
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            variant="rect"
            height="132px"
            borderRadius="var(--radius-card)"
            className={styles.skeletonGroup}
          />
        ))}
      </main>
    );
  }

  if (isError) {
    if (error instanceof ApiError && error.code === "LSA005_NOT_FOUND") {
      return (
        <main className={styles.main}>
          <EmptyState
            illustration={<BrandIllustration variant="empty-shopping" />}
            title="Ainda sem lista de compras"
            description="Gera o teu plano da semana para veres aqui o rancho todo, já organizado por categoria."
            action={
              <Link href="/plano" className={styles.primaryPillLink}>
                Ir para o meu plano
              </Link>
            }
          />
        </main>
      );
    }

    return (
      <main className={styles.main}>
        <ErrorState
          message={error instanceof ApiError ? error.message : "Não foi possível carregar a lista de compras."}
          onRetry={() => refetch()}
        />
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const totalItems = data.totalItems ?? data.items?.length ?? 0;
  const checkedItems = data.checkedItems ?? 0;
  const groups = groupByCategory(data.items ?? []);
  const hasAnyItem = (data.items?.length ?? 0) > 0;
  // FE-Y07 · "antes" = custo cheio de cada item (sem descontar "tenho em casa"); "depois" == o
  // estimatedCostMt já descontado que o backend/mock devolve (ver remainingCost em useShoppingList).
  const costBeforeMt = (data.items ?? []).reduce((sum, item) => sum + (item.estimatedCostMt ?? 0), 0);
  const costAfterMt = data.estimatedCostMt ?? costBeforeMt;

  return (
    <main className={styles.main}>
      {!isOnline ? (
        <div className={styles.offlineBannerWrap}>
          <OfflineBanner message="Estás offline — a mostrar a última lista guardada." />
        </div>
      ) : null}
      <h1 className={styles.title}>Lista de compras</h1>
      <p className={styles.subtitle}>
        Rancho do mês inteiro. Ao encomendar, escolhe só o que precisas agora.
      </p>

      {/* FE-Y07 (feedback do cliente, ago/2026): resumo com contadores ANTES dos botões de acção
          — "fica muito mais fácil perceber a situação". Substitui o antigo .metaRow (que vinha
          depois) e a mensagem solta de "rancho todo marcado" (o resumo já cobre esse estado). */}
      {hasAnyItem ? (
        <ShoppingSummary
          totalItems={totalItems}
          checkedItems={checkedItems}
          costBeforeMt={costBeforeMt}
          costAfterMt={costAfterMt}
          costIsPartial={data.costIsPartial ?? false}
        />
      ) : null}

      {/* FE-C08 · T-06 estados "offline (badge 'por sincronizar')" e "syncing" — toggles feitos
          offline ficam na fila local (lib/offline.ts) e sincronizam ao voltar a rede. */}
      {isSyncing ? (
        <span className={[styles.syncBadge, styles.syncBadgeSyncing, styles.syncBadgeStandalone].join(" ")}>
          A sincronizar…
        </span>
      ) : pendingCount > 0 ? (
        <span className={[styles.syncBadge, styles.syncBadgePending, styles.syncBadgeStandalone].join(" ")}>
          {pendingCount} por sincronizar
        </span>
      ) : null}

      <div className={styles.orderLinksRow}>
        <Link href="/encomendas" className={styles.ordersLink}>
          Minhas encomendas
        </Link>
        <div className={styles.headerActions}>
          <Button type="button" variant="secondary" size="sm" onClick={() => setAddItemOpen(true)}>
            + Adicionar item
          </Button>
          {hasAnyItem ? (
            <Link href="/compras/encomendar" className={styles.orderCta}>
              Encomendar rancho
            </Link>
          ) : null}
        </div>
      </div>

      <AddItemSheet open={addItemOpen} onClose={() => setAddItemOpen(false)} />

      {!hasAnyItem ? (
        <EmptyState
          illustration={<BrandIllustration variant="empty-shopping" />}
          title="Ainda sem lista de compras"
          description="Gera o teu plano da semana para veres aqui o rancho todo, já organizado por categoria."
          action={
            <Link href="/plano" className={styles.primaryPillLink}>
              Ir para o meu plano
            </Link>
          }
        />
      ) : (
        <div className={styles.groupList}>
          {CATEGORY_ORDER.filter((category) => (groups[category]?.length ?? 0) > 0).map((category) => (
            <ShoppingGroup
              key={category}
              category={category}
              items={groups[category] ?? []}
              onToggleItem={handleToggle}
              onChangeHaveQuantity={handleHaveQuantity}
            />
          ))}
        </div>
      )}
    </main>
  );
}
