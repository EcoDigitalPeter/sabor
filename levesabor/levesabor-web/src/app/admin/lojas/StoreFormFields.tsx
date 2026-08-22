// FE-D03 · T-13 Formulário de loja — campos partilhados entre nova/page.tsx e [id]/page.tsx
// (mesma forma, validação manual gerida por quem chama; ver src/app/(auth)/registo/page.tsx).
// FE-Y08 (ago/2026) — acrescenta rating/horário/entrega/preço médio/coordenadas, campos aditivos
// pedidos para a escolha de loja do cliente mostrar informação útil (⭐ 4,8 · 🚚 · 🕒 · 💰).
"use client";

import { FormField, formFieldErrorId } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import type { components } from "@/types/api";
import styles from "./StoreFormFields.module.css";

type StorePriceLevel = components["schemas"]["StorePriceLevel"];

export const STORE_PRICE_LEVEL_LABEL: Record<StorePriceLevel, string> = {
  BAIXO: "Baixo",
  MEDIO: "Médio",
  ALTO: "Alto",
};

export type StoreFormValues = {
  name: string;
  city: string;
  neighborhood: string;
  contact: string;
  rating: string;
  openingHoursText: string;
  deliveryAvailable: boolean;
  averagePriceLevel: StorePriceLevel | "";
  latitude: string;
  longitude: string;
};

export type StoreFormErrors = Partial<Record<"name" | "city" | "contact" | "rating", string>>;

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
  const ratingId = `${idPrefix}-rating`;
  const hoursId = `${idPrefix}-hours`;
  const deliveryId = `${idPrefix}-delivery`;
  const priceLevelId = `${idPrefix}-price-level`;
  const latitudeId = `${idPrefix}-latitude`;
  const longitudeId = `${idPrefix}-longitude`;

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

      <div className={styles.row}>
        <FormField label="Avaliação" htmlFor={ratingId} hint="0 a 5. Opcional." error={errors.rating}>
          <Input
            id={ratingId}
            type="number"
            min={0}
            max={5}
            step="0.1"
            inputMode="decimal"
            placeholder="ex.: 4,8"
            value={values.rating}
            disabled={disabled}
            error={!!errors.rating}
            aria-invalid={!!errors.rating}
            aria-describedby={errors.rating ? formFieldErrorId(ratingId) : undefined}
            onChange={(event) => onChange({ rating: event.target.value })}
          />
        </FormField>

        <FormField label="Horário" htmlFor={hoursId} hint='Texto livre, ex.: "Fecha às 18h". Opcional.'>
          <Input
            id={hoursId}
            value={values.openingHoursText}
            maxLength={60}
            disabled={disabled}
            placeholder="Fecha às 18h"
            onChange={(event) => onChange({ openingHoursText: event.target.value })}
          />
        </FormField>
      </div>

      <div className={styles.row}>
        <FormField label="Preço médio" htmlFor={priceLevelId} hint="Opcional.">
          <Select
            id={priceLevelId}
            value={values.averagePriceLevel}
            disabled={disabled}
            options={[
              { value: "", label: "Não definido" },
              ...Object.entries(STORE_PRICE_LEVEL_LABEL).map(([value, label]) => ({ value, label })),
            ]}
            onChange={(event) => onChange({ averagePriceLevel: event.target.value as StorePriceLevel | "" })}
          />
        </FormField>

        <FormField label="Entrega" htmlFor={deliveryId}>
          <Checkbox
            id={deliveryId}
            checked={values.deliveryAvailable}
            disabled={disabled}
            label="Entrega disponível"
            onChange={(event) => onChange({ deliveryAvailable: event.target.checked })}
          />
        </FormField>
      </div>

      <div className={styles.row}>
        <FormField label="Latitude" htmlFor={latitudeId} hint="Para o mapa da escolha de loja. Opcional.">
          <Input
            id={latitudeId}
            type="number"
            step="any"
            inputMode="decimal"
            value={values.latitude}
            disabled={disabled}
            onChange={(event) => onChange({ latitude: event.target.value })}
          />
        </FormField>

        <FormField label="Longitude" htmlFor={longitudeId} hint="Para o mapa da escolha de loja. Opcional.">
          <Input
            id={longitudeId}
            type="number"
            step="any"
            inputMode="decimal"
            value={values.longitude}
            disabled={disabled}
            onChange={(event) => onChange({ longitude: event.target.value })}
          />
        </FormField>
      </div>
    </div>
  );
}
