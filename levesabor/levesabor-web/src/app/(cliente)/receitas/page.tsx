// FE-W05 · T-28 Catálogo de receitas navegável — grelha com filtro por tag de dieta + pesquisa
// por nome (F1-CLI-08). Diferente de /plano: aqui mostra-se TODO o catálogo PUBLISHED, não só as
// receitas já atribuídas ao cliente. Filtros pré-selecionados com Profile.dietaryPreferences na
// primeira carga do perfil (FE-W02), sempre ajustáveis depois — só uma vez, para não sobrepor
// ajustes manuais do cliente num refetch/refoco da query do perfil (ver useEffect abaixo).
"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useRecipeCatalog, type Recipe } from "@/hooks/useRecipeCatalog";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { BrandIllustration } from "@/components/ui/BrandIllustration";
import type { components } from "@/types/api";
import { RecipeGridCard } from "./RecipeGridCard";
import { RecipeDetailSheet } from "./RecipeDetailSheet";
import styles from "./page.module.css";

type Profile = components["schemas"]["Profile"];

// Mesmo vocabulário fechado/rótulos pt-PT já usados no onboarding e em /perfil (FE-W02) —
// dietaryPreferences e healthTags das receitas partilham este vocabulário.
const DIETARY_TAG_OPTIONS: { value: string; label: string }[] = [
  { value: "vegetariana", label: "Vegetariana" },
  { value: "vegan", label: "Vegana" },
  { value: "sem_gluten", label: "Sem glúten" },
  { value: "sem_lactose", label: "Sem lactose" },
  { value: "alta_proteina", label: "Alta proteína" },
  { value: "baixo_calorico", label: "Baixo em calorias" },
];

const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_CARDS = [0, 1, 2, 3];

export default function ReceitasPage() {
  const profileQuery = useQuery<Profile, Error>({
    queryKey: ["profile"],
    queryFn: () => api<Profile>("/me/profile"),
    retry: false,
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (filtersInitialized || !profileQuery.data) return;
    setSelectedTags(profileQuery.data.dietaryPreferences ?? []);
    setFiltersInitialized(true);
  }, [filtersInitialized, profileQuery.data]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const catalogQuery = useRecipeCatalog({ tags: selectedTags, query: debouncedQuery });

  function toggleTag(value: string) {
    setSelectedTags((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  const recipes = catalogQuery.data?.items ?? [];
  const hasActiveFilters = selectedTags.length > 0 || debouncedQuery.trim().length > 0;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Receitas</h1>
        <p className={styles.subtitle}>
          Explora o catálogo todo de pratos moçambicanos — não só os que já estão no teu plano.
        </p>
      </header>

      <div className={styles.searchRow}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <Input
          type="search"
          placeholder="Pesquisar por nome (ex.: xima, frango, feijão)"
          aria-label="Pesquisar receitas por nome"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.chipRow} role="group" aria-label="Filtrar por preferência alimentar">
        {DIETARY_TAG_OPTIONS.map((option) => {
          const selected = selectedTags.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              className={styles.chipButton}
              onClick={() => toggleTag(option.value)}
              aria-pressed={selected}
            >
              <Chip variant={selected ? "tan" : "cream"}>{option.label}</Chip>
            </button>
          );
        })}
      </div>

      {catalogQuery.isLoading ? (
        <div className={styles.grid}>
          {SKELETON_CARDS.map((i) => (
            <Skeleton key={i} variant="rect" height="216px" borderRadius="var(--radius-card)" />
          ))}
        </div>
      ) : catalogQuery.isError ? (
        <ErrorState
          illustration={<BrandIllustration variant="generic-error" />}
          message={
            catalogQuery.error instanceof ApiError
              ? catalogQuery.error.message
              : "Não foi possível carregar as receitas. Verifica a tua ligação e tenta novamente."
          }
          onRetry={() => catalogQuery.refetch()}
        />
      ) : recipes.length === 0 ? (
        <EmptyState
          illustration={<BrandIllustration variant="empty-recipes-search" size={200} />}
          title={hasActiveFilters ? "Nenhuma receita encontrada" : "Ainda não há receitas no catálogo"}
          description={
            hasActiveFilters
              ? "Tenta ajustar os filtros ou a pesquisa."
              : "Volta mais tarde para veres o catálogo completo."
          }
        />
      ) : (
        <div className={styles.grid}>
          {recipes.map((recipe) => (
            <RecipeGridCard key={recipe.id} recipe={recipe} onClick={() => setSelectedRecipe(recipe)} />
          ))}
        </div>
      )}

      <RecipeDetailSheet recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
    </main>
  );
}
