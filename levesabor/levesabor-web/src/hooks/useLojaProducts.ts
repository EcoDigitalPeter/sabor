// FE-L02/FE-L03 · useLojaProducts — GET /loja/products (lista) + GET/POST/PUT/DELETE/{id} +
// PATCH status + import/export/template. Mesmo padrão de src/hooks/useAdminStores.ts.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiBlob } from "@/lib/api";
import type { components } from "@/types/api";

export type Product = components["schemas"]["Product"];
export type ProductRequest = components["schemas"]["ProductRequest"];
export type ImportJob = components["schemas"]["ImportJob"];
type PageResponse = components["schemas"]["PageResponse"];
type ProductPage = Omit<PageResponse, "items"> & { items?: Product[] };

export type LojaProductsQuery = { page?: number; size?: number; sort?: string; q?: string };

function buildQueryString(query: LojaProductsQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  if (query.sort) params.set("sort", query.sort);
  if (query.q) params.set("q", query.q);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function lojaProductsQueryKey(query: LojaProductsQuery) {
  return ["loja-products", query] as const;
}

export function useLojaProducts(query: LojaProductsQuery) {
  return useQuery({
    queryKey: lojaProductsQueryKey(query),
    queryFn: () => api<ProductPage>(`/loja/products${buildQueryString(query)}`),
  });
}

export function useLojaProduct(id: number) {
  return useQuery({
    queryKey: ["loja-product", id] as const,
    queryFn: () => api<Product>(`/loja/products/${id}`),
    enabled: Number.isFinite(id),
  });
}

export function useCreateLojaProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductRequest) =>
      api<Product>("/loja/products", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loja-products"] });
    },
  });
}

export function useUpdateLojaProduct(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductRequest) =>
      api<Product>(`/loja/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loja-products"] });
      queryClient.invalidateQueries({ queryKey: ["loja-product", id] });
    },
  });
}

export function useSetLojaProductStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "ACTIVE" | "INACTIVE" }) =>
      api<Product>(`/loja/products/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loja-products"] });
      queryClient.invalidateQueries({ queryKey: ["loja-product", variables.id] });
    },
  });
}

export function useDeleteLojaProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<null>(`/loja/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loja-products"] });
    },
  });
}

// FE-L03 · o mock não faz parsing real de .xlsx (ver fixtures.ts) — o ficheiro é enviado por
// completude do fluxo mas o conteúdo é ignorado pela pré-visualização devolvida.
export function useValidateProductsImport() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api<ImportJob>("/loja/products/import", { method: "POST", body: formData });
    },
  });
}

export function useConfirmProductsImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, onlyValidRows }: { jobId: number; onlyValidRows: boolean }) =>
      api<ImportJob>(`/loja/products/import/${jobId}/confirm`, {
        method: "POST",
        body: JSON.stringify({ onlyValidRows }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loja-products"] });
    },
  });
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// FE-L03 · o mock devolve um blob text/csv (não .xlsx real — sem lib de escrita instalada, ver
// fixtures.ts); só serve para exercitar o clique de download.
export async function downloadLojaImportTemplate(): Promise<void> {
  const blob = await apiBlob("/loja/products/import-template");
  triggerBlobDownload(blob, "template-produtos.csv");
}

export async function downloadLojaProductsExport(): Promise<void> {
  const blob = await apiBlob("/loja/products/export");
  triggerBlobDownload(blob, "catalogo-produtos.csv");
}
