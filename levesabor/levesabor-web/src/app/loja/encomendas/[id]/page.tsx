// FE-L04 · T-27 Detalhe de encomenda da loja — cartão do cliente, itens, transição de estado
// válida (F3-LOJ-03). Sem pagamento/entrega no sistema — decisão de âmbito, não omissão.
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useLojaOrder, useSetLojaOrderStatus, type OrderStatus } from "@/hooks/useLojaOrders";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import styles from "./page.module.css";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Transições válidas + rótulo do botão — mesma tabela de src/mocks/fixtures.ts
// (VALID_LOJA_TRANSITIONS); mostradas só para o estado atual, o resto nem aparece.
const FORWARD_TRANSITIONS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }[]>> = {
  PENDENTE: [{ next: "ACEITE", label: "Aceitar" }],
  ACEITE: [{ next: "EM_PREPARACAO", label: "Marcar em preparação" }],
  EM_PREPARACAO: [{ next: "PRONTA", label: "Marcar pronta" }],
  PRONTA: [{ next: "CONCLUIDA", label: "Concluir" }],
};
const REFUSABLE_STATUSES: OrderStatus[] = ["PENDENTE", "ACEITE"];

export default function EncomendaDetalhePage({ params }: { params: { id: string } }) {
  const orderId = Number(params.id);
  const { showToast } = useToast();

  const { data: order, isLoading, isError, refetch } = useLojaOrder(orderId);
  const setStatus = useSetLojaOrderStatus();

  const [refuseDialogOpen, setRefuseDialogOpen] = useState(false);

  function handleTransition(next: OrderStatus) {
    setStatus.mutate(
      { id: orderId, status: next },
      {
        onSuccess: () => {
          showToast("Estado da encomenda atualizado.");
          setRefuseDialogOpen(false);
        },
        onError: (error) => {
          showToast(error instanceof ApiError ? error.message : "Não foi possível atualizar o estado.", "error");
          setRefuseDialogOpen(false);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonBlock}>
          <Skeleton variant="text" width="40%" height={28} />
          <Skeleton variant="rect" height={220} />
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className={styles.page}>
        <Link href="/loja/encomendas" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar às encomendas
        </Link>
        <ErrorState message="Não foi possível carregar esta encomenda." onRetry={() => refetch()} />
      </div>
    );
  }

  const forwardOptions = order.status ? FORWARD_TRANSITIONS[order.status] ?? [] : [];
  const canRefuse = !!order.status && REFUSABLE_STATUSES.includes(order.status);

  return (
    <div className={styles.page}>
      <Link href="/loja/encomendas" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar às encomendas
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>Encomenda #{order.id}</h1>
        {order.status ? <StatusBadge status={order.status} /> : null}
      </header>

      <Card>
        <h2 className={styles.sectionTitle}>Cliente</h2>
        <p className={styles.customerName}>{order.customerName ?? "—"}</p>
        {order.customerContact ? <p className={styles.customerContact}>Contacto: {order.customerContact}</p> : null}
        {order.note ? <p className={styles.note}>Nota: {order.note}</p> : null}
        <p className={styles.meta}>{formatDate(order.createdAt)}</p>
      </Card>

      <Card>
        <h2 className={styles.sectionTitle}>Itens</h2>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th>Item</th>
              <th className={styles.alignRight}>Quantidade</th>
              <th className={styles.alignRight}>Preço</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((item, index) => (
              <tr key={index}>
                <td>{item.ingredientName}</td>
                <td className={styles.alignRight}>
                  {item.quantity} {item.unit}
                </td>
                <td className={styles.alignRight}>{item.priceMt != null ? `${item.priceMt.toFixed(2)} MT` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {forwardOptions.length > 0 || canRefuse ? (
        <Card className={styles.actionsCard}>
          <h2 className={styles.sectionTitle}>Avançar estado</h2>
          <div className={styles.actionsRow}>
            {forwardOptions.map(({ next, label }) => (
              <Button
                key={next}
                type="button"
                variant="primary"
                loading={setStatus.isPending}
                disabled={setStatus.isPending}
                onClick={() => handleTransition(next)}
              >
                {label}
              </Button>
            ))}
            {canRefuse ? (
              <Button
                type="button"
                variant="secondary"
                disabled={setStatus.isPending}
                onClick={() => setRefuseDialogOpen(true)}
              >
                Recusar
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      <ConfirmDialog
        open={refuseDialogOpen}
        title="Recusar encomenda"
        message="Tens a certeza que queres recusar esta encomenda? Esta ação não pode ser desfeita."
        confirmLabel="Recusar"
        onConfirm={() => handleTransition("RECUSADA")}
        onCancel={() => setRefuseDialogOpen(false)}
      />
    </div>
  );
}
