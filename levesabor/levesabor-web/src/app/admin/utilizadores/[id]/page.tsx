// FE-D02 · T-11 Detalhe de utilizador — suspender/reativar + "Ver perfil de saúde" auditado (F2-ADM-01)
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  useAdminUser,
  useAdminUserHealthProfile,
  useSetUserStatus,
  type User,
} from "@/hooks/useAdminUsers";
import { healthTagLabel } from "@/data/health-tags";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import styles from "./page.module.css";

const ROLE_LABEL: Record<NonNullable<User["role"]>, string> = {
  CLIENTE: "Cliente",
  ADMIN: "Admin",
  LOJISTA: "Lojista",
};

function formatDateTime(iso?: string | null): string {
  if (!iso) return "Nunca";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Nunca";
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function UtilizadorDetalhePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { showToast } = useToast();

  const { data: user, isLoading, isError, refetch } = useAdminUser(id);
  const setUserStatus = useSetUserStatus();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [healthRevealed, setHealthRevealed] = useState(false);
  const healthProfile = useAdminUserHealthProfile(id, healthRevealed);

  function handleConfirmStatusChange() {
    if (!user?.id || !user.status) return;
    const nextStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setUserStatus.mutate(
      { id: user.id, status: nextStatus },
      {
        onSuccess: () => {
          showToast(nextStatus === "ACTIVE" ? "Utilizador reativado." : "Utilizador suspenso.");
          setConfirmOpen(false);
        },
        onError: (error) => {
          showToast(
            error instanceof ApiError ? error.message : "Não foi possível alterar o estado do utilizador.",
            "error",
          );
          setConfirmOpen(false);
        },
      },
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/admin/utilizadores" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar a utilizadores
      </Link>

      {isLoading ? (
        <Card className={styles.card}>
          <Skeleton variant="text" width="40%" height="1.5em" />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="30%" />
        </Card>
      ) : isError || !user ? (
        <ErrorState message="Não foi possível carregar este utilizador." onRetry={() => refetch()} />
      ) : (
        <>
          <Card className={styles.card}>
            <div className={styles.headerRow}>
              <div>
                <h1 className={styles.name}>{user.name ?? "—"}</h1>
                <p className={styles.email}>{user.email ?? "—"}</p>
              </div>
              {user.status ? <StatusBadge status={user.status} /> : null}
            </div>

            <dl className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <dt className={styles.summaryLabel}>Role</dt>
                <dd className={styles.summaryValue}>{user.role ? ROLE_LABEL[user.role] : "—"}</dd>
              </div>
              <div className={styles.summaryItem}>
                <dt className={styles.summaryLabel}>Nº de planos</dt>
                <dd className={styles.summaryValue}>{user.mealPlanCount ?? 0}</dd>
              </div>
              <div className={styles.summaryItem}>
                <dt className={styles.summaryLabel}>Criado em</dt>
                <dd className={styles.summaryValue}>{formatDateTime(user.createdAt)}</dd>
              </div>
              <div className={styles.summaryItem}>
                <dt className={styles.summaryLabel}>Último acesso</dt>
                <dd className={styles.summaryValue}>{formatDateTime(user.lastLoginAt)}</dd>
              </div>
            </dl>

            <div className={styles.actionsRow}>
              <Button
                type="button"
                variant={user.status === "ACTIVE" ? "secondary" : "primary"}
                onClick={() => setConfirmOpen(true)}
              >
                {user.status === "ACTIVE" ? "Suspender" : "Reativar"}
              </Button>
            </div>
          </Card>

          <Card className={styles.card}>
            <h2 className={styles.sectionTitle}>Perfil de saúde</h2>
            <p className={styles.sectionHint}>
              Dado sensível — só é revelado mediante ação explícita, registada em auditoria.
            </p>

            {!healthRevealed ? (
              <Button type="button" variant="secondary" onClick={() => setHealthRevealed(true)}>
                Ver perfil de saúde
              </Button>
            ) : healthProfile.isLoading ? (
              <div className={styles.healthSkeleton}>
                <Skeleton variant="text" width="50%" />
                <Skeleton variant="rect" width="100%" height="32px" />
              </div>
            ) : healthProfile.isError || !healthProfile.data ? (
              <ErrorState message="Não foi possível carregar o perfil de saúde." onRetry={() => healthProfile.refetch()} />
            ) : (
              <div className={styles.healthContent}>
                <div>
                  <p className={styles.summaryLabel}>Preferências alimentares</p>
                  {healthProfile.data.dietaryPreferences && healthProfile.data.dietaryPreferences.length > 0 ? (
                    <div className={styles.chipRow}>
                      {healthProfile.data.dietaryPreferences.map((pref) => (
                        <Chip key={pref} variant="cream">
                          {healthTagLabel(pref)}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.summaryValue}>Nenhuma preferência registada.</p>
                  )}
                </div>
                <div>
                  <p className={styles.summaryLabel}>Pessoas em casa</p>
                  <p className={styles.summaryValue}>
                    {healthProfile.data.householdSize ?? 1} {healthProfile.data.householdSize === 1 ? "pessoa" : "pessoas"}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={user?.status === "ACTIVE" ? "Suspender utilizador" : "Reativar utilizador"}
        message={
          user?.status === "ACTIVE"
            ? `Tens a certeza que queres suspender "${user?.name}"? O login fica bloqueado de imediato e os refresh tokens ativos são revogados.`
            : `Tens a certeza que queres reativar "${user?.name}"?`
        }
        confirmLabel={user?.status === "ACTIVE" ? "Suspender" : "Reativar"}
        destructive={user?.status === "ACTIVE"}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
