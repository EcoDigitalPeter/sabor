// FE-L02 · T-23 Produtos da loja — lista com pesquisa/filtro categoria+estado (F3-LOJ-01)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, Download } from "lucide-react";
import { useLojaProducts, downloadLojaProductsExport, type Product } from "@/hooks/useLojaProducts";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { PRODUCT_CATEGORY_LABEL, type ProductCategory } from "./ProductFormFields";
import styles from "./page.module.css";

const PAGE_SIZE = 20;

function formatPriceMt(value?: number): string {
  if (value === undefined) return "—";
  return `${value.toFixed(2)} MT`;
}

export default function ProdutosPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError, refetch } = useLojaProducts({ page, size: PAGE_SIZE, q: search });

  // Mesma limitação já documentada em admin/utilizadores/page.tsx: pageOf() só filtra
  // server-side por `q`; categoria/estado são aplicados aqui, do lado do cliente, só sobre os
  // itens já devolvidos nesta página.
  const filteredItems = (data?.items ?? []).filter((product) => {
    if (categoryFilter && product.category !== categoryFilter) return false;
    if (statusFilter && product.status !== statusFilter) return false;
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

  async function handleExport() {
    setExporting(true);
    try {
      await downloadLojaProductsExport();
    } catch {
      showToast("Não foi possível exportar o catálogo.", "error");
    } finally {
      setExporting(false);
    }
  }

  const columns: DataTableColumn<Product>[] = [
    { key: "name", header: "Nome", sortable: true },
    {
      key: "category",
      header: "Categoria",
      render: (row) => (row.category ? PRODUCT_CATEGORY_LABEL[row.category as ProductCategory] : "—"),
    },
    { key: "unitLabel", header: "Unidade" },
    { key: "priceMt", header: "Preço", align: "right", render: (row) => formatPriceMt(row.priceMt) },
    {
      key: "status",
      header: "Estado",
      render: (row) => <StatusBadge status={row.status ?? "ACTIVE"} />,
    },
  ];

  const hasFilters = !!(search || categoryFilter || statusFilter);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Produtos</h1>
      </header>

      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyState={{
          title: hasFilters ? "Nenhum produto encontrado" : "Ainda sem produtos",
          description: hasFilters ? "Tenta outra pesquisa ou filtro." : "Cria o primeiro ou importa um Excel.",
        }}
        getRowId={(row) => row.id ?? row.name ?? ""}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        searchPlaceholder="Pesquisar por nome…"
        filters={
          <>
            <Select
              aria-label="Filtrar por categoria"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              options={[
                { value: "", label: "Todas as categorias" },
                ...Object.entries(PRODUCT_CATEGORY_LABEL).map(([value, label]) => ({ value, label })),
              ]}
            />
            <Select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { value: "", label: "Todos os estados" },
                { value: "ACTIVE", label: "Ativo" },
                { value: "INACTIVE", label: "Inativo" },
              ]}
            />
          </>
        }
        actions={
          <div className={styles.actionsRow}>
            <Button type="button" variant="secondary" size="sm" onClick={handleExport} loading={exporting} disabled={exporting}>
              <Download size={16} aria-hidden="true" /> Exportar Excel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push("/loja/produtos/importar")}
            >
              <Upload size={16} aria-hidden="true" /> Importar Excel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => router.push("/loja/produtos/novo")}>
              <Plus size={16} aria-hidden="true" /> Novo produto
            </Button>
          </div>
        }
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/loja/produtos/${row.id}`)}
      />
    </div>
  );
}
