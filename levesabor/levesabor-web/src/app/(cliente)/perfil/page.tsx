// FE-C07 · T-08 Perfil — cartões editáveis por secção + aviso "vale a partir do próximo plano" + logout (F1-CLI-01)
// Estados: loading · edição · saving · saved (toast) · erro (docs/plano/02-ui-ux-plan.md T-08)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Minus, Plus } from "lucide-react";
import { api, ApiError, queryClient } from "@/lib/api";
import { logout } from "@/lib/auth";
import type { components } from "@/types/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { OptionGroup, type OptionGroupOption } from "@/components/perfil/OptionGroup";
import { ProfileSectionCard } from "@/components/perfil/ProfileSectionCard";
import styles from "./page.module.css";

type Profile = components["schemas"]["Profile"];
type Goal = components["schemas"]["Goal"];
type HealthCondition = components["schemas"]["HealthCondition"];
type BudgetBand = components["schemas"]["BudgetBand"];

// Secções editáveis do cartão (F1-CLI-01) — mesmo vocabulário/enums do onboarding.
type SectionKey = "objetivo" | "condicao" | "alergias" | "orcamento" | "refeicoes" | "pessoas";

const MIN_HOUSEHOLD = 1;
const MAX_HOUSEHOLD = 8;

const GOAL_OPTIONS: OptionGroupOption<Goal>[] = [
  { value: "PERDER_PESO", label: "Perder peso" },
  { value: "COMER_MELHOR", label: "Comer melhor no dia a dia" },
  { value: "GANHAR_MASSA", label: "Ganhar massa" },
  { value: "GERIR_CONDICAO", label: "Gerir uma condição de saúde" },
];
const GOAL_LABELS = Object.fromEntries(GOAL_OPTIONS.map((o) => [o.value, o.label])) as Record<Goal, string>;

const HEALTH_CONDITION_OPTIONS: OptionGroupOption<HealthCondition>[] = [
  { value: "NENHUMA", label: "Nenhuma" },
  { value: "DIABETES_TIPO_2", label: "Diabetes tipo 2" },
  { value: "HIPERTENSAO", label: "Hipertensão" },
  { value: "DOENCA_CELIACA", label: "Doença celíaca" },
];
const HEALTH_CONDITION_LABELS = Object.fromEntries(
  HEALTH_CONDITION_OPTIONS.map((o) => [o.value, o.label]),
) as Record<HealthCondition, string>;

const BUDGET_BAND_OPTIONS: OptionGroupOption<BudgetBand>[] = [
  { value: "BAIXO", label: "Baixo" },
  { value: "MEDIO", label: "Médio" },
  { value: "CONFORTAVEL", label: "Confortável" },
];
const BUDGET_BAND_LABELS = Object.fromEntries(
  BUDGET_BAND_OPTIONS.map((o) => [o.value, o.label]),
) as Record<BudgetBand, string>;

const MEALS_PER_DAY_OPTIONS: OptionGroupOption<string>[] = [2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: `${n} refeições`,
}));

const MAX_ALLERGIES = 20;
const MAX_ALLERGY_LENGTH = 60;
const GENERIC_ERROR_MESSAGE = "Não foi possível guardar. Tenta novamente.";

type SaveVars = { section: SectionKey; patch: Profile };

export default function PerfilPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const profileQuery = useQuery<Profile, Error>({
    queryKey: ["profile"],
    queryFn: () => api<Profile>("/me/profile"),
    retry: false,
  });

  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);

  // Rascunhos locais por secção — inicializados a partir do perfil ao entrar em edição
  // (ver startEdit); só uma secção está em edição de cada vez.
  const [goalDraft, setGoalDraft] = useState<Goal | undefined>(undefined);
  const [healthDraft, setHealthDraft] = useState<HealthCondition | undefined>(undefined);
  const [budgetDraft, setBudgetDraft] = useState<BudgetBand | undefined>(undefined);
  const [mealsDraft, setMealsDraft] = useState<number | undefined>(undefined);
  const [householdDraft, setHouseholdDraft] = useState<number | undefined>(undefined);
  const [allergiesDraft, setAllergiesDraft] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [allergiesLocalError, setAllergiesLocalError] = useState<string | undefined>(undefined);

  const [loggingOut, setLoggingOut] = useState(false);

  const saveMutation = useMutation<Profile, Error, SaveVars>({
    mutationFn: ({ patch }) => api<Profile>("/me/profile", { method: "PUT", body: JSON.stringify(patch) }),
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], data);
      setEditingSection(null);
      showToast("Perfil atualizado.", "success");
    },
  });

  const profile = profileQuery.data;

  function startEdit(section: SectionKey) {
    if (!profile) return;
    if (section === "objetivo") setGoalDraft(profile.goal);
    if (section === "condicao") setHealthDraft(profile.healthCondition);
    if (section === "orcamento") setBudgetDraft(profile.budgetBand);
    if (section === "refeicoes") setMealsDraft(profile.mealsPerDay ?? 3);
    if (section === "pessoas") setHouseholdDraft(profile.householdSize ?? 1);
    if (section === "alergias") {
      setAllergiesDraft(profile.allergies ?? []);
      setAllergyInput("");
      setAllergiesLocalError(undefined);
    }
    setEditingSection(section);
  }

  function cancelEdit() {
    setEditingSection(null);
    setAllergiesLocalError(undefined);
    setAllergyInput("");
  }

  // PUT substitui o recurso Profile inteiro — envia-se sempre o perfil atual com o campo da
  // secção alterado (não apenas o campo isolado), para não depender de semântica de merge parcial
  // no backend real (o mock faz merge, mas o contrato PUT/UpdateProfileRequest não garante isso).
  function save(section: SectionKey, fieldPatch: Partial<Profile>) {
    if (!profile) return;
    const patch: Profile = { ...profile, ...fieldPatch };
    saveMutation.mutate({ section, patch });
  }

  function addAllergy() {
    const value = allergyInput.trim();
    if (!value) return;
    if (value.length > MAX_ALLERGY_LENGTH) {
      setAllergiesLocalError(`Cada alergia deve ter no máximo ${MAX_ALLERGY_LENGTH} caracteres.`);
      return;
    }
    if (allergiesDraft.length >= MAX_ALLERGIES) {
      setAllergiesLocalError(`Máximo de ${MAX_ALLERGIES} alergias/exclusões.`);
      return;
    }
    setAllergiesDraft((prev) => [...prev, value]);
    setAllergyInput("");
    setAllergiesLocalError(undefined);
  }

  function removeAllergy(index: number) {
    setAllergiesDraft((prev) => prev.filter((_, i) => i !== index));
    setAllergiesLocalError(undefined);
  }

  // logout() é best-effort (limpa sempre a sessão local) mas NÃO navega — a navegação é
  // responsabilidade explícita de quem chama (ver docstring em src/lib/auth.ts).
  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.replace("/login");
    }
  }

  if (profileQuery.isLoading) {
    return (
      <main className={styles.main}>
        <Skeleton variant="text" width="50%" height="1.4em" className={styles.headerSkeleton} />
        <Skeleton variant="rect" height="64px" />
        <Skeleton variant="rect" height="88px" />
        <Skeleton variant="rect" height="88px" />
        <Skeleton variant="rect" height="88px" />
        <Skeleton variant="rect" height="88px" />
        <Skeleton variant="rect" height="88px" />
        <Skeleton variant="rect" height="88px" />
      </main>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <main className={styles.main}>
        <ErrorState
          message="Não foi possível carregar o teu perfil. Verifica a tua ligação e tenta novamente."
          onRetry={() => profileQuery.refetch()}
        />
      </main>
    );
  }

  const savingSection = (section: SectionKey) =>
    saveMutation.isPending && saveMutation.variables?.section === section;

  const sectionServerError = (section: SectionKey): string | undefined => {
    if (!saveMutation.isError) return undefined;
    if (saveMutation.variables?.section !== section) return undefined;
    return saveMutation.error instanceof ApiError ? saveMutation.error.message : GENERIC_ERROR_MESSAGE;
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>O teu perfil</h1>
      </header>

      <div className={styles.notice} role="note">
        <AlertCircle size={18} className={styles.noticeIcon} aria-hidden="true" />
        <p className={styles.noticeText}>
          As alterações valem a partir do próximo plano — editar aqui não muda os planos já gerados.
        </p>
      </div>

      <div className={styles.sections}>
        <ProfileSectionCard
          title="Objetivo"
          editing={editingSection === "objetivo"}
          saving={savingSection("objetivo")}
          error={sectionServerError("objetivo")}
          saveDisabled={!goalDraft || savingSection("objetivo")}
          displayValue={profile.goal ? GOAL_LABELS[profile.goal] : "Por definir"}
          onEdit={() => startEdit("objetivo")}
          onCancel={cancelEdit}
          onSave={() => goalDraft && save("objetivo", { goal: goalDraft })}
        >
          <OptionGroup
            name="Objetivo"
            options={GOAL_OPTIONS}
            value={goalDraft}
            onChange={setGoalDraft}
            disabled={savingSection("objetivo")}
          />
        </ProfileSectionCard>

        <ProfileSectionCard
          title="Condição de saúde"
          editing={editingSection === "condicao"}
          saving={savingSection("condicao")}
          error={sectionServerError("condicao")}
          saveDisabled={!healthDraft || savingSection("condicao")}
          displayValue={
            profile.healthCondition ? HEALTH_CONDITION_LABELS[profile.healthCondition] : "Por definir"
          }
          onEdit={() => startEdit("condicao")}
          onCancel={cancelEdit}
          onSave={() => healthDraft && save("condicao", { healthCondition: healthDraft })}
        >
          <OptionGroup
            name="Condição de saúde"
            options={HEALTH_CONDITION_OPTIONS}
            value={healthDraft}
            onChange={setHealthDraft}
            disabled={savingSection("condicao")}
          />
        </ProfileSectionCard>

        <ProfileSectionCard
          title="Alergias"
          editing={editingSection === "alergias"}
          saving={savingSection("alergias")}
          error={allergiesLocalError ?? sectionServerError("alergias")}
          saveDisabled={savingSection("alergias")}
          displayValue={
            profile.allergies && profile.allergies.length > 0 ? (
              <div className={styles.chipRow}>
                {profile.allergies.map((item) => (
                  <Chip key={item} variant="cream">
                    {item}
                  </Chip>
                ))}
              </div>
            ) : (
              "Nenhuma alergia registada."
            )
          }
          onEdit={() => startEdit("alergias")}
          onCancel={cancelEdit}
          onSave={() => save("alergias", { allergies: allergiesDraft })}
        >
          <div className={styles.allergyEditor}>
            {allergiesDraft.length > 0 ? (
              <div className={styles.chipRow}>
                {allergiesDraft.map((item, index) => (
                  <span key={`${item}-${index}`} className={styles.removableChip}>
                    {item}
                    <button
                      type="button"
                      aria-label={`Remover ${item}`}
                      className={styles.removeChipButton}
                      onClick={() => removeAllergy(index)}
                      disabled={savingSection("alergias")}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className={styles.allergyEmptyHint}>Ainda não adicionaste nenhuma alergia ou exclusão.</p>
            )}
            <div className={styles.allergyInputRow}>
              <Input
                type="text"
                placeholder="Ex.: amendoim, marisco, lactose"
                value={allergyInput}
                disabled={savingSection("alergias")}
                maxLength={MAX_ALLERGY_LENGTH}
                onChange={(e) => setAllergyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAllergy();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addAllergy}
                disabled={savingSection("alergias") || !allergyInput.trim()}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </ProfileSectionCard>

        <ProfileSectionCard
          title="Orçamento"
          editing={editingSection === "orcamento"}
          saving={savingSection("orcamento")}
          error={sectionServerError("orcamento")}
          saveDisabled={!budgetDraft || savingSection("orcamento")}
          displayValue={profile.budgetBand ? BUDGET_BAND_LABELS[profile.budgetBand] : "Por definir"}
          onEdit={() => startEdit("orcamento")}
          onCancel={cancelEdit}
          onSave={() => budgetDraft && save("orcamento", { budgetBand: budgetDraft })}
        >
          <OptionGroup
            name="Orçamento"
            options={BUDGET_BAND_OPTIONS}
            value={budgetDraft}
            onChange={setBudgetDraft}
            disabled={savingSection("orcamento")}
          />
        </ProfileSectionCard>

        <ProfileSectionCard
          title="Refeições por dia"
          editing={editingSection === "refeicoes"}
          saving={savingSection("refeicoes")}
          error={sectionServerError("refeicoes")}
          saveDisabled={mealsDraft === undefined || savingSection("refeicoes")}
          displayValue={profile.mealsPerDay ? `${profile.mealsPerDay} refeições por dia` : "Por definir"}
          onEdit={() => startEdit("refeicoes")}
          onCancel={cancelEdit}
          onSave={() => mealsDraft !== undefined && save("refeicoes", { mealsPerDay: mealsDraft })}
        >
          <OptionGroup
            name="Refeições por dia"
            options={MEALS_PER_DAY_OPTIONS}
            value={mealsDraft !== undefined ? String(mealsDraft) : undefined}
            onChange={(value) => setMealsDraft(Number(value))}
            disabled={savingSection("refeicoes")}
          />
        </ProfileSectionCard>

        <ProfileSectionCard
          title="Pessoas em casa"
          editing={editingSection === "pessoas"}
          saving={savingSection("pessoas")}
          error={sectionServerError("pessoas")}
          saveDisabled={householdDraft === undefined || savingSection("pessoas")}
          displayValue={
            profile.householdSize
              ? `${profile.householdSize} ${profile.householdSize === 1 ? "pessoa" : "pessoas"}`
              : "1 pessoa"
          }
          onEdit={() => startEdit("pessoas")}
          onCancel={cancelEdit}
          onSave={() => householdDraft !== undefined && save("pessoas", { householdSize: householdDraft })}
        >
          <div className={styles.householdStepper}>
            <button
              type="button"
              className={styles.householdButton}
              onClick={() => setHouseholdDraft((v) => Math.max(MIN_HOUSEHOLD, (v ?? 1) - 1))}
              disabled={savingSection("pessoas") || (householdDraft ?? 1) <= MIN_HOUSEHOLD}
              aria-label="Diminuir número de pessoas em casa"
            >
              <Minus size={16} aria-hidden="true" />
            </button>
            <span className={styles.householdValue} aria-live="polite">
              {householdDraft ?? 1}
            </span>
            <button
              type="button"
              className={styles.householdButton}
              onClick={() => setHouseholdDraft((v) => Math.min(MAX_HOUSEHOLD, (v ?? 1) + 1))}
              disabled={savingSection("pessoas") || (householdDraft ?? 1) >= MAX_HOUSEHOLD}
              aria-label="Aumentar número de pessoas em casa"
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
          <p className={styles.householdHint}>
            Ao contrário das outras secções, isto ajusta já a lista de compras e as receitas do plano
            atual — não só dos próximos planos.
          </p>
        </ProfileSectionCard>
      </div>

      <div className={styles.logoutRow}>
        <Button variant="secondary" onClick={handleLogout} loading={loggingOut} disabled={loggingOut}>
          Terminar sessão
        </Button>
      </div>
    </main>
  );
}
