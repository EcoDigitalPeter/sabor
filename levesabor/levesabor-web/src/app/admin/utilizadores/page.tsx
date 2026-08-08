// FE-D02 · T-10 Utilizadores — DataTable server-side com pesquisa/filtros (F2-ADM-01)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAdminUsers, type User } from "@/hooks/useAdminUsers";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CreateAdminSheet } from "./CreateAdminSheet";
import styles from "./page.module.css";

const PAGE_SIZE = 20;

const ROLE_LABEL: Record<NonNullable<User["role"]>, string> = {
  CLIENTE: "Cliente",
  ADMIN: "Admin",
  LOJISTA: "Lojista",
};

function formatDate(iso?: string | null): string {
  if (!iso) return "Nunca";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Nunca";
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function UtilizadoresPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useAdminUsers({ page, size: PAGE_SIZE, q: search });

  // DataTable exige DataTablePage<T> com items/page/size/totalItems/totalPages não-opcionais;
  // o envelope gerado do OpenAPI (PageResponse) tem todos estes campos opcionais — normaliza aqui
  // com defaults sensatos em vez de propagar o "?" para dentro do componente apresentacional.
  const rawItems = data?.items ?? [];

  // NOTA: o mock (`pageOf()` em src/mocks/handlers.ts) só filtra server-side por `q`
  // (nome/email) — role e estado não são parâmetros reconhecidos pelo endpoint mock.
  // Por isso os filtros abaixo são aplicados aqui, do lado do cliente, só sobre os itens já
  // devolvidos nesta página; `totalItems`/`totalPages` continuam a refletir a contagem do
  // servidor sem estes filtros (limitação aceite — ver resumo da tarefa).
  const filteredItems = rawItems.filter((user) => {
    if (roleFilter && user.role !== roleFilter) return false;
    if (statusFilter && user.status !== statusFilter) return false;
    return true;
  });

  const tableData = data
    ? {
        items: filteredItems,
        page: data.page ?? 0,
        size: data.size ?? PAGE_SIZE,
        totalItems: data.totalItems ?? 0,
        totalPages: data.totalPages ?? 1,
      }
    : undefined;

  const columns: DataTableColumn<User>[] = [
    { key: "name", header: "Nome", sortable: true },
    { key: "email", header: "Email" },
    {
      key: "role",
      header: "Role",
      render: (row) => (row.role ? ROLE_LABEL[row.role] : "—"),
    },
    {
      key: "status",
      header: "Estado",
      render: (row) => (row.status ? <StatusBadge status={row.status} /> : "—"),
    },
    { key: "mealPlanCount", header: "Nº planos", align: "right" },
    {
      key: "lastLoginAt",
      header: "Último acesso",
      render: (row) => formatDate(row.lastLoginAt),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Utilizadores</h1>
      </header>

      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyState={{
          title: search || roleFilter || statusFilter ? "Nenhum utilizador encontrado" : "Ainda não há utilizadores",
          description:
            search || roleFilter || statusFilter ? "Tenta outra pesquisa ou filtro." : "Cria o primeiro admin para começar.",
        }}
        getRowId={(row) => row.id ?? row.email ?? ""}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        searchPlaceholder="Pesquisar por nome ou email…"
        filters={
          <>
            <Select
              aria-label="Filtrar por role"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              options={[
                { value: "", label: "Todas as roles" },
                { value: "CLIENTE", label: "Cliente" },
                { value: "ADMIN", label: "Admin" },
              ]}
            />
            <Select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { value: "", label: "Todos os estados" },
                { value: "ACTIVE", label: "Ativo" },
                { value: "SUSPENDED", label: "Suspenso" },
              ]}
            />
          </>
        }
        actions={
          <Button type="button" variant="primary" size="sm" onClick={() => setSheetOpen(true)}>
            <Plus size={16} aria-hidden="true" /> Novo admin
          </Button>
        }
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/admin/utilizadores/${row.id}`)}
      />

      <CreateAdminSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
