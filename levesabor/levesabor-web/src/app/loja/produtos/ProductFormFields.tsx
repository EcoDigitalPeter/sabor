// FE-L02 · T-24 Formulário de produto — campos partilhados entre novo/page.tsx e [id]/page.tsx
// (mesma forma, validação manual gerida por quem chama). Mirror de admin/lojas/StoreFormFields.tsx.
"use client";

import { FormField, formFieldErrorId } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import styles from "./ProductFormFields.module.css";

export type ProductCategory = "CEREAIS" | "PROTEINA" | "VEGETAIS" | "LEGUMINOSAS" | "TEMPEROS" | "OUTROS";

export const PRODUCT_CATEGORY_LABEL: Record<ProductCategory, string> = {
  CEREAIS: "Cereais",
  PROTEINA: "Proteína",
  VEGETAIS: "Vegetais",
  LEGUMINOSAS: "Leguminosas",
  TEMPEROS: "Temperos",
  OUTROS: "Outros",
};

export type ProductFormValues = {
  name: string;
  category: ProductCategory;
  unitLabel: string;
  priceMt: string;
};

export type ProductFormErrors = Partial<Record<"name" | "unitLabel" | "priceMt", string>>;

export type ProductFormFieldsProps = {
  idPrefix: string;
  values: ProductFormValues;
  errors: ProductFormErrors;
  disabled?: boolean;
  onChange: (patch: Partial<ProductFormValues>) => void;
};

export function ProductFormFields({ idPrefix, values, errors, disabled, onChange }: ProductFormFieldsProps) {
  const nameId = `${idPrefix}-name`;
  const categoryId = `${idPrefix}-category`;
  const unitId = `${idPrefix}-unit`;
  const priceId = `${idPrefix}-price`;

  return (
    <div className={styles.grid}>
      <FormField label="Nome" htmlFor={nameId} required error={errors.name}>
        <Input
          id={nameId}
          value={values.name}
          maxLength={120}
          disabled={disabled}
          error={!!errors.name}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? formFieldErrorId(nameId) : undefined}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </FormField>

      <div className={styles.row}>
        <FormField label="Categoria" htmlFor={categoryId} required>
          <Select
            id={categoryId}
            value={values.category}
            disabled={disabled}
            options={Object.entries(PRODUCT_CATEGORY_LABEL).map(([value, label]) => ({ value, label }))}
            onChange={(event) => onChange({ category: event.target.value as ProductCategory })}
          />
        </FormField>

        <FormField label="Unidade/tamanho" htmlFor={unitId} required error={errors.unitLabel}>
          <Input
            id={unitId}
            value={values.unitLabel}
            placeholder="ex.: 1 kg"
            maxLength={40}
            disabled={disabled}
            error={!!errors.unitLabel}
            aria-invalid={!!errors.unitLabel}
            aria-describedby={errors.unitLabel ? formFieldErrorId(unitId) : undefined}
            onChange={(event) => onChange({ unitLabel: event.target.value })}
          />
        </FormField>
      </div>

      <FormField label="Preço (MT)" htmlFor={priceId} required error={errors.priceMt}>
        <Input
          id={priceId}
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={values.priceMt}
          disabled={disabled}
          error={!!errors.priceMt}
          aria-invalid={!!errors.priceMt}
          aria-describedby={errors.priceMt ? formFieldErrorId(priceId) : undefined}
          onChange={(event) => onChange({ priceMt: event.target.value })}
        />
      </FormField>
    </div>
  );
}
