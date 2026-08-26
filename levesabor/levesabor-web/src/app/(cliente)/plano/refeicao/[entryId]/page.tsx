// FE-C05/FE-Q05 · T-05 Detalhe de refeição/receita — foto hero, cartões de estatística,
// MacroRing lg, feedback 👍/👎, "Trocar este prato" sempre visível (F1-CLI-04/05)
"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Info, ThumbsDown, ThumbsUp } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { mealPlanEntryQueryKey, useMealPlanEntry, type MealPlanEntry } from "@/hooks/useMealPlanEntry";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import { SwapSheet } from "@/components/plan/SwapSheet";
import { RecipeHero } from "@/components/plan/RecipeHero";
import { RecipeStatCard } from "@/components/plan/RecipeStatCard";
import { resolveRecipePhoto } from "@/data/recipe-photos";
import type { components } from "@/types/api";
import styles from "./page.module.css";

type RecipeSnapshot = components["schemas"]["RecipeSnapshot"];
type FeedbackValue = NonNullable<components["schemas"]["FeedbackRequest"]["value"]>;
type SwapData = NonNullable<components["schemas"]["SwapEnvelope"]["data"]>;

// Chave usada pela dashboard (FE-C03) para a query do plano ativo — invalidada aqui após
// uma troca confirmada, para que o dashboard reflita a nova receita ao voltar a `/plano`.
const ACTIVE_PLAN_QUERY_KEY = ["active-meal-plan"];

const MEAL_SLOT_LABELS: Record<NonNullable<MealPlanEntry["mealSlot"]>, string> = {
  PEQUENO_ALMOCO: "Pequeno-almoço",
  ALMOCO: "Almoço",
  JANTAR: "Jantar",
  LANCHE: "Lanche",
};

export default function RefeicaoPage({ params }: { params: { entryId: string } }) {
  const { entryId } = params;
  const queryClient = useQueryClient();
  const queryKey = mealPlanEntryQueryKey(entryId);
  const { data: entry, isLoading, isError, error, refetch } = useMealPlanEntry(entryId);

  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapAlternative, setSwapAlternative] = useState<RecipeSnapshot | null>(null);

  const feedbackMutation = useMutation({
    mutationFn: async (value: FeedbackValue) => {
      const recipeId = entry?.recipe?.recipeId;
      if (recipeId === undefined) {
        throw new ApiError("Receita não disponível para feedback.");
      }
      return api<void>(`/me/recipes/${recipeId}/feedback`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      });
    },
    onMutate: async (value) => {
      setFeedbackError(null);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MealPlanEntry>(queryKey);
      queryClient.setQueryData<MealPlanEntry | undefined>(queryKey, (old) =>
        old ? { ...old, feedback: value } : old,
      );
      return { previous };
    },
    onError: (_err, _value, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      setFeedbackError("Não foi possível guardar o teu feedback. Tenta novamente.");
    },
  });

  const proposeSwapMutation = useMutation({
    mutationFn: () => api<SwapData>(`/me/meal-plans/entries/${entryId}/swap`, { method: "POST" }),
    onSuccess: (result) => {
      if (result.alternative?.recipe) {
        setSwapAlternative(result.alternative.recipe);
        setSwapOpen(true);
      } else {
        setSwapError("Sem alternativa disponível para as tuas restrições");
      }
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "LSA014_NO_ALTERNATIVE") {
        setSwapError("Sem alternativa disponível para as tuas restrições");
      } else {
        setSwapError(
          err instanceof ApiError ? err.message : "Não foi possível propor uma troca. Tenta novamente.",
        );
      }
    },
  });

  const confirmSwapMutation = useMutation({
    // FE-Q06: motivo livre e opcional escrito na SwapSheet — vai no corpo só quando preenchido.
    mutationFn: (reason?: string) =>
      api<SwapData>(`/me/meal-plans/entries/${entryId}/swap?confirm=true`, {
        method: "POST",
        body: JSON.stringify(reason ? { reason } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ACTIVE_PLAN_QUERY_KEY });
      setSwapOpen(false);
      setSwapAlternative(null);
    },
    onError: () => {
      setSwapError("Não foi possível confirmar a troca. Tenta novamente.");
    },
  });

  function handleFeedback(target: "LIKE" | "DISLIKE") {
    if (!entry) return;
    const nextValue: FeedbackValue = entry.feedback === target ? "NONE" : target;
    feedbackMutation.mutate(nextValue);
  }

  function handleSwapPropose() {
    setSwapError(null);
    proposeSwapMutation.mutate();
  }

  function handleSwapKeep() {
    setSwapOpen(false);
    setSwapAlternative(null);
  }

  if (isLoading) {
    return (
      <main className={styles.main}>
        <Skeleton variant="text" width="140px" height="14px" className={styles.skeletonBackLink} />
        <Skeleton variant="rect" width="100%" height="240px" borderRadius="var(--radius-card)" className={styles.skeletonHero} />
        <Skeleton variant="text" width="80%" height="30px" className={styles.skeletonTitle} />
        <div className={styles.skeletonStatsRow}>
          <Skeleton variant="rect" width="100%" height="66px" borderRadius="var(--radius-card)" />
          <Skeleton variant="rect" width="100%" height="66px" borderRadius="var(--radius-card)" />
        </div>
        <div className={styles.skeletonRingRow}>
          <Skeleton variant="circle" width="220px" height="220px" />
        </div>
        <Skeleton variant="text" width="35%" height="18px" className={styles.skeletonSectionTitle} />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="text" height="18px" className={styles.skeletonLine} />
        ))}
      </main>
    );
  }

  if (isError) {
    if (error instanceof ApiError && error.code === "LSA005_NOT_FOUND") {
      return (
        <main className={styles.main}>
          <EmptyState
            title="Refeição não encontrada"
            description="Esta refeição pode ter sido removida ou já não existe no teu plano ativo."
            action={
              <Link href="/plano" className={styles.primaryPillLink}>
                Voltar ao plano
              </Link>
            }
          />
        </main>
      );
    }

    return (
      <main className={styles.main}>
        <ErrorState
          message={error instanceof ApiError ? error.message : "Não foi possível carregar esta receita."}
          onRetry={() => refetch()}
        />
      </main>
    );
  }

  if (!entry) {
    return null;
  }

  const recipe = entry.recipe;
  const photoSrc = resolveRecipePhoto(recipe?.imageUrl, recipe?.recipeId);
  const costLabel = recipe?.estimatedCostMt != null ? `${recipe.estimatedCostMt} MT` : "—";

  return (
    <main className={styles.main}>
      <Link href="/plano" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar ao plano
      </Link>

      <RecipeHero photoSrc={photoSrc} alt={recipe?.name ?? "Receita"} />

      <div className={styles.titleBlock}>
        {entry.mealSlot ? <p className={styles.slotLabel}>{MEAL_SLOT_LABELS[entry.mealSlot]}</p> : null}
        <h1 className={styles.title}>{recipe?.name ?? "Receita"}</h1>
      </div>

      <div className={styles.statsRow}>
        <RecipeStatCard label="Tempo de preparação" value={`${recipe?.prepMinutes ?? 0} min`} tone="amber" />
        <RecipeStatCard label="Custo estimado" value={costLabel} tone="forest" />
      </div>

      <div className={styles.ringRow}>
        <MacroRing
          size="lg"
          kcal={recipe?.kcal ?? 0}
          macros={{
            proteina: recipe?.macros?.proteina ?? 0,
            carbs: recipe?.macros?.carbs ?? 0,
            gordura: recipe?.macros?.gordura ?? 0,
            fibra: recipe?.macros?.fibra ?? 0,
          }}
        />
      </div>

      {recipe?.healthNote ? (
        <div className={styles.healthNote}>
          <Info size={18} color="var(--forest)" aria-hidden="true" className={styles.healthNoteIcon} />
          <p className={styles.healthNoteText}>{recipe.healthNote}</p>
        </div>
      ) : null}

      <div className={styles.actionsBlock}>
        <div className={styles.feedbackRow}>
          <button
            type="button"
            aria-pressed={entry.feedback === "LIKE"}
            aria-label="Gosto desta receita"
            onClick={() => handleFeedback("LIKE")}
            disabled={feedbackMutation.isPending}
            className={[styles.feedbackButton, entry.feedback === "LIKE" ? styles.feedbackButtonLike : ""].join(" ")}
          >
            <ThumbsUp size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-pressed={entry.feedback === "DISLIKE"}
            aria-label="Não gosto desta receita"
            onClick={() => handleFeedback("DISLIKE")}
            disabled={feedbackMutation.isPending}
            className={[styles.feedbackButton, entry.feedback === "DISLIKE" ? styles.feedbackButtonDislike : ""].join(" ")}
          >
            <ThumbsDown size={20} aria-hidden="true" />
          </button>
          <p className={styles.swapMicrocopy}>A Ottimizo pode sugerir outra opção.</p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleSwapPropose}
          loading={proposeSwapMutation.isPending}
          disabled={proposeSwapMutation.isPending}
          className={styles.swapCta}
        >
          Trocar este prato
        </Button>

        {feedbackError ? (
          <p role="alert" className={styles.inlineError}>
            {feedbackError}
          </p>
        ) : null}
        {swapError ? (
          <p role="alert" className={styles.inlineError}>
            {swapError}
          </p>
        ) : null}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Ingredientes</h2>
        <ul className={styles.ingredientList}>
          {(recipe?.ingredients ?? []).map((line, index) => (
            <li key={index} className={styles.ingredientItem}>
              <span className={styles.ingredientQty}>
                {line.quantity} {line.unit}
              </span>
              <span>{line.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.sectionSteps}>
        <h2 className={styles.sectionTitle}>Modo de preparação</h2>
        <ol className={styles.stepList}>
          {(recipe?.steps ?? []).map((step, index) => (
            <li key={index} className={styles.stepItem}>
              <span className={styles.stepNumber}>{String(step.order ?? index + 1).padStart(2, "0")}</span>
              <p className={styles.stepText}>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className={styles.disclaimer}>Esta receita não substitui aconselhamento médico ou nutricional.</p>

      <SwapSheet
        open={swapOpen}
        alternative={swapAlternative}
        confirming={confirmSwapMutation.isPending}
        onConfirm={(reason) => confirmSwapMutation.mutate(reason)}
        onKeep={handleSwapKeep}
      />
    </main>
  );
}
