// FE-B07 · DataTable admin — tabela paginada server-side reutilizável (docs/plano/02-ui-ux-plan.md T-10..T-19)
// Puramente apresentacional/controlada: não busca dados nem gere a URL — quem chama liga
// isto a useQuery + useSearchParams/useRouter (essa fiação é responsabilidade das tarefas
// FE-D02/D03/D06/D07, que ainda não existem).
"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search } from "lucide-react";
import { Input } from "./Input";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import styles from "./DataTable.module.css";

export type SortDirection = "asc" | "desc";

export type DataTableColumn<T> = {
  /** Chave da coluna. Usada para o valor por omissão (row[key]) e para identificar a coluna na ordenação. */
  key: string;
  header: string;
  /** Célula customizada (badges, chips, links, anel de macros, etc.). Sem isto, mostra String(row[key]). */
  render?: (row: T) => ReactNode;
  /** Só colunas com sortable=true recebem cabeçalho clicável/navegável por teclado. */
  sortable?: boolean;
  align?: "left" | "center" | "right";
  /** Sugestão de largura (ex.: "120px", "20%") — opcional, passada para o <th>/<td>. */
  width?: string;
};

/** Envelope paginado devolvido pela mock API (ver src/mocks/handlers.ts `pageOf()`). */
export type DataTablePage<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

export type DataTableEmptyState = {
  title: string;
  description?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  /** undefined enquanto não há resposta ainda (ex.: primeiro render antes do useQuery resolver). */
  data: DataTablePage<T> | undefined;
  isLoading: boolean;
  isError: boolean;
  /** Mensagem do ErrorState; por omissão usa uma frase genérica em português. */
  errorMessage?: string;
  onRetry?: () => void;
  /** Mensagem mostrada quando data.items está vazio (varia por ecrã — ver T-10..T-19). */
  emptyState: DataTableEmptyState;
  /** Deriva a key de cada linha (ex.: row => row.id). */
  getRowId: (row: T) => string | number;

  /** Pesquisa controlada — a caixa só é renderizada quando onSearchChange é passado. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  /** Slot para filtros específicos do ecrã (Select/Chip) — renderizado na toolbar. */
  filters?: ReactNode;
  /** Slot para ações primárias da toolbar (ex.: botão "Nova loja"). */
  actions?: ReactNode;

  /** Ordenação controlada — só colunas com sortable=true ficam clicáveis. */
  sortKey?: string;
  sortDirection?: SortDirection;
  onSortChange?: (key: string) => void;

  /** Paginação controlada — o componente só emite o pedido, quem chama liga à URL. */
  onPageChange?: (page: number) => void;

  /** Navegação para o detalhe (ex.: linha de utilizador -> /admin/utilizadores/{id}). */
  onRowClick?: (row: T) => void;

  /** Nº de linhas de skeleton durante isLoading quando ainda não há data.size anterior. */
  skeletonRowCount?: number;
  /** Legenda visualmente escondida para leitores de ecrã. */
  caption?: string;
  className?: string;
};

function defaultCellValue<T>(row: T, key: string): ReactNode {
  const value = (row as unknown as Record<string, unknown>)[key];
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number") return value;
  return String(value);
}

function alignClass(align: DataTableColumn<unknown>["align"]): string {
  if (align === "right") return styles.alignRight;
  if (align === "center") return styles.alignCenter;
  return "";
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  emptyState,
  getRowId,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Pesquisar…",
  filters,
  actions,
  sortKey,
  sortDirection,
  onSortChange,
  onPageChange,
  onRowClick,
  skeletonRowCount,
  caption,
  className,
}: DataTableProps<T>) {
  const hasToolbar = Boolean(onSearchChange || filters || actions);
  const rows = data?.items ?? [];
  const isEmpty = !isLoading && !isError && rows.length === 0;
  const skeletonRows = skeletonRowCount ?? data?.size ?? 5;

  function handleSortClick(column: DataTableColumn<T>) {
    if (!column.sortable || !onSortChange) return;
    onSortChange(column.key);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (!onRowClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  }

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(" ")}>
      {hasToolbar ? (
        <div className={styles.toolbar}>
          {onSearchChange ? (
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} size={18} aria-hidden="true" />
              <Input
                type="search"
                value={searchValue ?? ""}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className={styles.searchInput}
                aria-label={searchPlaceholder}
              />
            </div>
          ) : null}
          {filters ? <div className={styles.filters}>{filters}</div> : null}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      ) : null}

      <div className={styles.tableContainer}>
        {isError ? (
          <ErrorState
            message={errorMessage ?? "Não foi possível carregar os dados. Verifica a tua ligação e tenta novamente."}
            onRetry={onRetry}
          />
        ) : isEmpty ? (
          <EmptyState title={emptyState.title} description={emptyState.description} />
        ) : (
          <div className={styles.scrollArea}>
            <table className={styles.table}>
              {caption ? <caption className={styles.caption}>{caption}</caption> : null}
              <thead>
                <tr>
                  {columns.map((column) => {
                    const isActive = column.sortable && sortKey === column.key;
                    const ariaSort = !column.sortable
                      ? undefined
                      : isActive
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none";
                    return (
                      <th
                        key={column.key}
                        className={alignClass(column.align)}
                        style={column.width ? { width: column.width } : undefined}
                        aria-sort={ariaSort}
                      >
                        {column.sortable ? (
                          <button
                            type="button"
                            className={styles.sortButton}
                            onClick={() => handleSortClick(column)}
                          >
                            {column.header}
                            {isActive ? (
                              sortDirection === "asc" ? (
                                <ChevronUp size={14} aria-hidden="true" />
                              ) : (
                                <ChevronDown size={14} aria-hidden="true" />
                              )
                            ) : (
                              <ArrowUpDown size={14} className={styles.sortIconIdle} aria-hidden="true" />
                            )}
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                      // eslint-disable-next-line react/no-array-index-key -- linhas de skeleton não têm identidade própria
                      <tr key={rowIndex} aria-hidden="true">
                        {columns.map((column) => (
                          <td key={column.key} className={alignClass(column.align)}>
                            <Skeleton variant="text" width="80%" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : rows.map((row) => {
                      const rowId = getRowId(row);
                      const clickable = Boolean(onRowClick);
                      return (
                        <tr
                          key={rowId}
                          className={clickable ? styles.clickableRow : undefined}
                          onClick={clickable ? () => onRowClick?.(row) : undefined}
                          onKeyDown={clickable ? (event) => handleRowKeyDown(event, row) : undefined}
                          tabIndex={clickable ? 0 : undefined}
                          role={clickable ? "button" : undefined}
                        >
                          {columns.map((column) => (
                            <td key={column.key} className={alignClass(column.align)}>
                              {column.render ? column.render(row) : defaultCellValue(row, column.key)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && !isError ? (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => onPageChange?.(data.page - 1)}
            disabled={data.page <= 0}
            aria-label="Página anterior"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span className={styles.pageIndicator}>
            Página {data.page + 1} de {data.totalPages}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => onPageChange?.(data.page + 1)}
            disabled={data.page >= data.totalPages - 1}
            aria-label="Página seguinte"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
