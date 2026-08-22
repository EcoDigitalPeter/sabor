// FE-D03 · T-13 Formulário de loja (criação) — F2-ADM-02
"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useCreateStore, type StoreRequest } from "@/hooks/useAdminStores";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { StoreFormFields, type StoreFormErrors, type StoreFormValues } from "../StoreFormFields";
import styles from "./page.module.css";

const DUPLICATE_MESSAGE_FALLBACK = "Já existe uma loja com este nome nesta cidade.";
const GENERIC_ERROR_MESSAGE = "Não foi possível criar a loja. Tenta novamente.";

function validate(values: StoreFormValues): StoreFormErrors {
  const errors: StoreFormErrors = {};
  const name = values.name.trim();
  const city = values.city.trim();
  if (name.length < 2 || name.length > 120) {
    errors.name = "O nome da loja deve ter entre 2 e 120 caracteres.";
  }
  if (city.length < 2) {
    errors.city = "A cidade é obrigatória.";
  }
  if (values.contact.trim().length > 60) {
    errors.contact = "O contacto deve ter no máximo 60 caracteres.";
  }
  if (values.rating.trim() !== "") {
    const rating = Number(values.rating);
    if (Number.isNaN(rating) || rating < 0 || rating > 5) {
      errors.rating = "A avaliação deve estar entre 0 e 5.";
    }
  }
  return errors;
}

export default function NovaLojaPage() {
  const router = useRouter();
  const idPrefix = useId();
  const { showToast } = useToast();
  const createStore = useCreateStore();

  const [values, setValues] = useState<StoreFormValues>({
    name: "",
    city: "",
    neighborhood: "",
    contact: "",
    rating: "",
    openingHoursText: "",
    deliveryAvailable: false,
    averagePriceLevel: "",
    latitude: "",
    longitude: "",
  });
  const [errors, setErrors] = useState<StoreFormErrors>({});
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  function handleChange(patch: Partial<StoreFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBannerMessage(null);

    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const body: StoreRequest = {
      name: values.name.trim(),
      city: values.city.trim(),
      neighborhood: values.neighborhood.trim() || null,
      contact: values.contact.trim() || null,
      rating: values.rating.trim() === "" ? null : Number(values.rating),
      openingHoursText: values.openingHoursText.trim() || null,
      deliveryAvailable: values.deliveryAvailable,
      averagePriceLevel: values.averagePriceLevel || null,
      latitude: values.latitude.trim() === "" ? null : Number(values.latitude),
      longitude: values.longitude.trim() === "" ? null : Number(values.longitude),
    };

    createStore.mutate(body, {
      onSuccess: () => {
        showToast("Loja criada.");
        router.push("/admin/lojas");
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === "LSA006_DUPLICATE") {
          // Unicidade é (nome, cidade) — o erro fica visível junto de ambos os campos.
          const message = error.message ?? DUPLICATE_MESSAGE_FALLBACK;
          setErrors((current) => ({ ...current, name: message, city: message }));
        } else {
          setBannerMessage(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
        }
      },
    });
  }

  return (
    <div className={styles.page}>
      <Link href="/admin/lojas" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar às lojas
      </Link>

      <h1 className={styles.title}>Nova loja</h1>

      {bannerMessage ? (
        <div className={styles.banner}>
          <ErrorState message={bannerMessage} />
        </div>
      ) : null}

      <Card>
        <form onSubmit={handleSubmit} noValidate>
          <StoreFormFields
            idPrefix={idPrefix}
            values={values}
            errors={errors}
            disabled={createStore.isPending}
            onChange={handleChange}
          />

          <div className={styles.actions}>
            <Button type="submit" variant="primary" loading={createStore.isPending} disabled={createStore.isPending}>
              Criar loja
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={createStore.isPending}
              onClick={() => router.push("/admin/lojas")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
