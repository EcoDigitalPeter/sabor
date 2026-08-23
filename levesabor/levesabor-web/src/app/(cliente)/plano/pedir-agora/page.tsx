// FE-T04 · "Pedir receita agora" — mini-wizard (refeição/objetivo/nota/confirmar) + espera
// (padrão T-07) + resultado descartável (padrão T-05) + guardar num dia (BottomSheet).
// docs/superpowers/specs/2026-07-20-pedir-receita-agora-design.md
// FE-Y06 (ago/2026): ronda de feedback do cliente — contexto por passo, perguntas reformuladas,
// hierarquia valores>labels + "Editar" no resumo, unidade "kcal" no resultado, CTA "Ver receita",
// "Descartar"→"Não gostei desta" (regra 10 do guia de copy), destaque da refeição actualmente
// aberta + data completa ao guardar, e ConfirmDialog antes de substituir uma refeição existente.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { components } from "@/types/api";
import { Wizard, type WizardStep } from "@/components/ui/Wizard";
import { OptionCard } from "@/components/onboarding/OptionCard";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BrandIllustration } from "@/components/ui/BrandIllustration";
import { ErrorState } from "@/components/ui/ErrorState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RecipeHero } from "@/components/plan/RecipeHero";
import { RecipeStatCard } from "@/components/plan/RecipeStatCard";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import { getRecipePhoto } from "@/data/recipe-photos";
import { formatFullDayLabel, sortEntriesBySlot, todayIsoDate } from "@/lib/planStats";
import { ROTATING_MESSAGES, MESSAGE_ROTATE_INTERVAL_MS } from "../gerar/messages";
import styles from "./page.module.css";

type Profile = components["schemas"]["Profile"];
type Goal = components["schemas"]["Goal"];
type MealSlot = NonNullable<components["schemas"]["MealPlanEntry"]["mealSlot"]>;
type AdHocRecipeRequest = components["schemas"]["AdHocRecipeRequest"];
type AdHocRecipeHandle = components["schemas"]["AdHocRecipeHandle"];
type MealPlan = components["schemas"]["MealPlan"];
type MealPlanDay = components["schemas"]["MealPlanDay"];
type MealPlanEntry = components["schemas"]["MealPlanEntry"];
type RecipeSnapshot = components["schemas"]["RecipeSnapshot"];

const MEAL_SLOT_OPTIONS: { value: MealSlot; label: string }[] = [
  { value: "PEQUENO_ALMOCO", label: "Pequeno-almoço" },
  { value: "ALMOCO", label: "Almoço" },
  { value: "JANTAR", label: "Jantar" },
  { value: "LANCHE", label: "Lanche" },
];

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "PERDER_PESO", label: "Emagrecer" },
  { value: "COMER_MELHOR", label: "Comer melhor no dia a dia" },
  { value: "GANHAR_MASSA", label: "Ganhar massa muscular" },
  { value: "GERIR_CONDICAO", label: "Controlar uma condição de saúde" },
];

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

type DayEntryRef = { day: MealPlanDay; entry: MealPlanEntry };

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
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);
  const [pendingReplace, setPendingReplace] = useState<DayEntryRef | null>(null);

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

  // Passo do wizard a que o "Editar" de cada linha do resumo volta.
  function goToStep(index: number) {
    setStepIndex(index);
  }

  // Substituir uma refeição já preenchida perde a receita lá guardada — pede confirmação antes
  // de submeter, em vez de substituir de imediato (evita alterações acidentais).
  function handleRowSelect(day: MealPlanDay, entry: MealPlanEntry) {
    if (entry.id === undefined || resultRecipe?.recipeId === undefined) return;
    setPendingReplace({ day, entry });
  }

  function confirmReplace() {
    if (pendingReplace?.entry.id !== undefined && resultRecipe?.recipeId !== undefined) {
      replaceMutation.mutate({ entryId: pendingReplace.entry.id, recipeId: resultRecipe.recipeId });
    }
    setPendingReplace(null);
  }

  const steps: WizardStep[] = [
    {
      id: "refeicao",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Que refeição pretendes preparar?</h1>
          <p className={styles.hint}>Escolhe a refeição e vamos sugerir uma receita adequada.</p>
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
          <h1 className={styles.question}>Qual é o objectivo desta receita?</h1>
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
          <h1 className={styles.question}>Há alguma restrição para esta refeição?</h1>
          <p className={styles.hint}>Opcional. Ex.: sem carne hoje, só tenho ovos e arroz, quero algo rápido.</p>
          <FormField
            label="Escreve aqui"
            htmlFor="pedir-agora-nota"
            hint={`${note.length}/${MAX_NOTE_LENGTH} caracteres`}
          >
            <Input
              id="pedir-agora-nota"
              type="text"
              value={note}
              maxLength={MAX_NOTE_LENGTH}
              placeholder="ex.: sem carne hoje, só ovos e arroz"
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
          <h1 className={styles.question}>Confirma antes de gerar a receita</h1>
          <Card className={styles.summaryCard}>
            <dl className={styles.summaryList}>
              <div className={styles.summaryRow}>
                <div className={styles.summaryRowText}>
                  <dt>Refeição</dt>
                  <dd>{MEAL_SLOT_OPTIONS.find((o) => o.value === mealSlot)?.label ?? "—"}</dd>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => goToStep(0)}>
                  Editar
                </Button>
              </div>
              <div className={styles.summaryRow}>
                <div className={styles.summaryRowText}>
                  <dt>Objectivo</dt>
                  <dd>{GOAL_OPTIONS.find((o) => o.value === goal)?.label ?? "—"}</dd>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => goToStep(1)}>
                  Editar
                </Button>
              </div>
              <div className={styles.summaryRow}>
                <div className={styles.summaryRowText}>
                  <dt>Restrição</dt>
                  <dd>{note.trim() ? note.trim() : "Nenhuma"}</dd>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => goToStep(2)}>
                  Editar
                </Button>
              </div>
            </dl>
          </Card>
          <p className={styles.expectation}>
            A Ottimizzo irá gerar uma receita adaptada às tuas preferências e restrições.
          </p>
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
          stepLabel={(current, total) => `Passo ${current} de ${total} • Receita personalizada`}
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
  const photoSrc = getRecipePhoto(recipe?.name);
  const costLabel = recipe?.estimatedCostMt != null ? `${recipe.estimatedCostMt} MT` : "—";
  const days = activePlanQuery.data?.days ?? [];

  // A refeição "actualmente aberta": a entrada de hoje que corresponde à refeição pedida no
  // wizard — é a mais provável candidata a ser substituída, por isso ganha destaque na lista.
  const todayIso = todayIsoDate();
  const targetRow: DayEntryRef | null =
    days
      .flatMap((day) => (day.entries ?? []).map((entry) => ({ day, entry })))
      .find(({ day, entry }) => day.date === todayIso && entry.mealSlot === mealSlot) ?? null;

  const dayRows = days
    .flatMap((day) => sortEntriesBySlot(day.entries ?? []).map((entry) => ({ day, entry })))
    .sort((a, b) => {
      const aFirst = targetRow && a.entry.id === targetRow.entry.id ? 0 : 1;
      const bFirst = targetRow && b.entry.id === targetRow.entry.id ? 0 : 1;
      return aFirst - bFirst;
    });

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
          unit="kcal"
          macros={{
            proteina: recipe?.macros?.proteina ?? 0,
            carbs: recipe?.macros?.carbs ?? 0,
            gordura: recipe?.macros?.gordura ?? 0,
            fibra: recipe?.macros?.fibra ?? 0,
          }}
        />
      </div>

      <div className={styles.resultActions}>
        <Button type="button" variant="secondary" onClick={() => setShowRecipeDetail((v) => !v)}>
          {showRecipeDetail ? "Ocultar receita" : "Ver receita"}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => setSaveSheetOpen(true)}
          disabled={!recipe?.recipeId}
        >
          Guardar num dia
        </Button>
        {/* Regra 10 do guia de copy: pedir outra sugestão não perde nada do utilizador — o texto
            não pode soar a "apagar"/definitivo (era "Descartar"). */}
        <Button type="button" variant="secondary" onClick={() => router.push("/plano")}>
          Não gostei desta
        </Button>
        {saveError ? (
          <p role="alert" className={styles.submitError}>
            {saveError}
          </p>
        ) : null}
      </div>

      {showRecipeDetail ? (
        <div className={styles.detailSection}>
          <section className={styles.detailBlock}>
            <h2 className={styles.detailTitle}>Ingredientes</h2>
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

          <section className={styles.detailBlock}>
            <h2 className={styles.detailTitle}>Modo de preparação</h2>
            <ol className={styles.stepList}>
              {(recipe?.steps ?? []).map((step, index) => (
                <li key={index} className={styles.stepItem}>
                  <span className={styles.stepNumber}>{String(step.order ?? index + 1).padStart(2, "0")}</span>
                  <p className={styles.stepText}>{step.text}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}

      <p className={styles.disclaimer}>Esta receita não substitui aconselhamento médico ou nutricional.</p>

      <BottomSheet open={saveSheetOpen} onClose={() => setSaveSheetOpen(false)}>
        <h2 className={styles.sheetTitle}>Guardar em que refeição?</h2>
        <div className={styles.dayList}>
          {dayRows.map(({ day, entry }) => {
            const isTarget = targetRow !== null && entry.id === targetRow.entry.id;
            const slotLabel = MEAL_SLOT_OPTIONS.find((o) => o.value === entry.mealSlot)?.label ?? "";
            const dayLabel = `${formatFullDayLabel(day.weekday ?? "", day.date ?? "")} • ${slotLabel}`;
            return (
              <button
                key={entry.id}
                type="button"
                className={[styles.dayRow, isTarget ? styles.dayRowTarget : ""].filter(Boolean).join(" ")}
                disabled={replaceMutation.isPending || !recipe?.recipeId}
                onClick={() => handleRowSelect(day, entry)}
              >
                {isTarget ? (
                  <span className={styles.dayRowCurrent}>
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                    {entry.recipe?.name ?? "Receita actual"} — Receita actual
                  </span>
                ) : null}
                <span className={styles.dayRowMeta}>{dayLabel}</span>
                <span className={styles.dayRowName}>{entry.recipe?.name ?? "—"}</span>
              </button>
            );
          })}
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={pendingReplace !== null}
        title="Substituir esta refeição?"
        message={
          pendingReplace
            ? `"${pendingReplace.entry.recipe?.name ?? "Esta refeição"}" será substituída por "${recipe?.name ?? "a nova receita"}".`
            : ""
        }
        confirmLabel="Substituir"
        cancelLabel="Cancelar"
        destructive={false}
        onCancel={() => setPendingReplace(null)}
        onConfirm={confirmReplace}
      />
    </main>
  );
}
