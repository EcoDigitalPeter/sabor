// FE-D03 · T-13 Formulário de loja — campos partilhados entre nova/page.tsx e [id]/page.tsx
// (mesma forma, validação manual gerida por quem chama; ver src/app/(auth)/registo/page.tsx).
"use client";

import { FormField, formFieldErrorId } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import styles from "./StoreFormFields.module.css";

export type StoreFormValues = {
  name: string;
  city: string;
  neighborhood: string;
  contact: string;
};

export type StoreFormErrors = Partial<Record<"name" | "city" | "contact", string>>;

export type StoreFormFieldsProps = {
  idPrefix: string;
  values: StoreFormValues;
  errors: StoreFormErrors;
  disabled?: boolean;
  onChange: (patch: Partial<StoreFormValues>) => void;
};

export function StoreFormFields({ idPrefix, values, errors, disabled, onChange }: StoreFormFieldsProps) {
  const nameId = `${idPrefix}-name`;
  const cityId = `${idPrefix}-city`;
  const neighborhoodId = `${idPrefix}-neighborhood`;
  const contactId = `${idPrefix}-contact`;

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
        <FormField label="Cidade" htmlFor={cityId} required error={errors.city}>
          <Input
            id={cityId}
            value={values.city}
            maxLength={120}
            disabled={disabled}
            error={!!errors.city}
            aria-invalid={!!errors.city}
            aria-describedby={errors.city ? formFieldErrorId(cityId) : undefined}
            onChange={(event) => onChange({ city: event.target.value })}
          />
        </FormField>

        <FormField label="Bairro" htmlFor={neighborhoodId} hint="Opcional.">
          <Input
            id={neighborhoodId}
            value={values.neighborhood}
            maxLength={120}
            disabled={disabled}
            onChange={(event) => onChange({ neighborhood: event.target.value })}
          />
        </FormField>
      </div>

      <FormField label="Contacto" htmlFor={contactId} hint="Opcional." error={errors.contact}>
        <Input
          id={contactId}
          value={values.contact}
          maxLength={60}
          disabled={disabled}
          error={!!errors.contact}
          aria-invalid={!!errors.contact}
          aria-describedby={errors.contact ? formFieldErrorId(contactId) : undefined}
          onChange={(event) => onChange({ contact: event.target.value })}
        />
      </FormField>
    </div>
  );
}
