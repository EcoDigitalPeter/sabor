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
type SectionKey =
  | "objetivo"
  | "condicao"
  | "alergias"
  | "exclusoes"
  | "preferencias"
  | "zonaCompras"
  | "orcamento"
  | "refeicoes"
  | "pessoas";

const MIN_HOUSEHOLD = 1;
const MAX_HOUSEHOLD = 8;

const GOAL_OPTIONS: OptionGroupOption<Goal>[] = [
  { value: "PERDER_PESO", label: "Emagrecer" },
  { value: "COMER_MELHOR", label: "Comer melhor no dia a dia" },
  { value: "GANHAR_MASSA", label: "Ganhar massa muscular" },
  { value: "GERIR_CONDICAO", label: "Controlar uma condição de saúde" },
];
const GOAL_LABELS = Object.fromEntries(GOAL_OPTIONS.map((o) => [o.value, o.label])) as Record<Goal, string>;

// FE-Y02 (ago/2026): seleção múltipla + "Outra" (texto livre) — ver onboarding/page.tsx.
const HEALTH_CONDITION_OPTIONS: OptionGroupOption<HealthCondition>[] = [
  { value: "NENHUMA", label: "Nenhuma" },
  { value: "DIABETES_TIPO_2", label: "Diabetes tipo 2" },
  { value: "HIPERTENSAO", label: "Hipertensão" },
  { value: "DOENCA_CELIACA", label: "Doença celíaca" },
  { value: "OUTRA", label: "Outra" },
];
const HEALTH_CONDITION_LABELS = Object.fromEntries(
  HEALTH_CONDITION_OPTIONS.map((o) => [o.value, o.label]),
) as Record<HealthCondition, string>;

const BUDGET_BAND_OPTIONS: OptionGroupOption<BudgetBand>[] = [
  { value: "BAIXO", label: "Económico" },
  { value: "MEDIO", label: "Equilibrado" },
  { value: "CONFORTAVEL", label: "Premium" },
];
const BUDGET_BAND_LABELS = Object.fromEntries(
  BUDGET_BAND_OPTIONS.map((o) => [o.value, o.label]),
) as Record<BudgetBand, string>;

const MEALS_PER_DAY_OPTIONS: OptionGroupOption<string>[] = [2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: `${n} refeições`,
}));

// Vocabulário fechado de F1-CLI-01 (mesmo usado no onboarding, docs/plano/01-functional-plan.md
// linha 155/181) — mesmo vocabulário das `healthTags` já usadas nas receitas.
const DIETARY_PREFERENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "vegetariana", label: "Vegetariana" },
  { value: "vegan", label: "Vegana" },
  { value: "sem_gluten", label: "Sem glúten" },
  { value: "sem_lactose", label: "Sem lactose" },
  { value: "alta_proteina", label: "Alta proteína" },
  { value: "baixo_calorico", label: "Baixo em calorias" },
  { value: "sem_preferencia", label: "Sem preferência" },
];

const MAX_ALLERGIES = 20;
const MAX_ALLERGY_LENGTH = 60;
const MAX_LOCATION_LENGTH = 80;
const MAX_NEIGHBORHOOD_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 180;
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
  const [healthDraft, setHealthDraft] = useState<HealthCondition[]>([]);
  const [healthOtherDraft, setHealthOtherDraft] = useState("");
  const [budgetDraft, setBudgetDraft] = useState<BudgetBand | undefined>(undefined);
  const [mealsDraft, setMealsDraft] = useState<number | undefined>(undefined);
  const [householdDraft, setHouseholdDraft] = useState<number | undefined>(undefined);
  const [allergiesDraft, setAllergiesDraft] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [allergiesLocalError, setAllergiesLocalError] = useState<string | undefined>(undefined);
  // FE-Y03 (ago/2026): "Alimentos que não comes" — separado de "Alergias" (conceitos diferentes).
  const [exclusionsDraft, setExclusionsDraft] = useState<string[]>([]);
  const [exclusionInput, setExclusionInput] = useState("");
  const [exclusionsLocalError, setExclusionsLocalError] = useState<string | undefined>(undefined);
  const [dietaryPreferencesDraft, setDietaryPreferencesDraft] = useState<string[]>([]);
  const [shoppingProvinceDraft, setShoppingProvinceDraft] = useState("");
  const [shoppingCityDraft, setShoppingCityDraft] = useState("");
  const [shoppingNeighborhoodDraft, setShoppingNeighborhoodDraft] = useState("");
  const [shoppingAddressDescriptionDraft, setShoppingAddressDescriptionDraft] = useState("");
  const [locationLocalError, setLocationLocalError] = useState<string | undefined>(undefined);

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
    if (section === "condicao") {
      setHealthDraft(profile.healthConditions ?? []);
      setHealthOtherDraft(profile.healthConditionOther ?? "");
    }
    if (section === "orcamento") setBudgetDraft(profile.budgetBand);
    if (section === "refeicoes") setMealsDraft(profile.mealsPerDay ?? 3);
    if (section === "pessoas") setHouseholdDraft(profile.householdSize ?? 1);
    if (section === "alergias") {
      setAllergiesDraft(profile.allergies ?? []);
      setAllergyInput("");
      setAllergiesLocalError(undefined);
    }
    if (section === "exclusoes") {
      setExclusionsDraft(profile.foodExclusions ?? []);
      setExclusionInput("");
      setExclusionsLocalError(undefined);
    }
    // dietaryPreferences: campo novo do FE-W02 (F1-CLI-01) — Profile ainda não o declara em
    // src/types/api.d.ts (outro agente em paralelo trata desse ficheiro); assume-se que vai
    // existir como `dietaryPreferences?: string[]`.
    if (section === "preferencias") setDietaryPreferencesDraft(profile.dietaryPreferences ?? []);
    if (section === "zonaCompras") {
      setShoppingProvinceDraft(profile.shoppingProvince ?? "");
      setShoppingCityDraft(profile.shoppingCity ?? "");
      setShoppingNeighborhoodDraft(profile.shoppingNeighborhood ?? "");
      setShoppingAddressDescriptionDraft(profile.shoppingAddressDescription ?? "");
      setLocationLocalError(undefined);
    }
    setEditingSection(section);
  }

  function cancelEdit() {
    setEditingSection(null);
    setAllergiesLocalError(undefined);
    setAllergyInput("");
    setExclusionsLocalError(undefined);
    setExclusionInput("");
    setLocationLocalError(undefined);
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

  function addExclusion() {
    const value = exclusionInput.trim();
    if (!value) return;
    if (value.length > MAX_ALLERGY_LENGTH) {
      setExclusionsLocalError(`Cada item deve ter no máximo ${MAX_ALLERGY_LENGTH} caracteres.`);
      return;
    }
    if (exclusionsDraft.length >= MAX_ALLERGIES) {
      setExclusionsLocalError(`Máximo de ${MAX_ALLERGIES} itens.`);
      return;
    }
    setExclusionsDraft((prev) => [...prev, value]);
    setExclusionInput("");
    setExclusionsLocalError(undefined);
  }

  function removeExclusion(index: number) {
    setExclusionsDraft((prev) => prev.filter((_, i) => i !== index));
    setExclusionsLocalError(undefined);
  }

  // Mesma exclusividade do onboarding: "Nenhuma" limpa as restantes e vice-versa.
  function toggleHealthCondition(value: HealthCondition) {
    setHealthDraft((prev) => {
      const isSelected = prev.includes(value);
      if (isSelected) return prev.filter((v) => v !== value);
      if (value === "NENHUMA") return ["NENHUMA"];
      return [...prev.filter((v) => v !== "NENHUMA"), value];
    });
  }

  function toggleDietaryPreference(value: string) {
    setDietaryPreferencesDraft((prev) => {
      const isSelected = prev.includes(value);
      if (isSelected) return prev.filter((v) => v !== value);
      if (value === "sem_preferencia") return ["sem_preferencia"];
      return [...prev.filter((v) => v !== "sem_preferencia"), value];
    });
  }

  function saveShoppingLocation() {
    const province = shoppingProvinceDraft.trim();
    const city = shoppingCityDraft.trim();
    const neighborhood = shoppingNeighborhoodDraft.trim();
    const description = shoppingAddressDescriptionDraft.trim();

    if (!province || !city || !neighborhood) {
      setLocationLocalError("Preenche a província, a cidade e o bairro/zona.");
      return;
    }
    if (province.length > MAX_LOCATION_LENGTH || city.length > MAX_LOCATION_LENGTH) {
      setLocationLocalError(`Província e cidade devem ter no máximo ${MAX_LOCATION_LENGTH} caracteres.`);
      return;
    }
    if (neighborhood.length > MAX_NEIGHBORHOOD_LENGTH) {
      setLocationLocalError(`O bairro ou zona deve ter no máximo ${MAX_NEIGHBORHOOD_LENGTH} caracteres.`);
      return;
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setLocationLocalError(`A descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres.`);
      return;
    }

    setLocationLocalError(undefined);
    save("zonaCompras", {
      shoppingProvince: province,
      shoppingCity: city,
      shoppingNeighborhood: neighborhood,
      shoppingAddressDescription: description || undefined,
    });
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
          title="Objectivo"
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
            name="Objectivo"
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
          saveDisabled={
            healthDraft.length === 0 ||
            (healthDraft.includes("OUTRA") && !healthOtherDraft.trim()) ||
            savingSection("condicao")
          }
          displayValue={
            profile.healthConditions && profile.healthConditions.length > 0
              ? profile.healthConditions
                  .map((value) =>
                    value === "OUTRA" && profile.healthConditionOther
                      ? `${HEALTH_CONDITION_LABELS[value]}: ${profile.healthConditionOther}`
                      : HEALTH_CONDITION_LABELS[value],
                  )
                  .join(", ")
              : "Por definir"
          }
          onEdit={() => startEdit("condicao")}
          onCancel={cancelEdit}
          onSave={() =>
            healthDraft.length > 0 &&
            save("condicao", {
              healthConditions: healthDraft,
              healthConditionOther: healthDraft.includes("OUTRA") ? healthOtherDraft : undefined,
            })
          }
        >
          <div className={styles.chipRow}>
            {HEALTH_CONDITION_OPTIONS.map((opt) => {
              const selected = healthDraft.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={styles.chipButton}
                  onClick={() => toggleHealthCondition(opt.value)}
                  aria-pressed={selected}
                  disabled={savingSection("condicao")}
                >
                  <Chip variant={selected ? "tan" : "cream"}>{opt.label}</Chip>
                </button>
              );
            })}
          </div>
          {healthDraft.includes("OUTRA") ? (
            <Input
              type="text"
              placeholder="Descreve a tua condição"
              value={healthOtherDraft}
              disabled={savingSection("condicao")}
              onChange={(e) => setHealthOtherDraft(e.target.value)}
            />
          ) : null}
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
              <p className={styles.allergyEmptyHint}>Ainda não adicionaste nenhuma alergia.</p>
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
          title="Alimentos que não comes"
          editing={editingSection === "exclusoes"}
          saving={savingSection("exclusoes")}
          error={exclusionsLocalError ?? sectionServerError("exclusoes")}
          saveDisabled={savingSection("exclusoes")}
          displayValue={
            profile.foodExclusions && profile.foodExclusions.length > 0 ? (
              <div className={styles.chipRow}>
                {profile.foodExclusions.map((item) => (
                  <Chip key={item} variant="cream">
                    {item}
                  </Chip>
                ))}
              </div>
            ) : (
              "Nenhum alimento excluído."
            )
          }
          onEdit={() => startEdit("exclusoes")}
          onCancel={cancelEdit}
          onSave={() => save("exclusoes", { foodExclusions: exclusionsDraft })}
        >
          <div className={styles.allergyEditor}>
            {exclusionsDraft.length > 0 ? (
              <div className={styles.chipRow}>
                {exclusionsDraft.map((item, index) => (
                  <span key={`${item}-${index}`} className={styles.removableChip}>
                    {item}
                    <button
                      type="button"
                      aria-label={`Remover ${item}`}
                      className={styles.removeChipButton}
                      onClick={() => removeExclusion(index)}
                      disabled={savingSection("exclusoes")}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className={styles.allergyEmptyHint}>Por opção, não por alergia — ex.: carne vermelha.</p>
            )}
            <div className={styles.allergyInputRow}>
              <Input
                type="text"
                placeholder="Ex.: carne de porco"
                value={exclusionInput}
                disabled={savingSection("exclusoes")}
                maxLength={MAX_ALLERGY_LENGTH}
                onChange={(e) => setExclusionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addExclusion();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addExclusion}
                disabled={savingSection("exclusoes") || !exclusionInput.trim()}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </ProfileSectionCard>

        <ProfileSectionCard
          title="Preferências alimentares"
          editing={editingSection === "preferencias"}
          saving={savingSection("preferencias")}
          error={sectionServerError("preferencias")}
          saveDisabled={savingSection("preferencias")}
          displayValue={
            profile.dietaryPreferences && profile.dietaryPreferences.length > 0 ? (
              <div className={styles.chipRow}>
                {profile.dietaryPreferences.map((item) => (
                  <Chip key={item} variant="cream">
                    {DIETARY_PREFERENCE_OPTIONS.find((o) => o.value === item)?.label ?? item}
                  </Chip>
                ))}
              </div>
            ) : (
              "Nenhuma preferência registada."
            )
          }
          onEdit={() => startEdit("preferencias")}
          onCancel={cancelEdit}
          onSave={() =>
            // "sem_preferencia" é valor só de UI (chip mutuamente exclusivo) — o backend
            // (ProfileService.DIETARY_PREFERENCES_VOCAB) não o reconhece e rejeita com
            // LSA001_VALIDATION; "sem preferências" chega ao backend como array vazio.
            save("preferencias", {
              dietaryPreferences: dietaryPreferencesDraft.filter((v) => v !== "sem_preferencia"),
            })
          }
        >
          <div className={styles.chipRow}>
            {DIETARY_PREFERENCE_OPTIONS.map((opt) => {
              const selected = dietaryPreferencesDraft.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={styles.chipButton}
                  onClick={() => toggleDietaryPreference(opt.value)}
                  aria-pressed={selected}
                  disabled={savingSection("preferencias")}
                >
                  <Chip variant={selected ? "tan" : "cream"}>{opt.label}</Chip>
                </button>
              );
            })}
          </div>
        </ProfileSectionCard>

        <ProfileSectionCard
          title="Zona para compras"
          editing={editingSection === "zonaCompras"}
          saving={savingSection("zonaCompras")}
          error={locationLocalError ?? sectionServerError("zonaCompras")}
          saveDisabled={savingSection("zonaCompras")}
          displayValue={
            profile.shoppingProvince || profile.shoppingCity || profile.shoppingNeighborhood ? (
              <span>
                {[profile.shoppingNeighborhood, profile.shoppingCity, profile.shoppingProvince].filter(Boolean).join(", ")}
                {profile.shoppingAddressDescription ? ` · ${profile.shoppingAddressDescription}` : ""}
              </span>
            ) : (
              "Define a tua zona para mostrarmos as lojas mais próximas primeiro."
            )
          }
          onEdit={() => startEdit("zonaCompras")}
          onCancel={cancelEdit}
          onSave={saveShoppingLocation}
        >
          <div className={styles.locationGrid}>
            <Input
              type="text"
              placeholder="Província"
              value={shoppingProvinceDraft}
              maxLength={MAX_LOCATION_LENGTH}
              disabled={savingSection("zonaCompras")}
              onChange={(event) => setShoppingProvinceDraft(event.target.value)}
              aria-label="Província para compras"
            />
            <Input
              type="text"
              placeholder="Cidade"
              value={shoppingCityDraft}
              maxLength={MAX_LOCATION_LENGTH}
              disabled={savingSection("zonaCompras")}
              onChange={(event) => setShoppingCityDraft(event.target.value)}
              aria-label="Cidade para compras"
            />
            <Input
              type="text"
              placeholder="Bairro ou zona"
              value={shoppingNeighborhoodDraft}
              maxLength={MAX_NEIGHBORHOOD_LENGTH}
              disabled={savingSection("zonaCompras")}
              onChange={(event) => setShoppingNeighborhoodDraft(event.target.value)}
              aria-label="Bairro ou zona para compras"
            />
            <Input
              type="text"
              placeholder="Descrição opcional (ex.: perto do mercado)"
              value={shoppingAddressDescriptionDraft}
              maxLength={MAX_DESCRIPTION_LENGTH}
              disabled={savingSection("zonaCompras")}
              onChange={(event) => setShoppingAddressDescriptionDraft(event.target.value)}
              aria-label="Descrição da zona para compras"
            />
          </div>
          <p className={styles.locationHint}>
            Usamos esta zona apenas para ordenar as lojas por proximidade quando fores encomendar.
          </p>
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
            actual — não só dos próximos planos.
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
