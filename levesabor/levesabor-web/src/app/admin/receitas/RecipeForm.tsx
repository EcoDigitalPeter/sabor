// FE-D06 · T-18 Formulário de receita — partilhado entre nova/page.tsx e [id]/page.tsx.
// Ingredientes dinâmicos + passos ordenáveis + tags (vocabulário fechado) + macros calculadas
// pelo mock a partir dos ingredientes (com override manual opcional). Validação manual
// (useState + mapa de erros), mesmo padrão de src/app/admin/ingredientes/IngredientSheet.tsx.
"use client";

import { useId, useState, type FormEvent } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAdminIngredients } from "@/hooks/useAdminIngredients";
import { useCreateRecipe, useUpdateRecipe, type Recipe, type RecipeRequest } from "@/hooks/useAdminRecipes";
import { HEALTH_TAGS_VOCAB } from "@/data/health-tags";
import { FormField, formFieldErrorId } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import { useToast } from "@/components/ui/Toast";
import styles from "./RecipeForm.module.css";

type IngredientRow = { key: string; ingredientId: string; name: string; quantity: string; unit: string };
type StepRow = { key: string; text: string };

export type RecipeFormProps = {
  mode: "create" | "edit";
  recipe?: Recipe;
  onSaved: (recipe: Recipe) => void;
};

type FormErrors = Partial<Record<"name" | "prepMinutes" | "servings" | "ingredients" | "steps", string>>;

function newKey(): string {
  return Math.random().toString(36).slice(2);
}

function toIngredientRows(recipe?: Recipe): IngredientRow[] {
  const lines = recipe?.ingredients ?? [];
  if (lines.length === 0) return [{ key: newKey(), ingredientId: "", name: "", quantity: "", unit: "" }];
  return lines.map((line) => ({
    key: newKey(),
    ingredientId: line.ingredientId != null ? String(line.ingredientId) : "",
    name: line.name ?? "",
    quantity: line.quantity != null ? String(line.quantity) : "",
    unit: line.unit ?? "",
  }));
}

function toStepRows(recipe?: Recipe): StepRow[] {
  const steps = recipe?.steps ?? [];
  if (steps.length === 0) return [{ key: newKey(), text: "" }, { key: newKey(), text: "" }];
  return [...steps]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((step) => ({ key: newKey(), text: step.text ?? "" }));
}

export function RecipeForm({ mode, recipe, onSaved }: RecipeFormProps) {
  const idPrefix = useId();
  const { showToast } = useToast();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe(recipe?.id ?? -1);
  const mutation = mode === "edit" ? updateRecipe : createRecipe;

  const { data: ingredientCatalog } = useAdminIngredients({ page: 0, size: 100, q: "" });
  const ingredientOptions = [
    { value: "", label: "Escolhe um ingrediente…" },
    ...(ingredientCatalog?.items ?? []).map((ing) => ({ value: String(ing.id), label: ing.name ?? `#${ing.id}` })),
  ];

  const [name, setName] = useState(recipe?.name ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [prepMinutes, setPrepMinutes] = useState(recipe?.prepMinutes != null ? String(recipe.prepMinutes) : "");
  const [servings, setServings] = useState(recipe?.servings != null ? String(recipe.servings) : "1");
  const [estimatedCostMt, setEstimatedCostMt] = useState(
    recipe?.estimatedCostMt != null ? String(recipe.estimatedCostMt) : "",
  );
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() => toIngredientRows(recipe));
  const [steps, setSteps] = useState<StepRow[]>(() => toStepRows(recipe));
  const [healthTags, setHealthTags] = useState<string[]>(recipe?.healthTags ?? []);
  const [useOverride, setUseOverride] = useState(false);
  const [overrideMacros, setOverrideMacros] = useState({ proteina: "", carbs: "", gordura: "", fibra: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateIngredientRow(key: string, patch: Partial<IngredientRow>) {
    setIngredients((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function handleIngredientSelect(key: string, ingredientIdValue: string) {
    const selected = ingredientCatalog?.items?.find((ing) => String(ing.id) === ingredientIdValue);
    updateIngredientRow(key, {
      ingredientId: ingredientIdValue,
      name: selected?.name ?? "",
      unit: selected?.baseUnit ?? "",
    });
  }

  function addIngredientRow() {
    setIngredients((rows) => [...rows, { key: newKey(), ingredientId: "", name: "", quantity: "", unit: "" }]);
  }

  function removeIngredientRow(key: string) {
    setIngredients((rows) => (rows.length <= 1 ? rows : rows.filter((row) => row.key !== key)));
  }

  function addStep() {
    setSteps((rows) => [...rows, { key: newKey(), text: "" }]);
  }

  function removeStep(key: string) {
    setSteps((rows) => (rows.length <= 1 ? rows : rows.filter((row) => row.key !== key)));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((rows) => {
      const target = index + direction;
      if (target < 0 || target >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleTag(tag: string) {
    setHealthTags((tags) => (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]));
  }

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};
    if (name.trim().length < 2) nextErrors.name = "O nome deve ter pelo menos 2 caracteres.";
    if (!prepMinutes || Number(prepMinutes) < 0) nextErrors.prepMinutes = "Indica os minutos de preparação.";
    if (!servings || Number(servings) < 1) nextErrors.servings = "Indica o número de doses (mínimo 1).";
    const validIngredients = ingredients.filter((row) => row.ingredientId && row.quantity);
    if (validIngredients.length === 0) nextErrors.ingredients = "Adiciona pelo menos um ingrediente com quantidade.";
    const validSteps = steps.filter((row) => row.text.trim().length > 0);
    if (validSteps.length < 2) nextErrors.steps = "Adiciona pelo menos 2 passos.";
    return nextErrors;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const body: RecipeRequest = {
      name: name.trim(),
      description: description.trim() || null,
      prepMinutes: Number(prepMinutes),
      servings: Number(servings),
      estimatedCostMt: estimatedCostMt.trim() ? Number(estimatedCostMt) : null,
      healthTags,
      ingredients: ingredients
        .filter((row) => row.ingredientId && row.quantity)
        .map((row) => ({
          ingredientId: Number(row.ingredientId),
          name: row.name,
          quantity: Number(row.quantity),
          unit: row.unit,
        })),
      steps: steps
        .filter((row) => row.text.trim().length > 0)
        .map((row, index) => ({ order: index + 1, text: row.text.trim() })),
      ...(useOverride
        ? {
            macrosOverride: {
              proteina: Number(overrideMacros.proteina) || 0,
              carbs: Number(overrideMacros.carbs) || 0,
              gordura: Number(overrideMacros.gordura) || 0,
              fibra: Number(overrideMacros.fibra) || 0,
            },
          }
        : {}),
    };

    setSubmitError(null);
    mutation.mutate(body, {
      onSuccess: (saved) => {
        showToast(mode === "edit" ? "Receita atualizada." : "Receita criada.");
        onSaved(saved);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === "LSA006_DUPLICATE") {
          setErrors((current) => ({ ...current, name: error.message }));
        } else {
          setSubmitError(error instanceof ApiError ? error.message : "Não foi possível guardar a receita.");
        }
      },
    });
  }

  const nameId = `${idPrefix}-name`;
  const descriptionId = `${idPrefix}-description`;
  const prepId = `${idPrefix}-prep`;
  const servingsId = `${idPrefix}-servings`;
  const costId = `${idPrefix}-cost`;

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <Card className={styles.section}>
        <FormField label="Nome" htmlFor={nameId} required error={errors.name}>
          <Input
            id={nameId}
            value={name}
            error={!!errors.name}
            aria-describedby={errors.name ? formFieldErrorId(nameId) : undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>

        <FormField label="Descrição" htmlFor={descriptionId} hint="Opcional.">
          <textarea
            id={descriptionId}
            className={styles.textarea}
            value={description ?? ""}
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormField>

        <div className={styles.row}>
          <FormField label="Preparação (min)" htmlFor={prepId} required error={errors.prepMinutes}>
            <Input
              id={prepId}
              type="number"
              min={0}
              value={prepMinutes}
              error={!!errors.prepMinutes}
              onChange={(event) => setPrepMinutes(event.target.value)}
            />
          </FormField>
          <FormField label="Doses" htmlFor={servingsId} required error={errors.servings}>
            <Input
              id={servingsId}
              type="number"
              min={1}
              value={servings}
              error={!!errors.servings}
              onChange={(event) => setServings(event.target.value)}
            />
          </FormField>
          <FormField label="Custo estimado (MT)" htmlFor={costId} hint="Opcional.">
            <Input
              id={costId}
              type="number"
              min={0}
              value={estimatedCostMt}
              onChange={(event) => setEstimatedCostMt(event.target.value)}
            />
          </FormField>
        </div>
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Ingredientes</h2>
        {errors.ingredients ? <p className={styles.fieldError}>{errors.ingredients}</p> : null}

        {ingredients.map((row) => (
          <div key={row.key} className={styles.ingredientRow}>
            <Select
              aria-label="Ingrediente"
              options={ingredientOptions}
              value={row.ingredientId}
              onChange={(event) => handleIngredientSelect(row.key, event.target.value)}
            />
            <Input
              aria-label="Quantidade"
              type="number"
              min={0}
              step="any"
              placeholder="Qtd."
              value={row.quantity}
              onChange={(event) => updateIngredientRow(row.key, { quantity: event.target.value })}
            />
            <Input
              aria-label="Unidade"
              placeholder="Unidade"
              value={row.unit}
              onChange={(event) => updateIngredientRow(row.key, { unit: event.target.value })}
            />
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Remover ingrediente"
              onClick={() => removeIngredientRow(row.key)}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}

        <Button type="button" variant="secondary" size="sm" onClick={addIngredientRow}>
          <Plus size={16} aria-hidden="true" /> Adicionar ingrediente
        </Button>
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Passos</h2>
        {errors.steps ? <p className={styles.fieldError}>{errors.steps}</p> : null}

        {steps.map((row, index) => (
          <div key={row.key} className={styles.stepRow}>
            <span className={styles.stepNumber}>{index + 1}</span>
            <Input
              aria-label={`Passo ${index + 1}`}
              value={row.text}
              onChange={(event) => setSteps((rows) => rows.map((r) => (r.key === row.key ? { ...r, text: event.target.value } : r)))}
            />
            <div className={styles.stepActions}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Mover passo ${index + 1} para cima`}
                disabled={index === 0}
                onClick={() => moveStep(index, -1)}
              >
                <ArrowUp size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Mover passo ${index + 1} para baixo`}
                disabled={index === steps.length - 1}
                onClick={() => moveStep(index, 1)}
              >
                <ArrowDown size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Remover passo ${index + 1}`}
                onClick={() => removeStep(row.key)}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}

        <Button type="button" variant="secondary" size="sm" onClick={addStep}>
          <Plus size={16} aria-hidden="true" /> Adicionar passo
        </Button>
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Tags de saúde</h2>
        <div className={styles.tagRow}>
          {HEALTH_TAGS_VOCAB.map((tag) => (
            <button
              key={tag.value}
              type="button"
              onClick={() => toggleTag(tag.value)}
              className={styles.tagButton}
              aria-pressed={healthTags.includes(tag.value)}
            >
              <Chip variant={healthTags.includes(tag.value) ? "cream" : "tan"}>{tag.label}</Chip>
            </button>
          ))}
        </div>
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Macros</h2>
        {recipe?.kcal ? (
          <div className={styles.macroPanel}>
            <MacroRing
              size="md"
              kcal={recipe.kcal}
              macros={{
                proteina: recipe.macros?.proteina ?? 0,
                carbs: recipe.macros?.carbs ?? 0,
                gordura: recipe.macros?.gordura ?? 0,
                fibra: recipe.macros?.fibra ?? 0,
              }}
            />
            <p className={styles.macroHint}>
              Calculadas automaticamente a partir dos ingredientes. Guarda a receita outra vez depois de alterar
              ingredientes para atualizar.
            </p>
          </div>
        ) : (
          <p className={styles.macroHint}>As macros são calculadas automaticamente ao guardar a receita.</p>
        )}

        <Checkbox
          label="Usar valores de macros personalizados (em vez do cálculo automático)"
          checked={useOverride}
          onChange={(event) => setUseOverride(event.target.checked)}
        />

        {useOverride ? (
          <div className={styles.row}>
            <FormField label="Proteína %" htmlFor={`${idPrefix}-ov-p`}>
              <Input
                id={`${idPrefix}-ov-p`}
                type="number"
                min={0}
                max={100}
                value={overrideMacros.proteina}
                onChange={(event) => setOverrideMacros((v) => ({ ...v, proteina: event.target.value }))}
              />
            </FormField>
            <FormField label="Carbs %" htmlFor={`${idPrefix}-ov-c`}>
              <Input
                id={`${idPrefix}-ov-c`}
                type="number"
                min={0}
                max={100}
                value={overrideMacros.carbs}
                onChange={(event) => setOverrideMacros((v) => ({ ...v, carbs: event.target.value }))}
              />
            </FormField>
            <FormField label="Gordura %" htmlFor={`${idPrefix}-ov-g`}>
              <Input
                id={`${idPrefix}-ov-g`}
                type="number"
                min={0}
                max={100}
                value={overrideMacros.gordura}
                onChange={(event) => setOverrideMacros((v) => ({ ...v, gordura: event.target.value }))}
              />
            </FormField>
            <FormField label="Fibra %" htmlFor={`${idPrefix}-ov-f`}>
              <Input
                id={`${idPrefix}-ov-f`}
                type="number"
                min={0}
                max={100}
                value={overrideMacros.fibra}
                onChange={(event) => setOverrideMacros((v) => ({ ...v, fibra: event.target.value }))}
              />
            </FormField>
          </div>
        ) : null}
      </Card>

      {submitError ? (
        <p role="alert" className={styles.submitError}>
          {submitError}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button type="submit" variant="primary" loading={mutation.isPending} disabled={mutation.isPending}>
          {mode === "edit" ? "Guardar alterações" : "Criar receita"}
        </Button>
      </div>
    </form>
  );
}
