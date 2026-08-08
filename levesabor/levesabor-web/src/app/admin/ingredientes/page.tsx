// FE-D07 · T-19 Ingredientes — CRUD tabular com edição inline/drawer, desativar, remoção
// bloqueada com lista de receitas afetadas (F2-ADM-05).
"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAdminIngredients, useDeleteIngredient, type Ingredient } from "@/hooks/useAdminIngredients";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { IngredientSheet } from "./IngredientSheet";
import styles from "./page.module.css";

const PAGE_SIZE = 20;

function formatMt(value: number | null | undefined): string {
  return value == null ? "—" : `${value} MT`;
}

export default function IngredientesPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);

  const { showToast } = useToast();
  const deleteIngredient = useDeleteIngredient();

  const { data, isLoading, isError, refetch } = useAdminIngredients({ page, size: PAGE_SIZE, q: search });

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

  function openCreate() {
    setEditingIngredient(null);
    setSheetOpen(true);
  }

  function openEdit(ingredient: Ingredient) {
    setEditingIngredient(ingredient);
    setSheetOpen(true);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    deleteIngredient.mutate(target.id!, {
      onSuccess: () => {
        showToast("Ingrediente eliminado.");
        setDeleteTarget(null);
      },
      onError: (error) => {
        showToast(
          error instanceof ApiError ? error.message : "Não foi possível eliminar o ingrediente.",
          "error",
        );
        setDeleteTarget(null);
      },
    });
  }

  const columns: DataTableColumn<Ingredient>[] = [
    { key: "name", header: "Nome", sortable: true },
    { key: "category", header: "Categoria" },
    { key: "baseUnit", header: "Unidade" },
    { key: "kcalPer100g", header: "Kcal/100g", align: "right", sortable: true },
    {
      key: "referencePriceMt",
      header: "Preço ref.",
      align: "right",
      render: (row) => formatMt(row.referencePriceMt),
    },
    {
      key: "active",
      header: "Estado",
      render: (row) => <StatusBadge status={row.active ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <button
          type="button"
          className={styles.deleteButton}
          aria-label={`Eliminar ${row.name}`}
          onClick={(event) => {
            event.stopPropagation();
            setDeleteTarget(row);
          }}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ingredientes</h1>
      </header>

      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyState={{
          title: search ? "Nenhum ingrediente encontrado" : "Ainda não há ingredientes",
          description: search ? "Tenta outra pesquisa." : "Cria o primeiro ingrediente para começar.",
        }}
        getRowId={(row) => row.id ?? row.name ?? ""}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        searchPlaceholder="Pesquisar por nome…"
        actions={
          <Button type="button" variant="primary" size="sm" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" /> Novo ingrediente
          </Button>
        }
        onPageChange={setPage}
        onRowClick={openEdit}
      />

      <IngredientSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        ingredient={editingIngredient}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar ingrediente"
        message={`Tens a certeza que queres eliminar "${deleteTarget?.name}"? Se estiver a ser usado em alguma receita, a eliminação é bloqueada.`}
        confirmLabel="Eliminar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
