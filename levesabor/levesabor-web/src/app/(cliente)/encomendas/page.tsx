// F3-CLI-07 · "Minhas encomendas" — lista (GET /me/orders) + detalhe em BottomSheet + cancelar
// (PATCH /me/orders/{id}/cancel, só quando PENDENTE/ACEITE) com o mesmo padrão de confirmação
// dupla-clique usado noutras ações destrutivas (ConfirmDialog, ver /plano "Gerar novo plano").
"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { useOrders, useCancelOrder, type Order, type OrderStatus } from "@/hooks/useOrders";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import styles from "./page.module.css";

const CANCELABLE_STATUSES: OrderStatus[] = ["PENDENTE", "ACEITE"];

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function itemCountLabel(order: Order): string {
  const count = order.items?.length ?? 0;
  return `${count} ${count === 1 ? "item" : "itens"}`;
}

export default function EncomendasPage() {
  const { data, isLoading, isError, error, refetch } = useOrders();
  const cancelMutation = useCancelOrder();
  const { showToast } = useToast();

  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const orders = data?.items ?? [];
  const openOrder = orders.find((order) => order.id === openOrderId) ?? null;

  function closeSheet() {
    setOpenOrderId(null);
    setConfirmCancelOpen(false);
  }

  function handleCancel() {
    if (openOrderId === null) return;
    cancelMutation.mutate(openOrderId, {
      onSuccess: () => {
        showToast("Encomenda cancelada.", "success");
        setConfirmCancelOpen(false);
        setOpenOrderId(null);
      },
      onError: (err) => {
        showToast(err instanceof ApiError ? err.message : "Não foi possível cancelar a encomenda.", "error");
        setConfirmCancelOpen(false);
      },
    });
  }

  if (isLoading) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>Minhas encomendas</h1>
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            variant="rect"
            height="80px"
            borderRadius="var(--radius-card)"
            className={styles.skeletonRow}
          />
        ))}
      </main>
    );
  }

  if (isError) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>Minhas encomendas</h1>
        <ErrorState
          message={error instanceof ApiError ? error.message : "Não foi possível carregar as encomendas."}
          onRetry={() => refetch()}
        />
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Minhas encomendas</h1>

      {orders.length === 0 ? (
        <EmptyState
          title="Ainda sem encomendas"
          description="Quando encomendares o teu rancho a uma loja parceira, aparece aqui."
          action={
            <Link href="/compras" className={styles.emptyCta}>
              Ir para a lista de compras
            </Link>
          }
        />
      ) : (
        <ul className={styles.orderList}>
          {orders.map((order) => (
            <li key={order.id}>
              <button type="button" className={styles.orderRow} onClick={() => setOpenOrderId(order.id ?? null)}>
                <span className={styles.orderRowMain}>
                  <span className={styles.orderStore}>{order.storeName}</span>
                  <span className={styles.orderMeta}>
                    {formatDate(order.createdAt)} · {itemCountLabel(order)}
                  </span>
                </span>
                {order.status ? <StatusBadge status={order.status} /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <BottomSheet open={openOrder !== null} onClose={closeSheet}>
        {openOrder ? (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <h2 className={styles.detailTitle}>{openOrder.storeName}</h2>
              {openOrder.status ? <StatusBadge status={openOrder.status} /> : null}
            </div>
            <p className={styles.detailMeta}>{formatDate(openOrder.createdAt)}</p>

            <ul className={styles.detailItemList}>
              {(openOrder.items ?? []).map((item, index) => (
                <li key={index} className={styles.detailItemRow}>
                  <span>{item.ingredientName}</span>
                  <span className={styles.detailItemQty}>
                    {item.quantity} {item.unit}
                  </span>
                </li>
              ))}
            </ul>

            {openOrder.note ? <p className={styles.detailNote}>Nota: {openOrder.note}</p> : null}

            {openOrder.storeContact ? (
              <p className={styles.detailContact}>Contacto da loja: {openOrder.storeContact}</p>
            ) : null}

            {openOrder.status && CANCELABLE_STATUSES.includes(openOrder.status) ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmCancelOpen(true)}
                disabled={cancelMutation.isPending}
              >
                Cancelar encomenda
              </Button>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Cancelar encomenda"
        message="Tens a certeza que queres cancelar esta encomenda? Esta ação não pode ser desfeita."
        confirmLabel="Cancelar encomenda"
        cancelLabel="Voltar"
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancelOpen(false)}
      />
    </main>
  );
}
