// FE-C02 · T-03 Onboarding do perfil — wizard 5 passos + resumo (F1-CLI-01)
// docs/plano/01-functional-plan.md §F1-CLI-01 (linhas 141-185) · docs/plano/02-ui-ux-plan.md §T-03 (108-113)
// Ilustrações: BrandIllustration variant="onboarding" (P-01, passo 1) e "onboarding-success" (P-05, ecrã final).
"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { components } from "@/types/api";
import { Wizard, type WizardStep } from "@/components/ui/Wizard";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormField, formFieldErrorId } from "@/components/ui/FormField";
import { ErrorState } from "@/components/ui/ErrorState";
import { BrandIllustration } from "@/components/ui/BrandIllustration";
import { OptionCard } from "@/components/onboarding/OptionCard";
import styles from "./page.module.css";

type Goal = components["schemas"]["Goal"];
type HealthCondition = components["schemas"]["HealthCondition"];
type BudgetBand = components["schemas"]["BudgetBand"];
type Profile = components["schemas"]["Profile"];

// Labels exatas da landing / F1-CLI-01 (docs/plano/01-functional-plan.md linhas 152-156 e
// project/Leve Sabor AI.dc.html linhas 71, 83, 416-420 — mesmo texto do mini-quiz da hero).
const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "PERDER_PESO", label: "Emagrecer" },
  { value: "COMER_MELHOR", label: "Comer melhor no dia a dia" },
  { value: "GANHAR_MASSA", label: "Ganhar massa muscular" },
  { value: "GERIR_CONDICAO", label: "Controlar uma condição de saúde" },
];

// FE-Y02 (ago/2026): passou de seleção única a múltipla — o cliente pode ter mais do que uma
// condição em simultâneo (ex.: diabetes + hipertensão). "Outra" revela um campo de texto livre.
const HEALTH_OPTIONS: { value: HealthCondition; label: string }[] = [
  { value: "NENHUMA", label: "Nenhuma" },
  { value: "DIABETES_TIPO_2", label: "Diabetes tipo 2" },
  { value: "HIPERTENSAO", label: "Hipertensão" },
  { value: "DOENCA_CELIACA", label: "Doença celíaca" },
  { value: "OUTRA", label: "Outra" },
];

// O plano funcional não define faixas em MT nem descrições — as frases de apoio abaixo são uma
// escolha editorial local (não inventam valores/factos, só clarificam a intenção de cada faixa).
// Relabeladas em ago/2026 a pedido do cliente ("Confortável" era vago); intervalos indicativos
// alinhados com o exemplo já usado na landing (LandingPage.tsx: "2.500 MT para uma família de 4").
const BUDGET_OPTIONS: { value: BudgetBand; label: string; description: string }[] = [
  { value: "BAIXO", label: "Económico", description: "Até 1.500 MT/semana" },
  { value: "MEDIO", label: "Equilibrado", description: "1.500–3.000 MT/semana" },
  { value: "CONFORTAVEL", label: "Premium", description: "A partir de 3.000 MT/semana" },
];

// Exemplos citados literalmente no plano funcional (linha 154): "ex.: amendoim, marisco, lactose".
const ALLERGY_SUGGESTIONS = ["Amendoim", "Marisco", "Lactose"];

// FE-Y03 (ago/2026): "sem_preferencia" é mutuamente exclusiva com as restantes (mesma lógica de
// "Nenhuma" nas condições de saúde) — evita dúvida a quem não segue nenhum padrão alimentar.
const DIETARY_PREFERENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "vegetariana", label: "Vegetariana" },
  { value: "vegan", label: "Vegana" },
  { value: "sem_gluten", label: "Sem glúten" },
  { value: "sem_lactose", label: "Sem lactose" },
  { value: "alta_proteina", label: "Alta proteína" },
  { value: "baixo_calorico", label: "Baixo em calorias" },
  { value: "sem_preferencia", label: "Sem preferência" },
];

const MIN_MEALS = 2;
const MAX_MEALS = 5;
const MIN_HOUSEHOLD = 1;
const MAX_HOUSEHOLD = 8;
const MAX_ALLERGIES = 20;
const MAX_ALLERGY_LENGTH = 60;

const GENERIC_ERROR_MESSAGE = "Não foi possível guardar o teu perfil. Tenta novamente.";

// ── Rascunho local (F1-CLI-01: "Persistir rascunho do wizard localmente") ──────────────────────
const DRAFT_STORAGE_KEY = "ottimizo:onboarding-draft";

type OnboardingDraft = {
  goal: Goal | null;
  healthConditions: HealthCondition[];
  healthConditionOther: string;
  allergies: string[];
  foodExclusions: string[];
  dietaryPreferences: string[];
  budgetBand: BudgetBand | null;
  mealsPerDay: number;
  householdSize: number;
};

const DEFAULT_DRAFT: OnboardingDraft = {
  goal: null,
  healthConditions: [],
  healthConditionOther: "",
  allergies: [],
  foodExclusions: [],
  dietaryPreferences: [],
  budgetBand: null,
  mealsPerDay: 3,
  householdSize: 1,
};

type StoredDraft = { draft: OnboardingDraft; stepIndex: number };

function loadStoredDraft(): StoredDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft> | null;
    if (!parsed || typeof parsed !== "object" || !parsed.draft) return null;
    return {
      draft: { ...DEFAULT_DRAFT, ...parsed.draft },
      stepIndex: typeof parsed.stepIndex === "number" ? parsed.stepIndex : 0,
    };
  } catch {
    return null;
  }
}

function persistDraft(stored: StoredDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // localStorage indisponível (ex.: modo privado) — o rascunho simplesmente não sobrevive a um
    // reload nesta sessão; o wizard continua a funcionar normalmente em memória.
  }
}

function clearStoredDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ver persistDraft
  }
}

type Phase = "wizard" | "concluido";

export default function OnboardingPage() {
  const router = useRouter();

  const [draft, setDraft] = useState<OnboardingDraft>(DEFAULT_DRAFT);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("wizard");
  const [allergyInput, setAllergyInput] = useState("");
  const [allergyError, setAllergyError] = useState<string | null>(null);
  const [exclusionInput, setExclusionInput] = useState("");
  const [exclusionError, setExclusionError] = useState<string | null>(null);

  // Evita que o efeito de persistência (abaixo) reescreva o rascunho guardado com o estado por
  // defeito antes de o efeito de restauro (também abaixo, mas montado depois) ter corrido.
  const hasHydrated = useRef(false);

  // Restaura o rascunho do localStorage já no cliente (após montar) — corre só uma vez. Não é
  // feito no useState inicial porque este componente é hidratado a partir de HTML gerado no
  // servidor (sem acesso a localStorage); ler aqui evitaria um mismatch de hidratação.
  useEffect(() => {
    const stored = loadStoredDraft();
    if (stored) {
      setDraft(stored.draft);
      setStepIndex(stored.stepIndex);
    }
    hasHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    persistDraft({ draft, stepIndex });
  }, [draft, stepIndex]);

  const saveProfile = useMutation<Profile, Error, Profile>({
    mutationFn: (profile) => api<Profile>("/me/profile", { method: "PUT", body: JSON.stringify(profile) }),
    onSuccess: () => {
      clearStoredDraft();
      setPhase("concluido");
    },
  });

  function updateDraft(patch: Partial<OnboardingDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function addAllergy(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (value.length > MAX_ALLERGY_LENGTH) {
      setAllergyError(`Cada alergia deve ter no máximo ${MAX_ALLERGY_LENGTH} carateres.`);
      return;
    }
    if (draft.allergies.some((a) => a.toLowerCase() === value.toLowerCase())) {
      setAllergyInput("");
      return;
    }
    if (draft.allergies.length >= MAX_ALLERGIES) {
      setAllergyError(`Máximo de ${MAX_ALLERGIES} alergias/exclusões.`);
      return;
    }
    setAllergyError(null);
    updateDraft({ allergies: [...draft.allergies, value] });
    setAllergyInput("");
  }

  function removeAllergy(value: string) {
    updateDraft({ allergies: draft.allergies.filter((a) => a !== value) });
    setAllergyError(null);
  }

  function toggleAllergySuggestion(suggestion: string) {
    const existing = draft.allergies.find((a) => a.toLowerCase() === suggestion.toLowerCase());
    if (existing) {
      removeAllergy(existing);
    } else {
      addAllergy(suggestion);
    }
  }

  function handleAllergyInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addAllergy(allergyInput);
    }
  }

  // "Alimentos que não comes" — separado de "Alergias" a pedido do cliente: são conceitos
  // diferentes (uma exclusão pode ser por opção, não por reação médica).
  function addFoodExclusion(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (value.length > MAX_ALLERGY_LENGTH) {
      setExclusionError(`Cada item deve ter no máximo ${MAX_ALLERGY_LENGTH} carateres.`);
      return;
    }
    if (draft.foodExclusions.some((a) => a.toLowerCase() === value.toLowerCase())) {
      setExclusionInput("");
      return;
    }
    if (draft.foodExclusions.length >= MAX_ALLERGIES) {
      setExclusionError(`Máximo de ${MAX_ALLERGIES} itens.`);
      return;
    }
    setExclusionError(null);
    updateDraft({ foodExclusions: [...draft.foodExclusions, value] });
    setExclusionInput("");
  }

  function removeFoodExclusion(value: string) {
    updateDraft({ foodExclusions: draft.foodExclusions.filter((a) => a !== value) });
    setExclusionError(null);
  }

  function handleExclusionInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addFoodExclusion(exclusionInput);
    }
  }

  // "Nenhuma" é mutuamente exclusiva com as restantes condições (não faz sentido combinar "Nenhuma"
  // com "Diabetes", por exemplo) — selecionar uma limpa a outra.
  function toggleHealthCondition(value: HealthCondition) {
    setDraft((d) => {
      const isSelected = d.healthConditions.includes(value);
      if (isSelected) {
        return { ...d, healthConditions: d.healthConditions.filter((v) => v !== value) };
      }
      if (value === "NENHUMA") {
        return { ...d, healthConditions: ["NENHUMA"] };
      }
      const withoutNenhuma = d.healthConditions.filter((v) => v !== "NENHUMA");
      return { ...d, healthConditions: [...withoutNenhuma, value] };
    });
  }

  // "Sem preferência" é mutuamente exclusiva com as restantes — mesma lógica de "Nenhuma" nas
  // condições de saúde.
  function toggleDietaryPreference(value: string) {
    const isSelected = draft.dietaryPreferences.includes(value);
    if (isSelected) {
      updateDraft({ dietaryPreferences: draft.dietaryPreferences.filter((v) => v !== value) });
      return;
    }
    if (value === "sem_preferencia") {
      updateDraft({ dietaryPreferences: ["sem_preferencia"] });
      return;
    }
    updateDraft({
      dietaryPreferences: [...draft.dietaryPreferences.filter((v) => v !== "sem_preferencia"), value],
    });
  }

  function adjustMeals(delta: number) {
    updateDraft({ mealsPerDay: Math.min(MAX_MEALS, Math.max(MIN_MEALS, draft.mealsPerDay + delta)) });
  }

  function adjustHousehold(delta: number) {
    updateDraft({ householdSize: Math.min(MAX_HOUSEHOLD, Math.max(MIN_HOUSEHOLD, draft.householdSize + delta)) });
  }

  function handleConfirm() {
    const profile: Profile = {
      goal: draft.goal ?? undefined,
      healthConditions: draft.healthConditions,
      healthConditionOther: draft.healthConditions.includes("OUTRA") ? draft.healthConditionOther : undefined,
      allergies: draft.allergies,
      foodExclusions: draft.foodExclusions,
      // dietaryPreferences: campo novo do FE-W02 (F1-CLI-01) — Profile ainda não o declara em
      // src/types/api.d.ts (outro agente em paralelo trata desse ficheiro); assume-se que vai
      // existir como `dietaryPreferences?: string[]`.
      dietaryPreferences: draft.dietaryPreferences,
      budgetBand: draft.budgetBand ?? undefined,
      mealsPerDay: draft.mealsPerDay,
      householdSize: draft.householdSize,
    };
    saveProfile.mutate(profile);
  }

  const steps: WizardStep[] = [
    {
      id: "objetivo",
      content: (
        <div className={styles.step}>
          <div className={styles.illustration}>
            <BrandIllustration variant="onboarding" size={200} />
          </div>
          <h1 className={styles.question}>Qual é o teu objetivo?</h1>
          <div className={styles.optionGrid}>
            {GOAL_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                label={opt.label}
                selected={draft.goal === opt.value}
                onSelect={() => updateDraft({ goal: opt.value })}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "condicao",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Alguma condição de saúde a considerar?</h1>
          <p className={styles.hint}>Podes escolher mais do que uma — por exemplo, diabetes e hipertensão.</p>
          <div className={styles.optionGrid}>
            {HEALTH_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                label={opt.label}
                selected={draft.healthConditions.includes(opt.value)}
                onSelect={() => toggleHealthCondition(opt.value)}
              />
            ))}
          </div>
          {draft.healthConditions.includes("OUTRA") ? (
            <FormField label="Descreve a tua condição" htmlFor="onboarding-health-other">
              <Input
                id="onboarding-health-other"
                type="text"
                value={draft.healthConditionOther}
                placeholder="ex.: gastrite, colesterol elevado, insuficiência renal"
                onChange={(e) => updateDraft({ healthConditionOther: e.target.value })}
              />
            </FormField>
          ) : null}
        </div>
      ),
    },
    {
      // FE-Y03 (ago/2026): "Alergias" e "Alimentos que não comes" passaram a ser dois grupos
      // separados (conceitos diferentes — uma exclusão pode ser por opção, não por reação médica).
      id: "alergias",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>As tuas alergias e exclusões alimentares</h1>
          <p className={styles.hint}>Ambos os campos são opcionais.</p>

          <h2 className={styles.subQuestion}>Alergias</h2>
          <p className={styles.hint}>Ex.: amendoim, marisco, lactose.</p>
          <div className={styles.chipRow}>
            {ALLERGY_SUGGESTIONS.map((suggestion) => {
              const selected = draft.allergies.some((a) => a.toLowerCase() === suggestion.toLowerCase());
              return (
                <button
                  key={suggestion}
                  type="button"
                  className={styles.chipButton}
                  onClick={() => toggleAllergySuggestion(suggestion)}
                  aria-pressed={selected}
                >
                  <Chip variant={selected ? "tan" : "cream"}>{suggestion}</Chip>
                </button>
              );
            })}
          </div>

          <FormField
            label="Adicionar outra alergia"
            htmlFor="onboarding-allergy-input"
            error={allergyError ?? undefined}
            hint={allergyError ? undefined : `Escreve e prime Enter para adicionar (máx. ${MAX_ALLERGIES}).`}
          >
            <div className={styles.allergyInputRow}>
              <Input
                id="onboarding-allergy-input"
                type="text"
                value={allergyInput}
                maxLength={MAX_ALLERGY_LENGTH}
                placeholder="ex.: camarão"
                error={!!allergyError}
                aria-invalid={!!allergyError}
                aria-describedby={allergyError ? formFieldErrorId("onboarding-allergy-input") : undefined}
                onChange={(e) => setAllergyInput(e.target.value)}
                onKeyDown={handleAllergyInputKeyDown}
              />
              <Button type="button" variant="secondary" onClick={() => addAllergy(allergyInput)}>
                Adicionar
              </Button>
            </div>
          </FormField>

          {draft.allergies.length > 0 ? (
            <>
              <p className={styles.selectedAllergiesLabel}>As tuas alergias</p>
              <div className={styles.selectedAllergies}>
                {draft.allergies.map((a) => (
                  <Chip key={a} variant="tan" className={styles.removableChip}>
                    {a}
                    <button
                      type="button"
                      className={styles.removeChipButton}
                      onClick={() => removeAllergy(a)}
                      aria-label={`Remover ${a}`}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </Chip>
                ))}
              </div>
            </>
          ) : null}

          <h2 className={styles.subQuestion}>Alimentos que não comes</h2>
          <p className={styles.hint}>Por opção, não por alergia — ex.: carne vermelha, marisco.</p>
          <FormField
            label="Adicionar alimento"
            htmlFor="onboarding-exclusion-input"
            error={exclusionError ?? undefined}
            hint={exclusionError ? undefined : `Escreve e prime Enter para adicionar (máx. ${MAX_ALLERGIES}).`}
          >
            <div className={styles.allergyInputRow}>
              <Input
                id="onboarding-exclusion-input"
                type="text"
                value={exclusionInput}
                maxLength={MAX_ALLERGY_LENGTH}
                placeholder="ex.: carne de porco"
                error={!!exclusionError}
                aria-invalid={!!exclusionError}
                aria-describedby={exclusionError ? formFieldErrorId("onboarding-exclusion-input") : undefined}
                onChange={(e) => setExclusionInput(e.target.value)}
                onKeyDown={handleExclusionInputKeyDown}
              />
              <Button type="button" variant="secondary" onClick={() => addFoodExclusion(exclusionInput)}>
                Adicionar
              </Button>
            </div>
          </FormField>

          {draft.foodExclusions.length > 0 ? (
            <>
              <p className={styles.selectedAllergiesLabel}>Os alimentos que não comes</p>
              <div className={styles.selectedAllergies}>
                {draft.foodExclusions.map((a) => (
                  <Chip key={a} variant="tan" className={styles.removableChip}>
                    {a}
                    <button
                      type="button"
                      className={styles.removeChipButton}
                      onClick={() => removeFoodExclusion(a)}
                      aria-label={`Remover ${a}`}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </Chip>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ),
    },
    {
      id: "preferencias",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Tens preferências alimentares?</h1>
          <p className={styles.hint}>Opcional. Podes escolher mais do que uma.</p>

          <div className={styles.chipRow}>
            {DIETARY_PREFERENCE_OPTIONS.map((opt) => {
              const selected = draft.dietaryPreferences.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={styles.chipButton}
                  onClick={() => toggleDietaryPreference(opt.value)}
                  aria-pressed={selected}
                >
                  <Chip variant={selected ? "tan" : "cream"}>{opt.label}</Chip>
                </button>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      id: "orcamento",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Qual é o teu orçamento semanal aproximado?</h1>
          <p className={styles.hint}>Opcional — ajuda a ajustar as sugestões da lista de compras.</p>
          <div className={styles.optionGrid}>
            {BUDGET_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                label={opt.label}
                description={opt.description}
                selected={draft.budgetBand === opt.value}
                onSelect={() => updateDraft({ budgetBand: opt.value })}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "refeicoes",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Quantas refeições queres incluir no teu plano?</h1>
          <p className={styles.hint}>Inclui pequeno-almoço, almoço, jantar e, se preferires, lanches.</p>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.stepperButton}
              onClick={() => adjustMeals(-1)}
              disabled={draft.mealsPerDay <= MIN_MEALS}
              aria-label="Diminuir número de refeições por dia"
            >
              <Minus size={18} aria-hidden="true" />
            </button>
            <span className={styles.stepperValue} aria-live="polite">
              {draft.mealsPerDay}
            </span>
            <button
              type="button"
              className={styles.stepperButton}
              onClick={() => adjustMeals(1)}
              disabled={draft.mealsPerDay >= MAX_MEALS}
              aria-label="Aumentar número de refeições por dia"
            >
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      ),
    },
    {
      id: "pessoas",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Quantas pessoas moram contigo?</h1>
          <p className={styles.hint}>Usamos esta informação para ajustar automaticamente as quantidades da tua lista de compras.</p>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.stepperButton}
              onClick={() => adjustHousehold(-1)}
              disabled={draft.householdSize <= MIN_HOUSEHOLD}
              aria-label="Diminuir número de pessoas em casa"
            >
              <Minus size={18} aria-hidden="true" />
            </button>
            <span className={styles.stepperValue} aria-live="polite">
              {draft.householdSize}
            </span>
            <button
              type="button"
              className={styles.stepperButton}
              onClick={() => adjustHousehold(1)}
              disabled={draft.householdSize >= MAX_HOUSEHOLD}
              aria-label="Aumentar número de pessoas em casa"
            >
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      ),
    },
    {
      id: "resumo",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Confirma os teus dados</h1>
          <Card className={styles.summaryCard}>
            <dl className={styles.summaryList}>
              <div className={styles.summaryRow}>
                <dt>Objetivo</dt>
                <dd>{GOAL_OPTIONS.find((o) => o.value === draft.goal)?.label ?? "—"}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Condição de saúde</dt>
                <dd>
                  {draft.healthConditions.length > 0
                    ? draft.healthConditions
                        .map((value) => {
                          const label = HEALTH_OPTIONS.find((o) => o.value === value)?.label ?? value;
                          return value === "OUTRA" && draft.healthConditionOther
                            ? `${label}: ${draft.healthConditionOther}`
                            : label;
                        })
                        .join(", ")
                    : "—"}
                </dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Alergias</dt>
                <dd>{draft.allergies.length > 0 ? draft.allergies.join(", ") : "Nenhuma indicada"}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Alimentos que não comes</dt>
                <dd>{draft.foodExclusions.length > 0 ? draft.foodExclusions.join(", ") : "Nenhum indicado"}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Preferências alimentares</dt>
                <dd>
                  {draft.dietaryPreferences.length > 0
                    ? draft.dietaryPreferences
                        .map((v) => DIETARY_PREFERENCE_OPTIONS.find((o) => o.value === v)?.label ?? v)
                        .join(", ")
                    : "Nenhuma indicada"}
                </dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Orçamento semanal</dt>
                <dd>{BUDGET_OPTIONS.find((o) => o.value === draft.budgetBand)?.label ?? "Não indicado"}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Refeições por dia</dt>
                <dd>{draft.mealsPerDay}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Pessoas em casa</dt>
                <dd>{draft.householdSize}</dd>
              </div>
            </dl>
          </Card>

          {saveProfile.isError ? (
            <ErrorState
              className={styles.submitError}
              message={
                saveProfile.error instanceof ApiError ? saveProfile.error.message : GENERIC_ERROR_MESSAGE
              }
              onRetry={handleConfirm}
            />
          ) : null}
        </div>
      ),
    },
  ];

  if (phase === "concluido") {
    return (
      <main className={styles.successMain}>
        <BrandIllustration variant="onboarding-success" size={180} />
        <h1 className={styles.successTitle}>Tudo pronto!</h1>
        <p className={styles.successText}>
          O teu perfil foi guardado. Já podemos preparar o teu primeiro plano alimentar.
        </p>
        <Button className={styles.successCta} onClick={() => router.push("/plano/gerar")}>
          Gerar o meu plano
        </Button>
      </main>
    );
  }

  const isLastStep = stepIndex === steps.length - 1;
  const currentStepId = steps[stepIndex]?.id;
  const isSaving = saveProfile.isPending;

  let canGoNext = true;
  if (currentStepId === "objetivo") canGoNext = draft.goal !== null;
  else if (currentStepId === "condicao") {
    canGoNext =
      draft.healthConditions.length > 0 &&
      (!draft.healthConditions.includes("OUTRA") || draft.healthConditionOther.trim() !== "");
  }
  if (isSaving) canGoNext = false;

  function handleNext() {
    if (isLastStep) {
      handleConfirm();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function handleBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <Wizard
      steps={steps}
      currentStepIndex={stepIndex}
      onNext={handleNext}
      onBack={handleBack}
      canGoNext={canGoNext}
      nextLabel={isLastStep ? (isSaving ? "A guardar…" : "Confirmar") : "Continuar"}
    />
  );
}
