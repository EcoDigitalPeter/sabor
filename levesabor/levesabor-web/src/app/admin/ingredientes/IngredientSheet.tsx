// FE-D07 · IngredientSheet — criar/editar ingrediente num BottomSheet, mesmo padrão de
// src/app/(cliente)/compras/AddItemSheet.tsx (validação manual, sem react-hook-form).
"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import {
  useCreateIngredient,
  useUpdateIngredient,
  type Ingredient,
  type IngredientRequest,
} from "@/hooks/useAdminIngredients";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FormField, formFieldErrorId } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import styles from "./IngredientSheet.module.css";

export type IngredientSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Presente = modo edição; ausente = modo criação. */
  ingredient?: Ingredient | null;
};

type FormErrors = Partial<Record<"name" | "category" | "baseUnit" | "kcalPer100g", string>>;

function toFieldValue(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const parsed = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function IngredientSheet({ open, onClose, ingredient }: IngredientSheetProps) {
  const isEdit = Boolean(ingredient);
  const createIngredient = useCreateIngredient();
  const updateIngredient = useUpdateIngredient(ingredient?.id ?? -1);
  const mutation = isEdit ? updateIngredient : createIngredient;
  const { showToast } = useToast();
  const idPrefix = useId();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [baseUnit, setBaseUnit] = useState("");
  const [kcalPer100g, setKcalPer100g] = useState("");
  const [proteinPer100g, setProteinPer100g] = useState("");
  const [carbsPer100g, setCarbsPer100g] = useState("");
  const [fatPer100g, setFatPer100g] = useState("");
  const [fiberPer100g, setFiberPer100g] = useState("");
  const [referencePriceMt, setReferencePriceMt] = useState("");
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Repõe o formulário sempre que o sheet abre — seja para criar (tudo vazio) ou editar
  // (pré-preenchido com o ingrediente selecionado).
  useEffect(() => {
    if (!open) return;
    setName(ingredient?.name ?? "");
    setCategory(ingredient?.category ?? "");
    setBaseUnit(ingredient?.baseUnit ?? "");
    setKcalPer100g(toFieldValue(ingredient?.kcalPer100g));
    setProteinPer100g(toFieldValue(ingredient?.proteinPer100g));
    setCarbsPer100g(toFieldValue(ingredient?.carbsPer100g));
    setFatPer100g(toFieldValue(ingredient?.fatPer100g));
    setFiberPer100g(toFieldValue(ingredient?.fiberPer100g));
    setReferencePriceMt(toFieldValue(ingredient?.referencePriceMt));
    setActive(ingredient?.active ?? true);
    setErrors({});
    setSubmitError(null);
  }, [open, ingredient]);

  function handleClose() {
    if (mutation.isPending) return;
    onClose();
  }

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};
    if (name.trim().length < 2) {
      nextErrors.name = "O nome deve ter pelo menos 2 caracteres.";
    }
    if (category.trim().length < 2) {
      nextErrors.category = "Indica a categoria (ex.: Cereais e Farinhas).";
    }
    if (baseUnit.trim().length === 0) {
      nextErrors.baseUnit = "Indica a unidade base (ex.: kg, unidade).";
    }
    const parsedKcal = parseOptionalNumber(kcalPer100g);
    if (parsedKcal === undefined || parsedKcal < 0) {
      nextErrors.kcalPer100g = "As kcal por 100g devem ser um número ≥ 0.";
    }
    return nextErrors;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const body: IngredientRequest = {
      name: name.trim(),
      category: category.trim(),
      baseUnit: baseUnit.trim(),
      kcalPer100g: parseOptionalNumber(kcalPer100g) ?? 0,
      proteinPer100g: parseOptionalNumber(proteinPer100g) ?? 0,
      carbsPer100g: parseOptionalNumber(carbsPer100g) ?? 0,
      fatPer100g: parseOptionalNumber(fatPer100g) ?? 0,
      fiberPer100g: parseOptionalNumber(fiberPer100g) ?? 0,
      referencePriceMt: parseOptionalNumber(referencePriceMt) ?? null,
      active,
    };

    setSubmitError(null);
    mutation.mutate(body, {
      onSuccess: () => {
        showToast(isEdit ? "Ingrediente atualizado." : "Ingrediente criado.");
        onClose();
      },
      onError: (error) => {
        setSubmitError(
          error instanceof ApiError ? error.message : "Não foi possível guardar o ingrediente. Tenta novamente.",
        );
      },
    });
  }

  const nameId = `${idPrefix}-name`;
  const categoryId = `${idPrefix}-category`;
  const unitId = `${idPrefix}-unit`;
  const kcalId = `${idPrefix}-kcal`;
  const proteinId = `${idPrefix}-protein`;
  const carbsId = `${idPrefix}-carbs`;
  const fatId = `${idPrefix}-fat`;
  const fiberId = `${idPrefix}-fiber`;
  const priceId = `${idPrefix}-price`;

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h2 className={styles.title}>{isEdit ? "Editar ingrediente" : "Novo ingrediente"}</h2>

        <FormField label="Nome" htmlFor={nameId} required error={errors.name}>
          <Input
            id={nameId}
            value={name}
            maxLength={80}
            error={!!errors.name}
            aria-describedby={errors.name ? formFieldErrorId(nameId) : undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>

        <div className={styles.row}>
          <FormField label="Categoria" htmlFor={categoryId} required error={errors.category}>
            <Input
              id={categoryId}
              value={category}
              placeholder="ex.: Cereais e Farinhas"
              error={!!errors.category}
              aria-describedby={errors.category ? formFieldErrorId(categoryId) : undefined}
              onChange={(event) => setCategory(event.target.value)}
            />
          </FormField>

          <FormField label="Unidade base" htmlFor={unitId} required error={errors.baseUnit}>
            <Input
              id={unitId}
              value={baseUnit}
              placeholder="ex.: kg"
              error={!!errors.baseUnit}
              aria-describedby={errors.baseUnit ? formFieldErrorId(unitId) : undefined}
              onChange={(event) => setBaseUnit(event.target.value)}
            />
          </FormField>
        </div>

        <div className={styles.row}>
          <FormField label="Kcal / 100g" htmlFor={kcalId} required error={errors.kcalPer100g}>
            <Input
              id={kcalId}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={kcalPer100g}
              error={!!errors.kcalPer100g}
              aria-describedby={errors.kcalPer100g ? formFieldErrorId(kcalId) : undefined}
              onChange={(event) => setKcalPer100g(event.target.value)}
            />
          </FormField>

          <FormField label="Preço de referência (MT)" htmlFor={priceId} hint="Opcional.">
            <Input
              id={priceId}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={referencePriceMt}
              onChange={(event) => setReferencePriceMt(event.target.value)}
            />
          </FormField>
        </div>

        <div className={styles.rowThree}>
          <FormField label="Proteína /100g" htmlFor={proteinId}>
            <Input
              id={proteinId}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={proteinPer100g}
              onChange={(event) => setProteinPer100g(event.target.value)}
            />
          </FormField>
          <FormField label="Carbs /100g" htmlFor={carbsId}>
            <Input
              id={carbsId}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={carbsPer100g}
              onChange={(event) => setCarbsPer100g(event.target.value)}
            />
          </FormField>
          <FormField label="Gordura /100g" htmlFor={fatId}>
            <Input
              id={fatId}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={fatPer100g}
              onChange={(event) => setFatPer100g(event.target.value)}
            />
          </FormField>
          <FormField label="Fibra /100g" htmlFor={fiberId}>
            <Input
              id={fiberId}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={fiberPer100g}
              onChange={(event) => setFiberPer100g(event.target.value)}
            />
          </FormField>
        </div>

        <Checkbox
          label="Ativo (disponível para usar em receitas novas)"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />

        {submitError ? (
          <p role="alert" className={styles.submitError}>
            {submitError}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button type="submit" variant="primary" loading={mutation.isPending} disabled={mutation.isPending}>
            {isEdit ? "Guardar alterações" : "Criar ingrediente"}
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
