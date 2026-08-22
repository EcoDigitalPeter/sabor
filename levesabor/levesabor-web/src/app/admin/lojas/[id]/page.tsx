// FE-D03 · T-13 Formulário de loja (edição) — F2-ADM-02: suspender/reativar, eliminar bloqueado
// quando a loja tem produtos associados (productCount > 0).
"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAdminStore, useUpdateStore, useSetStoreStatus, useDeleteStore, type StoreRequest } from "@/hooks/useAdminStores";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { StoreFormFields, type StoreFormErrors, type StoreFormValues } from "../StoreFormFields";
import styles from "./page.module.css";

const DUPLICATE_MESSAGE_FALLBACK = "Já existe uma loja com este nome nesta cidade.";
const GENERIC_ERROR_MESSAGE = "Não foi possível guardar as alterações. Tenta novamente.";

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

export default function LojaDetalhePage({ params }: { params: { id: string } }) {
  const storeId = Number(params.id);
  const router = useRouter();
  const idPrefix = useId();
  const { showToast } = useToast();

  const { data: store, isLoading, isError, refetch } = useAdminStore(storeId);
  const updateStore = useUpdateStore(storeId);
  const setStoreStatus = useSetStoreStatus();
  const deleteStore = useDeleteStore();

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
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!store) return;
    setValues({
      name: store.name ?? "",
      city: store.city ?? "",
      neighborhood: store.neighborhood ?? "",
      contact: store.contact ?? "",
      rating: store.rating != null ? String(store.rating) : "",
      openingHoursText: store.openingHoursText ?? "",
      deliveryAvailable: store.deliveryAvailable ?? false,
      averagePriceLevel: store.averagePriceLevel ?? "",
      latitude: store.latitude != null ? String(store.latitude) : "",
      longitude: store.longitude != null ? String(store.longitude) : "",
    });
  }, [store]);

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

    updateStore.mutate(body, {
      onSuccess: () => {
        showToast("Loja atualizada.");
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === "LSA006_DUPLICATE") {
          const message = error.message ?? DUPLICATE_MESSAGE_FALLBACK;
          setErrors((current) => ({ ...current, name: message, city: message }));
        } else {
          setBannerMessage(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
        }
      },
    });
  }

  function handleToggleStatus() {
    if (!store) return;
    const nextStatus = store.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setStoreStatus.mutate(
      { id: storeId, status: nextStatus },
      {
        onSuccess: () => {
          showToast(nextStatus === "ACTIVE" ? "Loja reativada." : "Loja suspensa.");
          setStatusDialogOpen(false);
        },
        onError: (error) => {
          showToast(error instanceof ApiError ? error.message : "Não foi possível mudar o estado da loja.", "error");
          setStatusDialogOpen(false);
        },
      },
    );
  }

  function handleDelete() {
    deleteStore.mutate(storeId, {
      onSuccess: () => {
        showToast("Loja eliminada.");
        router.push("/admin/lojas");
      },
      onError: (error) => {
        showToast(error instanceof ApiError ? error.message : "Não foi possível eliminar a loja.", "error");
        setDeleteDialogOpen(false);
      },
    });
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonBlock}>
          <Skeleton variant="text" width="40%" height={28} />
          <Skeleton variant="rect" height={220} />
        </div>
      </div>
    );
  }

  if (isError || !store) {
    return (
      <div className={styles.page}>
        <Link href="/admin/lojas" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar às lojas
        </Link>
        <ErrorState message="Não foi possível carregar esta loja." onRetry={() => refetch()} />
      </div>
    );
  }

  const canDelete = (store.productCount ?? 0) === 0;
  const isSuspended = store.status === "SUSPENDED";

  return (
    <div className={styles.page}>
      <Link href="/admin/lojas" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar às lojas
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{store.name}</h1>
        <StatusBadge status={store.status ?? "ACTIVE"} />
      </header>

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
            disabled={updateStore.isPending}
            onChange={handleChange}
          />

          <div className={styles.actions}>
            <Button type="submit" variant="primary" loading={updateStore.isPending} disabled={updateStore.isPending}>
              Guardar alterações
            </Button>
          </div>
        </form>
      </Card>

      <Card className={styles.dangerCard}>
        <h2 className={styles.dangerTitle}>Estado e eliminação</h2>

        <div className={styles.dangerRow}>
          <Button type="button" variant="secondary" onClick={() => setStatusDialogOpen(true)}>
            {isSuspended ? "Reativar loja" : "Suspender loja"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            disabled={!canDelete}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Eliminar loja
          </Button>
        </div>

        {!canDelete ? (
          <p className={styles.dangerHint}>
            Esta loja tem {store.productCount} produto(s) associado(s) — não pode ser eliminada. Suspende-a em vez
            disso para a esconder da lista de lojas dos clientes.
          </p>
        ) : null}
      </Card>

      <ConfirmDialog
        open={statusDialogOpen}
        title={isSuspended ? "Reativar loja" : "Suspender loja"}
        message={
          isSuspended
            ? `Tens a certeza que queres reativar "${store.name}"? Volta a ficar visível para os clientes.`
            : `Tens a certeza que queres suspender "${store.name}"? Deixa de ficar visível para os clientes até ser reativada.`
        }
        confirmLabel={isSuspended ? "Reativar" : "Suspender"}
        destructive={!isSuspended}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusDialogOpen(false)}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Eliminar loja"
        message={`Tens a certeza que queres eliminar "${store.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}
