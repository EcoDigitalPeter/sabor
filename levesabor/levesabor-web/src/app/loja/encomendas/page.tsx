// FE-L04 · T-26 Encomendas da loja — lista com filtro por estado (F3-LOJ-03)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLojaOrders, type Order } from "@/hooks/useLojaOrders";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import styles from "./page.module.css";

const PAGE_SIZE = 20;

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
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, isError, refetch } = useLojaOrders({ page, size: PAGE_SIZE });

  // Mesma limitação já documentada em admin/utilizadores/page.tsx: o filtro de estado é
  // aplicado aqui, do lado do cliente, sobre os itens já devolvidos nesta página.
  const filteredItems = (data?.items ?? []).filter((order) => !statusFilter || order.status === statusFilter);

  const tableData = data
    ? {
        items: filteredItems,
        page: data.page ?? 0,
        size: data.size ?? PAGE_SIZE,
        totalItems: data.totalItems ?? 0,
        totalPages: data.totalPages ?? 1,
      }
    : undefined;

  const columns: DataTableColumn<Order>[] = [
    { key: "customerName", header: "Cliente", render: (row) => row.customerName ?? "—" },
    { key: "createdAt", header: "Data", render: (row) => formatDate(row.createdAt) },
    { key: "items", header: "Nº itens", render: (row) => itemCountLabel(row) },
    {
      key: "status",
      header: "Estado",
      render: (row) => (row.status ? <StatusBadge status={row.status} /> : "—"),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Encomendas</h1>
      </header>

      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyState={{
          title: statusFilter ? "Nenhuma encomenda encontrada" : "Ainda sem encomendas",
          description: statusFilter ? "Tenta outro filtro." : "Quando um cliente encomendar, aparece aqui.",
        }}
        getRowId={(row) => row.id ?? ""}
        filters={
          <Select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
              { value: "", label: "Todos os estados" },
              { value: "PENDENTE", label: "Pendente" },
              { value: "ACEITE", label: "Aceite" },
              { value: "EM_PREPARACAO", label: "Em preparação" },
              { value: "PRONTA", label: "Pronta" },
              { value: "CONCLUIDA", label: "Concluída" },
              { value: "RECUSADA", label: "Recusada" },
              { value: "CANCELADA", label: "Cancelada" },
            ]}
          />
        }
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/loja/encomendas/${row.id}`)}
      />
    </div>
  );
}
