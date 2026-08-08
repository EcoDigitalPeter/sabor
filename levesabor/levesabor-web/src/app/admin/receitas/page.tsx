// FE-D06 · T-17 Receitas — lista com tags, estado e feedback agregado 👍/👎 (F2-ADM-05)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAdminRecipes, type Recipe } from "@/hooks/useAdminRecipes";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

const PAGE_SIZE = 20;

function formatTags(tags?: string[]): string {
  if (!tags || tags.length === 0) return "—";
  return tags.slice(0, 3).join(", ") + (tags.length > 3 ? "…" : "");
}

export default function ReceitasPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, isError, refetch } = useAdminRecipes({ page, size: PAGE_SIZE, q: search });

  const rawItems = data?.items ?? [];
  // NOTA: o mock (`pageOf()` em src/mocks/handlers.ts) só filtra server-side por `q` (nome) —
  // estado (DRAFT/PUBLISHED) é aplicado aqui do lado do cliente, só sobre os itens já devolvidos
  // nesta página; totalItems/totalPages continuam a refletir a contagem do servidor sem este filtro.
  const filteredItems = statusFilter ? rawItems.filter((recipe) => recipe.status === statusFilter) : rawItems;

  const tableData = data
    ? {
        items: filteredItems,
        page: data.page ?? 0,
        size: data.size ?? PAGE_SIZE,
        totalItems: data.totalItems ?? 0,
        totalPages: data.totalPages ?? 1,
      }
    : undefined;

  const columns: DataTableColumn<Recipe>[] = [
    { key: "name", header: "Nome", sortable: true },
    { key: "healthTags", header: "Tags", render: (row) => formatTags(row.healthTags) },
    {
      key: "status",
      header: "Estado",
      render: (row) => (row.status ? <StatusBadge status={row.status} /> : "—"),
    },
    {
      key: "feedback",
      header: "👍 / 👎",
      align: "right",
      render: (row) => `${row.likeCount ?? 0} / ${row.dislikeCount ?? 0}`,
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Receitas</h1>
      </header>

      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyState={{
          title: search || statusFilter ? "Nenhuma receita encontrada" : "Ainda não há receitas",
          description: search || statusFilter ? "Tenta outra pesquisa ou filtro." : "Cria a primeira receita para começar.",
        }}
        getRowId={(row) => row.id ?? row.name ?? ""}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        searchPlaceholder="Pesquisar por nome…"
        filters={
          <Select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
              { value: "", label: "Todos os estados" },
              { value: "DRAFT", label: "Rascunho" },
              { value: "PUBLISHED", label: "Publicada" },
            ]}
          />
        }
        actions={
          <Button type="button" variant="primary" size="sm" onClick={() => router.push("/admin/receitas/nova")}>
            <Plus size={16} aria-hidden="true" /> Nova receita
          </Button>
        }
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/admin/receitas/${row.id}`)}
      />
    </div>
  );
}
