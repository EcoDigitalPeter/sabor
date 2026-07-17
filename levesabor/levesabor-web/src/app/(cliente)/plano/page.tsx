// FE-C03 · T-04 Dashboard do plano semanal — tabs de dias, MealCard + MacroRing sm (F1-CLI-03)
// Empty state: /images/empty-plano (P-02) — prompt na pasta.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { components } from "@/types/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BrandIllustration } from "@/components/ui/BrandIllustration";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { DayTabs } from "@/components/plan/DayTabs";
import { MealCard } from "@/components/plan/MealCard";
import { DaySummary } from "@/components/plan/DaySummary";
import mealCardStyles from "@/components/plan/MealCard.module.css";
import styles from "./page.module.css";

type MealPlan = components["schemas"]["MealPlan"];

const SLOT_ORDER: Record<string, number> = { PEQUENO_ALMOCO: 0, ALMOCO: 1, JANTAR: 2, LANCHE: 3 };
const MONTH_ABBR_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function todayIsoDate(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

/** "12–18 Jul" (mesmo mês) ou "29 Jul – 4 Ago" (semana a cavalo de dois meses). */
function formatWeekRange(weekStartIso: string): string {
  const [y, m, d] = weekStartIso.split("-").map(Number);
  if (!y || !m || !d) return weekStartIso;
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 6);
  const startMonth = MONTH_ABBR_PT[start.getMonth()];
  const endMonth = MONTH_ABBR_PT[end.getMonth()];
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${end.getDate()} ${startMonth}`
    : `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`;
}

/** Mesma geometria do MealCard real (regra "loading = skeleton com a geometria do conteúdo"). */
function MealCardSkeleton() {
  return (
    <div className={mealCardStyles.card} aria-hidden="true">
      <div className={mealCardStyles.info} style={{ width: "100%" }}>
        <Skeleton variant="text" width="35%" height="0.75em" />
        <Skeleton variant="text" width="72%" height="1.15em" />
        <Skeleton variant="rect" width="128px" height="24px" borderRadius="var(--radius-pill)" />
      </div>
      <Skeleton variant="circle" width="44px" height="44px" />
    </div>
  );
}

export default function PlanoPage() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    data: plan,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<MealPlan>({
    queryKey: ["active-meal-plan"],
    queryFn: () => api<MealPlan>("/me/meal-plans/active"),
    retry: false,
  });

  if (isLoading) {
    return (
      <main className={styles.main}>
        <Skeleton variant="text" width="60%" height="1.4em" className={styles.headerSkeleton} />
        <div className={styles.cardList}>
          <MealCardSkeleton />
          <MealCardSkeleton />
          <MealCardSkeleton />
        </div>
      </main>
    );
  }

  const isNotFound = isError && error instanceof ApiError && error.code === "LSA005_NOT_FOUND";

  if (isNotFound) {
    return (
      <main className={styles.main}>
        <EmptyState
          illustration={<BrandIllustration variant="empty-plan" />}
          title="Ainda não tens um plano"
          description="Gera o teu primeiro plano semanal e recebe pratos moçambicanos escolhidos para ti."
          action={
            <Link href="/plano/gerar" className={styles.emptyCta}>
              Gerar o meu primeiro plano
            </Link>
          }
        />
      </main>
    );
  }

  if (isError || !plan) {
    return (
      <main className={styles.main}>
        <ErrorState
          message="Não foi possível carregar o teu plano. Verifica a tua ligação e tenta novamente."
          onRetry={() => refetch()}
        />
      </main>
    );
  }

  const days = plan.days ?? [];
  const todayIndex = days.findIndex((day) => day.date === todayIsoDate());
  const defaultIndex = todayIndex >= 0 ? todayIndex : 0;
  const activeIndex = selectedDayIndex !== null && selectedDayIndex < days.length ? selectedDayIndex : defaultIndex;
  const selectedDay = days[activeIndex];
  const sortedEntries = selectedDay
    ? [...(selectedDay.entries ?? [])].sort(
        (a, b) => (SLOT_ORDER[a.mealSlot ?? ""] ?? 99) - (SLOT_ORDER[b.mealSlot ?? ""] ?? 99),
      )
    : [];

  return (
    <main className={styles.main}>
      {!isOnline ? (
        <OfflineBanner message="Estás offline — a mostrar o último plano guardado." />
      ) : null}
      <header className={styles.header}>
        <h1 className={styles.title}>O teu plano · {formatWeekRange(plan.weekStart ?? days[0]?.date ?? "")}</h1>
      </header>

      <DayTabs
        days={days.map((day) => ({ date: day.date ?? "", weekday: day.weekday ?? "" }))}
        selectedIndex={activeIndex}
        onSelect={setSelectedDayIndex}
        todayIndex={todayIndex >= 0 ? todayIndex : undefined}
      />

      <div className={styles.cardList}>
        {sortedEntries.map((entry) => (
          <MealCard key={entry.id} entry={entry} href={`/plano/refeicao/${entry.id}`} />
        ))}
      </div>

      {selectedDay ? <DaySummary day={selectedDay} className={styles.summary} /> : null}

      <div className={styles.footerActions}>
        <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
          Gerar novo plano
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Gerar novo plano"
        message="O plano atual será arquivado. Queres continuar?"
        confirmLabel="Gerar novo plano"
        cancelLabel="Cancelar"
        onConfirm={() => {
          setConfirmOpen(false);
          router.push("/plano/gerar");
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </main>
  );
}
