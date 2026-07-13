// FE-B03 · ConfirmDialog — construído sobre Modal; variante "double" implementa a "confirmação dupla"
// usada mais tarde em ações destrutivas do admin com dados dependentes (docs/plano/02-ui-ux-plan.md T-12).
"use client";

import { useEffect, useId, useState } from "react";
import { Modal } from "./Modal";
import styles from "./ConfirmDialog.module.css";

export type ConfirmDialogVariant = "simple" | "double";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** "double" exige checkbox de confirmação inline antes de ativar o botão de confirmar. */
  variant?: ConfirmDialogVariant;
  /** Estiliza o botão de confirmar como ação destrutiva (--terracotta). Default true — é o caso comum. */
  destructive?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  variant = "simple",
  destructive = true,
}: ConfirmDialogProps) {
  const [checked, setChecked] = useState(false);
  const checkboxId = useId();

  useEffect(() => {
    if (open) {
      setChecked(false);
    }
  }, [open]);

  const confirmDisabled = variant === "double" && !checked;

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className={styles.message}>{message}</p>
      {variant === "double" && (
        <label htmlFor={checkboxId} className={styles.checkboxRow}>
          <input
            id={checkboxId}
            type="checkbox"
            className={styles.checkbox}
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
          <span>Sim, tenho a certeza</span>
        </label>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`${styles.confirmButton} ${destructive ? styles.destructive : styles.neutral}`}
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
