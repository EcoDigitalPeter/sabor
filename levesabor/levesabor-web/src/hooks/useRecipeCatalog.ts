// FE-W05 · useRecipeCatalog — GET /me/recipes?tags=...&q=... (F1-CLI-08)
// Catálogo navegável de receitas PUBLISHED, filtrável por tags de dieta (AND, `tags` repetido
// na query string) e pesquisa livre por nome (`q`). Mesmo padrão de useShoppingList/useOrders
// (useQuery + api() de @/lib/api).
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type Recipe = components["schemas"]["Recipe"];

// Mesma armadilha de interseção documentada em useOrders.ts: PageResponse.items é `unknown[]`,
// por isso troca-se pelo `items?: Recipe[]` tipado em vez de usar RecipePageEnvelope["data"] direto.
type PageResponse = components["schemas"]["PageResponse"];
export type RecipePage = Omit<PageResponse, "items"> & { items?: Recipe[] };

export type UseRecipeCatalogParams = {
  /** Tags de dieta selecionadas (vocabulário fechado de dietaryPreferences/healthTags); combinadas com AND no mock. */
  tags: string[];
  /** Pesquisa livre por nome; ignorada (não enviada) quando vazia/só espaços. */
  query: string;
};

export function recipeCatalogQueryKey({ tags, query }: UseRecipeCatalogParams) {
  return ["recipe-catalog", tags, query.trim()] as const;
}

export function useRecipeCatalog({ tags, query }: UseRecipeCatalogParams) {
  return useQuery({
    queryKey: recipeCatalogQueryKey({ tags, query }),
    queryFn: () => {
      const params = new URLSearchParams();
      for (const tag of tags) params.append("tags", tag);
      const trimmedQuery = query.trim();
      if (trimmedQuery) params.set("q", trimmedQuery);
      const qs = params.toString();
      return api<RecipePage>(`/me/recipes${qs ? `?${qs}` : ""}`);
    },
  });
}
