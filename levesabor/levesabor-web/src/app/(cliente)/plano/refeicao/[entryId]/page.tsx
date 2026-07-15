// FE-C05 · T-05 Detalhe de refeição/receita — MacroRing lg, feedback 👍/👎, troca (F1-CLI-04/05)
"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Info, ThumbsDown, ThumbsUp } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { mealPlanEntryQueryKey, useMealPlanEntry, type MealPlanEntry } from "@/hooks/useMealPlanEntry";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import { SwapSheet } from "@/components/plan/SwapSheet";
import type { components } from "@/types/api";

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

const backLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "var(--clay)",
  textDecoration: "none",
  fontSize: "0.9rem",
  fontWeight: 600,
};

const primaryPillLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 28px",
  borderRadius: "var(--radius-pill)",
  background: "var(--terracotta)",
  color: "#FFFFFF",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: "1rem",
  textDecoration: "none",
};

function feedbackButtonStyle(active: boolean, activeColor: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: "var(--radius-pill)",
    border: active ? "none" : "1.5px solid var(--tan)",
    background: active ? activeColor : "var(--cream-card)",
    color: active ? "#FFFFFF" : "var(--clay)",
    cursor: "pointer",
  };
}

const PAGE_MAX_WIDTH = 640;

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
    mutationFn: () =>
      api<SwapData>(`/me/meal-plans/entries/${entryId}/swap?confirm=true`, { method: "POST" }),
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
      <main style={{ maxWidth: PAGE_MAX_WIDTH, margin: "0 auto", padding: "24px 20px 40px" }}>
        <Skeleton variant="text" width="140px" height="14px" style={{ marginBottom: 20 }} />
        <Skeleton variant="text" width="80%" height="30px" style={{ marginBottom: 14 }} />
        <Skeleton variant="rect" width="200px" height="26px" borderRadius="var(--radius-pill)" style={{ marginBottom: 28 }} />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <Skeleton variant="circle" width="220px" height="220px" />
        </div>
        <Skeleton variant="text" width="35%" height="18px" style={{ marginBottom: 14 }} />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="text" height="18px" style={{ marginBottom: 10 }} />
        ))}
      </main>
    );
  }

  if (isError) {
    if (error instanceof ApiError && error.code === "LSA005_NOT_FOUND") {
      return (
        <main style={{ maxWidth: PAGE_MAX_WIDTH, margin: "0 auto", padding: "24px 20px 40px" }}>
          <EmptyState
            title="Refeição não encontrada"
            description="Esta refeição pode ter sido removida ou já não existe no teu plano ativo."
            action={
              <Link href="/plano" style={primaryPillLinkStyle}>
                Voltar ao plano
              </Link>
            }
          />
        </main>
      );
    }

    return (
      <main style={{ maxWidth: PAGE_MAX_WIDTH, margin: "0 auto", padding: "24px 20px 40px" }}>
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
  const chipParts = recipe
    ? [
        `${recipe.kcal ?? 0} kcal`,
        `${recipe.prepMinutes ?? 0} min`,
        ...(recipe.estimatedCostMt != null ? [`${recipe.estimatedCostMt} MT`] : []),
      ]
    : [];

  return (
    <main style={{ maxWidth: PAGE_MAX_WIDTH, margin: "0 auto", padding: "24px 20px 40px" }}>
      <Link href="/plano" style={backLinkStyle}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar ao plano
      </Link>

      <div style={{ marginTop: 20, marginBottom: 24 }}>
        {entry.mealSlot ? (
          <p
            style={{
              margin: "0 0 6px",
              fontFamily: "var(--font-body)",
              fontSize: "0.85rem",
              fontWeight: 600,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: "var(--clay-soft)",
            }}
          >
            {MEAL_SLOT_LABELS[entry.mealSlot]}
          </p>
        ) : null}

        <h1
          style={{
            margin: "0 0 14px",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(1.5rem, 1.2rem + 1.2vw, 2rem)",
            color: "var(--ink)",
          }}
        >
          {recipe?.name ?? "Receita"}
        </h1>

        {chipParts.length > 0 ? <Chip>{chipParts.join(" · ")}</Chip> : null}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
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

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="button"
            aria-pressed={entry.feedback === "LIKE"}
            aria-label="Gosto desta receita"
            onClick={() => handleFeedback("LIKE")}
            disabled={feedbackMutation.isPending}
            style={feedbackButtonStyle(entry.feedback === "LIKE", "var(--forest)")}
          >
            <ThumbsUp size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-pressed={entry.feedback === "DISLIKE"}
            aria-label="Não gosto desta receita"
            onClick={() => handleFeedback("DISLIKE")}
            disabled={feedbackMutation.isPending}
            style={feedbackButtonStyle(entry.feedback === "DISLIKE", "var(--terracotta)")}
          >
            <ThumbsDown size={20} aria-hidden="true" />
          </button>

          {entry.feedback === "DISLIKE" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSwapPropose}
              loading={proposeSwapMutation.isPending}
              disabled={proposeSwapMutation.isPending}
            >
              Trocar este prato
            </Button>
          ) : null}
        </div>

        {feedbackError ? (
          <p role="alert" style={{ color: "var(--error)", fontSize: "0.85rem", margin: "10px 0 0" }}>
            {feedbackError}
          </p>
        ) : null}
        {swapError ? (
          <p role="alert" style={{ color: "var(--error)", fontSize: "0.85rem", margin: "10px 0 0" }}>
            {swapError}
          </p>
        ) : null}
      </div>

      {recipe?.healthNote ? (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            background: "var(--cream-card-alt)",
            border: "1px solid var(--tan)",
            borderRadius: "var(--radius-card-sm)",
            padding: "14px 16px",
            marginBottom: 28,
          }}
        >
          <Info size={18} color="var(--forest)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--clay)", lineHeight: 1.5 }}>
            {recipe.healthNote}
          </p>
        </div>
      ) : null}

      <section style={{ marginBottom: 28 }}>
        <h2
          style={{
            margin: "0 0 14px",
            fontFamily: "var(--font-display)",
            fontSize: "1.15rem",
            fontWeight: 700,
            color: "var(--ink)",
          }}
        >
          Ingredientes
        </h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {(recipe?.ingredients ?? []).map((line, index) => (
            <li key={index} style={{ display: "flex", gap: 10, fontSize: "0.95rem", color: "var(--ink)" }}>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--clay)", minWidth: 84, flexShrink: 0 }}>
                {line.quantity} {line.unit}
              </span>
              <span>{line.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2
          style={{
            margin: "0 0 14px",
            fontFamily: "var(--font-display)",
            fontSize: "1.15rem",
            fontWeight: 700,
            color: "var(--ink)",
          }}
        >
          Modo de preparação
        </h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {(recipe?.steps ?? []).map((step, index) => (
            <li key={index} style={{ display: "flex", gap: 14 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  color: "var(--terracotta)",
                  flexShrink: 0,
                }}
              >
                {String(step.order ?? index + 1).padStart(2, "0")}
              </span>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--ink)", lineHeight: 1.5 }}>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <p
        style={{
          textAlign: "center",
          fontSize: "0.8rem",
          color: "var(--clay-soft)",
          borderTop: "1px solid var(--tan)",
          paddingTop: 16,
        }}
      >
        Esta receita não substitui aconselhamento médico ou nutricional.
      </p>

      <SwapSheet
        open={swapOpen}
        alternative={swapAlternative}
        confirming={confirmSwapMutation.isPending}
        onConfirm={() => confirmSwapMutation.mutate()}
        onKeep={handleSwapKeep}
      />
    </main>
  );
}
