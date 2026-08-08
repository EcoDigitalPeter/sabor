// FE-W04 · AddItemSheet — bottom-sheet "+ Adicionar item" da lista de compras (T-06, F1-CLI-06B)
// Cria um item manual (origin: "MANUAL"), independente da agregação automática vinda do plano —
// sobrevive a regenerações do plano (tratado no mock, ver addManualShoppingItem em
// src/mocks/fixtures.ts). Validação client-side espelha exatamente a do mock: nome 2–80
// caracteres, quantidade > 0; unidade é texto livre curto, só exigida não-vazia aqui no cliente.
"use client";

import { useId, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { useAddShoppingItem, type CreateShoppingListItemRequest } from "@/hooks/useShoppingList";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FormField, formFieldErrorId } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CATEGORY_LABEL } from "@/components/plan/ShoppingGroup";
import type { ShoppingCategory } from "@/components/ui/CategoryIcon";
import styles from "./AddItemSheet.module.css";

// Mesma ordem/rótulos já usados nos grupos da lista (ShoppingGroup.CATEGORY_LABEL, F1-CLI-06).
const CATEGORY_OPTIONS: SelectOption[] = (
  [
    "CEREAIS_E_FARINHAS",
    "PROTEINA",
    "VEGETAIS_E_FOLHAS",
    "LEGUMINOSAS",
    "TEMPEROS_E_OLEOS",
    "OUTROS",
  ] as ShoppingCategory[]
).map((value) => ({ value, label: CATEGORY_LABEL[value] }));

export type AddItemSheetProps = {
  open: boolean;
  onClose: () => void;
};

type FormErrors = Partial<Record<"ingredientName" | "quantity" | "unit", string>>;

function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const parsed = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function AddItemSheet({ open, onClose }: AddItemSheetProps) {
  const addItem = useAddShoppingItem();
  const idPrefix = useId();

  const [ingredientName, setIngredientName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState<ShoppingCategory>("OUTROS");
  const [estimatedCostMt, setEstimatedCostMt] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function resetForm() {
    setIngredientName("");
    setQuantity("");
    setUnit("");
    setCategory("OUTROS");
    setEstimatedCostMt("");
    setErrors({});
    setSubmitError(null);
  }

  function handleClose() {
    if (addItem.isPending) return;
    resetForm();
    onClose();
  }

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};
    const trimmedName = ingredientName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      nextErrors.ingredientName = "O nome deve ter entre 2 e 80 caracteres.";
    }

    const parsedQuantity = Number.parseFloat(quantity.trim().replace(",", "."));
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      nextErrors.quantity = "A quantidade deve ser maior que zero.";
    }

    if (unit.trim().length === 0) {
      nextErrors.unit = "Indica a unidade (ex.: kg, unidade).";
    }

    return nextErrors;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const body: CreateShoppingListItemRequest = {
      ingredientName: ingredientName.trim(),
      category,
      quantity: Number.parseFloat(quantity.trim().replace(",", ".")),
      unit: unit.trim(),
      estimatedCostMt: parseOptionalNumber(estimatedCostMt) ?? null,
    };

    setSubmitError(null);
    addItem.mutate(body, {
      onSuccess: () => {
        resetForm();
        onClose();
      },
      onError: (error) => {
        setSubmitError(
          error instanceof ApiError ? error.message : "Não foi possível adicionar o item. Tenta novamente.",
        );
      },
    });
  }

  const nameId = `${idPrefix}-name`;
  const quantityId = `${idPrefix}-quantity`;
  const unitId = `${idPrefix}-unit`;
  const categoryId = `${idPrefix}-category`;
  const costId = `${idPrefix}-cost`;

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h2 className={styles.title}>Adicionar item</h2>

        <FormField label="Nome do ingrediente" htmlFor={nameId} required error={errors.ingredientName}>
          <Input
            id={nameId}
            type="text"
            value={ingredientName}
            maxLength={80}
            placeholder="ex.: Farinha de mandioca"
            error={!!errors.ingredientName}
            aria-describedby={errors.ingredientName ? formFieldErrorId(nameId) : undefined}
            onChange={(event) => setIngredientName(event.target.value)}
          />
        </FormField>

        <div className={styles.row}>
          <FormField label="Quantidade" htmlFor={quantityId} required error={errors.quantity}>
            <Input
              id={quantityId}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={quantity}
              error={!!errors.quantity}
              aria-describedby={errors.quantity ? formFieldErrorId(quantityId) : undefined}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </FormField>

          <FormField label="Unidade" htmlFor={unitId} required error={errors.unit}>
            <Input
              id={unitId}
              type="text"
              value={unit}
              maxLength={20}
              placeholder="ex.: kg"
              error={!!errors.unit}
              aria-describedby={errors.unit ? formFieldErrorId(unitId) : undefined}
              onChange={(event) => setUnit(event.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Categoria" htmlFor={categoryId} required>
          <Select
            id={categoryId}
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(event) => setCategory(event.target.value as ShoppingCategory)}
          />
        </FormField>

        <FormField label="Custo estimado (MT)" htmlFor={costId} hint="Opcional.">
          <Input
            id={costId}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={estimatedCostMt}
            placeholder="ex.: 150"
            onChange={(event) => setEstimatedCostMt(event.target.value)}
          />
        </FormField>

        {submitError ? (
          <p role="alert" className={styles.submitError}>
            {submitError}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button type="submit" variant="primary" loading={addItem.isPending} disabled={addItem.isPending}>
            Adicionar item
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={addItem.isPending}>
            Cancelar
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
