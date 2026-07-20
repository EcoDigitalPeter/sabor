// FE-T04 · "Pedir receita agora" — mini-wizard (refeição/objetivo/nota/confirmar) + espera
// (padrão T-07) + resultado descartável (padrão T-05) + guardar num dia (BottomSheet).
// docs/superpowers/specs/2026-07-20-pedir-receita-agora-design.md
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { components } from "@/types/api";
import { Wizard, type WizardStep } from "@/components/ui/Wizard";
import { OptionCard } from "@/components/onboarding/OptionCard";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandIllustration } from "@/components/ui/BrandIllustration";
import { ErrorState } from "@/components/ui/ErrorState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { RecipeHero } from "@/components/plan/RecipeHero";
import { RecipeStatCard } from "@/components/plan/RecipeStatCard";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import { getRecipePhoto } from "@/data/recipe-photos";
import { ROTATING_MESSAGES, MESSAGE_ROTATE_INTERVAL_MS } from "../gerar/messages";
import styles from "./page.module.css";

type Profile = components["schemas"]["Profile"];
type Goal = components["schemas"]["Goal"];
type MealSlot = NonNullable<components["schemas"]["MealPlanEntry"]["mealSlot"]>;
type AdHocRecipeRequest = components["schemas"]["AdHocRecipeRequest"];
type AdHocRecipeHandle = components["schemas"]["AdHocRecipeHandle"];
type MealPlan = components["schemas"]["MealPlan"];
type MealPlanEntry = components["schemas"]["MealPlanEntry"];
type RecipeSnapshot = components["schemas"]["RecipeSnapshot"];

const MEAL_SLOT_OPTIONS: { value: MealSlot; label: string }[] = [
  { value: "PEQUENO_ALMOCO", label: "Pequeno-almoço" },
  { value: "ALMOCO", label: "Almoço" },
  { value: "JANTAR", label: "Jantar" },
  { value: "LANCHE", label: "Lanche" },
];

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "PERDER_PESO", label: "Perder peso" },
  { value: "COMER_MELHOR", label: "Comer melhor no dia a dia" },
  { value: "GANHAR_MASSA", label: "Ganhar massa" },
  { value: "GERIR_CONDICAO", label: "Gerir uma condição de saúde" },
];

const SLOT_ORDER: Record<string, number> = { PEQUENO_ALMOCO: 0, ALMOCO: 1, JANTAR: 2, LANCHE: 3 };
const MAX_NOTE_LENGTH = 140;
const POLL_INTERVAL_MS = 2500;
const DEFAULT_ERROR_MESSAGE = "Não foi possível gerar a tua receita agora. Tenta novamente.";

function defaultMealSlotForNow(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 11) return "PEQUENO_ALMOCO";
  if (hour < 15) return "ALMOCO";
  return "JANTAR";
}

type Phase = "wizard" | "generating" | "result" | "failed" | "limit_reached";

export default function PedirAgoraPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const profileQuery = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: () => api<Profile>("/me/profile"),
    retry: false,
  });

  const [phase, setPhase] = useState<Phase>("wizard");
  const [stepIndex, setStepIndex] = useState(0);
  const [mealSlot, setMealSlot] = useState<MealSlot>(defaultMealSlotForNow());
  const [goal, setGoal] = useState<Goal | null>(null);
  const [note, setNote] = useState("");
  const [generationId, setGenerationId] = useState<number | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState(DEFAULT_ERROR_MESSAGE);
  const [resultRecipe, setResultRecipe] = useState<RecipeSnapshot | null>(null);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pré-seleciona o objetivo com o do perfil assim que carrega (editável só para este pedido).
  useEffect(() => {
    if (profileQuery.data?.goal && goal === null) {
      setGoal(profileQuery.data.goal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só corre quando o perfil chega
  }, [profileQuery.data]);

  const requestAdHoc = useMutation<AdHocRecipeHandle, Error, AdHocRecipeRequest>({
    mutationFn: (body) => api<AdHocRecipeHandle>("/me/recipes/adhoc", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (data) => {
      setGenerationId(data.id ?? null);
      setMessageIndex(0);
      setPhase("generating");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "LSA015_ADHOC_LIMIT") {
        setPhase("limit_reached");
        return;
      }
      setErrorMessage(error instanceof ApiError ? error.message : DEFAULT_ERROR_MESSAGE);
      setPhase("failed");
    },
  });

  const pollingEnabled = phase === "generating" && generationId !== null;
  const generationQuery = useQuery<AdHocRecipeHandle, Error>({
    queryKey: ["adhoc-recipe", generationId],
    queryFn: () => api<AdHocRecipeHandle>(`/me/recipes/adhoc/${generationId}`),
    enabled: pollingEnabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "READY" || status === "FAILED") return false;
      return POLL_INTERVAL_MS;
    },
  });

  useEffect(() => {
    const status = generationQuery.data?.status;
    if (status === "READY") {
      setResultRecipe(generationQuery.data?.recipe ?? null);
      setPhase("result");
    } else if (status === "FAILED") {
      setErrorMessage("A geração da tua receita falhou. Tenta novamente.");
      setPhase("failed");
    }
  }, [generationQuery.data]);

  useEffect(() => {
    if (!generationQuery.isError) return;
    setErrorMessage(generationQuery.error instanceof ApiError ? generationQuery.error.message : DEFAULT_ERROR_MESSAGE);
    setPhase("failed");
  }, [generationQuery.isError, generationQuery.error]);

  useEffect(() => {
    if (phase !== "generating") return;
    const timer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % ROTATING_MESSAGES.length);
    }, MESSAGE_ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [phase]);

  const activePlanQuery = useQuery<MealPlan>({
    queryKey: ["active-meal-plan"],
    queryFn: () => api<MealPlan>("/me/meal-plans/active"),
    enabled: phase === "result",
  });

  const replaceMutation = useMutation<MealPlanEntry, Error, { entryId: number; recipeId: number }>({
    mutationFn: ({ entryId, recipeId }) =>
      api<MealPlanEntry>(`/me/meal-plans/entries/${entryId}/replace`, {
        method: "POST",
        body: JSON.stringify({ recipeId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-meal-plan"] });
      router.replace("/plano");
    },
    onError: () => {
      setSaveError("Não foi possível guardar a receita neste dia. Tenta novamente.");
    },
  });

  function handleGenerate() {
    requestAdHoc.mutate({ mealSlot, goal: goal ?? undefined, note: note.trim() || undefined });
  }

  function handleRetry() {
    setErrorMessage(DEFAULT_ERROR_MESSAGE);
    setGenerationId(null);
    handleGenerate();
  }

  const steps: WizardStep[] = [
    {
      id: "refeicao",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Para que refeição é agora?</h1>
          <div className={styles.optionGrid}>
            {MEAL_SLOT_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                label={opt.label}
                selected={mealSlot === opt.value}
                onSelect={() => setMealSlot(opt.value)}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "objetivo",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Qual é o objetivo desta receita?</h1>
          <p className={styles.hint}>Começa igual ao teu perfil — muda só para este pedido.</p>
          <div className={styles.optionGrid}>
            {GOAL_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                label={opt.label}
                selected={goal === opt.value}
                onSelect={() => setGoal(opt.value)}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "nota",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Alguma restrição pontual para agora?</h1>
          <p className={styles.hint}>Opcional. Ex.: &quot;só tenho o que está na despensa&quot;.</p>
          <FormField
            label="Nota"
            htmlFor="pedir-agora-nota"
            hint={`${note.length}/${MAX_NOTE_LENGTH} caracteres`}
          >
            <Input
              id="pedir-agora-nota"
              type="text"
              value={note}
              maxLength={MAX_NOTE_LENGTH}
              placeholder="ex.: sem carne hoje"
              onChange={(e) => setNote(e.target.value)}
            />
          </FormField>
        </div>
      ),
    },
    {
      id: "resumo",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Confirma o teu pedido</h1>
          <dl className={styles.summaryList}>
            <div className={styles.summaryRow}>
              <dt>Refeição</dt>
              <dd>{MEAL_SLOT_OPTIONS.find((o) => o.value === mealSlot)?.label ?? "—"}</dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>Objetivo</dt>
              <dd>{GOAL_OPTIONS.find((o) => o.value === goal)?.label ?? "—"}</dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>Restrição</dt>
              <dd>{note.trim() ? note.trim() : "Nenhuma"}</dd>
            </div>
          </dl>
          {requestAdHoc.isError ? (
            <ErrorState
              className={styles.submitError}
              message={requestAdHoc.error instanceof ApiError ? requestAdHoc.error.message : DEFAULT_ERROR_MESSAGE}
              onRetry={handleGenerate}
            />
          ) : null}
        </div>
      ),
    },
  ];

  const isLastStep = stepIndex === steps.length - 1;

  function handleNext() {
    if (isLastStep) {
      handleGenerate();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function handleBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  if (phase === "wizard") {
    if (profileQuery.isLoading) {
      return <main className={styles.main} />;
    }
    return (
      <main className={styles.main}>
        <Wizard
          steps={steps}
          currentStepIndex={stepIndex}
          onNext={handleNext}
          onBack={handleBack}
          canGoNext={!requestAdHoc.isPending}
          nextLabel={isLastStep ? (requestAdHoc.isPending ? "A gerar…" : "Gerar receita") : "Continuar"}
        />
      </main>
    );
  }

  if (phase === "generating") {
    return (
      <main className={styles.main}>
        <div className={styles.generating}>
          <div className={styles.ringWrap}>
            <BrandIllustration variant="generating" size={200} />
          </div>
          <p className={styles.message} role="status" aria-live="polite">
            {ROTATING_MESSAGES[messageIndex]}
          </p>
        </div>
      </main>
    );
  }

  if (phase === "limit_reached") {
    return (
      <main className={styles.main}>
        <ErrorState message="Atingiste o limite de pedidos avulsos de hoje — tenta amanhã." />
      </main>
    );
  }

  if (phase === "failed") {
    return (
      <main className={styles.main}>
        <ErrorState message={errorMessage} onRetry={handleRetry} />
      </main>
    );
  }

  // phase === "result"
  const recipe = resultRecipe;
  const photoSrc = getRecipePhoto(recipe?.recipeId);
  const costLabel = recipe?.estimatedCostMt != null ? `${recipe.estimatedCostMt} MT` : "—";
  const days = activePlanQuery.data?.days ?? [];

  return (
    <main className={styles.main}>
      <RecipeHero photoSrc={photoSrc} alt={recipe?.name ?? "Receita"} />
      <h1 className={styles.resultTitle}>{recipe?.name ?? "Receita"}</h1>

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

      <div className={styles.resultActions}>
        <Button
          type="button"
          variant="primary"
          onClick={() => setSaveSheetOpen(true)}
          disabled={!recipe?.recipeId}
        >
          Guardar num dia
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/plano")}>
          Descartar
        </Button>
        {saveError ? (
          <p role="alert" className={styles.submitError}>
            {saveError}
          </p>
        ) : null}
      </div>

      <p className={styles.disclaimer}>Esta receita não substitui aconselhamento médico ou nutricional.</p>

      <BottomSheet open={saveSheetOpen} onClose={() => setSaveSheetOpen(false)}>
        <h2 className={styles.sheetTitle}>Guardar em que refeição?</h2>
        <div className={styles.dayList}>
          {days
            .flatMap((day) =>
              [...(day.entries ?? [])]
                .sort((a, b) => (SLOT_ORDER[a.mealSlot ?? ""] ?? 99) - (SLOT_ORDER[b.mealSlot ?? ""] ?? 99))
                .map((entry) => ({ day, entry })),
            )
            .map(({ day, entry }) => (
              <button
                key={entry.id}
                type="button"
                className={styles.dayRow}
                disabled={replaceMutation.isPending || !recipe?.recipeId}
                onClick={() =>
                  entry.id !== undefined &&
                  recipe?.recipeId !== undefined &&
                  replaceMutation.mutate({ entryId: entry.id, recipeId: recipe.recipeId })
                }
              >
                <span className={styles.dayRowMeta}>
                  {day.weekday} · {MEAL_SLOT_OPTIONS.find((o) => o.value === entry.mealSlot)?.label ?? ""}
                </span>
                <span className={styles.dayRowName}>{entry.recipe?.name ?? "—"}</span>
              </button>
            ))}
        </div>
      </BottomSheet>
    </main>
  );
}
