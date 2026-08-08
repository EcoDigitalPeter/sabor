// FE-D03 · T-12 Lojas — lista com pesquisa/estado (F2-ADM-02)
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdminStores, type Store } from "@/hooks/useAdminStores";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

const PAGE_SIZE = 20;

function formatLocation(store: Store): string {
  const city = store.city ?? "—";
  return store.neighborhood ? `${city} · ${store.neighborhood}` : city;
}

export default function LojasPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useAdminStores({ page, size: PAGE_SIZE, q: search });

  // DataTable exige DataTablePage<T> com items/page/size/totalItems/totalPages não-opcionais;
  // o envelope gerado do OpenAPI (PageResponse) tem todos estes campos opcionais — normaliza aqui
  // com defaults sensatos em vez de propagar o "?" para dentro do componente apresentacional.
  const tableData = data
    ? {
        items: data.items ?? [],
        page: data.page ?? 0,
        size: data.size ?? PAGE_SIZE,
        totalItems: data.totalItems ?? 0,
        totalPages: data.totalPages ?? 1,
      }
    : undefined;

  const columns: DataTableColumn<Store>[] = [
    { key: "name", header: "Nome", sortable: true },
    { key: "location", header: "Cidade / Bairro", render: (row) => formatLocation(row) },
    { key: "contact", header: "Contacto" },
    {
      key: "status",
      header: "Estado",
      render: (row) => <StatusBadge status={row.status ?? "ACTIVE"} />,
    },
    {
      key: "productCount",
      header: "Nº produtos",
      align: "right",
      render: (row) => String(row.productCount ?? 0),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lojas</h1>
      </header>

      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyState={{
          title: search ? "Nenhuma loja encontrada" : "Ainda não há lojas",
          description: search ? "Tenta outra pesquisa." : "Cria a primeira loja parceira para começar.",
        }}
        getRowId={(row) => row.id ?? row.name ?? ""}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        searchPlaceholder="Pesquisar por nome ou cidade…"
        actions={
          <Button type="button" variant="primary" size="sm" onClick={() => router.push("/admin/lojas/nova")}>
            <Plus size={16} aria-hidden="true" /> Nova loja
          </Button>
        }
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/admin/lojas/${row.id}`)}
      />
    </div>
  );
}
