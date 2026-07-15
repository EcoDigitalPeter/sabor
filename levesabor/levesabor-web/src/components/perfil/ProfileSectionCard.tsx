// FE-C07 · T-08 Perfil — cartão genérico "ver / editar" para uma secção do perfil
// (docs/plano/02-ui-ux-plan.md T-08: "cartões editáveis por secção")
"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import styles from "./ProfileSectionCard.module.css";

export type ProfileSectionCardProps = {
  title: string;
  /** Modo de visualização: conteúdo mostrado quando a secção não está a ser editada. */
  displayValue: ReactNode;
  /** Modo de edição: o(s) campo(s) de input da secção (OptionGroup, lista de alergias, etc.). */
  children: ReactNode;
  editing: boolean;
  saving: boolean;
  /** Mensagem de erro inline (validação local ou erro do servidor) — só relevante em edição. */
  error?: string;
  /** Desativa o botão "Guardar" (ex.: nada selecionado ainda). */
  saveDisabled?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
};

export function ProfileSectionCard({
  title,
  displayValue,
  children,
  editing,
  saving,
  error,
  saveDisabled = false,
  onEdit,
  onCancel,
  onSave,
}: ProfileSectionCardProps) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Editar
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className={styles.body}>
          {children}

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.actions}>
            <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={onSave} loading={saving} disabled={saveDisabled}>
              Guardar
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.value}>{displayValue}</div>
      )}
    </Card>
  );
}
