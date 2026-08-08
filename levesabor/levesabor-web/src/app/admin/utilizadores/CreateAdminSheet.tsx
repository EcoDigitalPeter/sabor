// FE-D02 · CreateAdminSheet — criar conta de admin num BottomSheet, mesmo padrão de
// src/app/admin/ingredientes/IngredientSheet.tsx (validação manual, sem react-hook-form).
"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { useCreateAdminUser } from "@/hooks/useAdminUsers";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FormField, formFieldErrorId } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import styles from "./CreateAdminSheet.module.css";

export type CreateAdminSheetProps = {
  open: boolean;
  onClose: () => void;
};

type FormErrors = Partial<Record<"name" | "email", string>>;

export function CreateAdminSheet({ open, onClose }: CreateAdminSheetProps) {
  const createAdminUser = useCreateAdminUser();
  const { showToast } = useToast();
  const idPrefix = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Repõe o formulário sempre que o sheet abre — é sempre criação, não há modo edição aqui.
  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setErrors({});
    setSubmitError(null);
  }, [open]);

  function handleClose() {
    if (createAdminUser.isPending) return;
    onClose();
  }

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};
    if (name.trim().length < 2) {
      nextErrors.name = "O nome deve ter pelo menos 2 caracteres.";
    }
    if (!email.trim().includes("@")) {
      nextErrors.email = "Indica um email válido.";
    }
    return nextErrors;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitError(null);
    createAdminUser.mutate(
      { name: name.trim(), email: email.trim().toLowerCase() },
      {
        onSuccess: () => {
          showToast("Admin criado.");
          onClose();
        },
        onError: (error) => {
          const message =
            error instanceof ApiError ? error.message : "Não foi possível criar o admin. Tenta novamente.";
          if (error instanceof ApiError && error.code === "LSA006_DUPLICATE") {
            setErrors((prev) => ({ ...prev, email: message }));
          } else {
            setSubmitError(message);
          }
        },
      },
    );
  }

  const nameId = `${idPrefix}-name`;
  const emailId = `${idPrefix}-email`;

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h2 className={styles.title}>Novo admin</h2>

        <FormField label="Nome" htmlFor={nameId} required error={errors.name}>
          <Input
            id={nameId}
            value={name}
            maxLength={120}
            error={!!errors.name}
            aria-describedby={errors.name ? formFieldErrorId(nameId) : undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>

        <FormField label="Email" htmlFor={emailId} required error={errors.email}>
          <Input
            id={emailId}
            type="email"
            value={email}
            error={!!errors.email}
            aria-describedby={errors.email ? formFieldErrorId(emailId) : undefined}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>

        {submitError ? (
          <p role="alert" className={styles.submitError}>
            {submitError}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            loading={createAdminUser.isPending}
            disabled={createAdminUser.isPending}
          >
            Criar admin
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={createAdminUser.isPending}>
            Cancelar
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
