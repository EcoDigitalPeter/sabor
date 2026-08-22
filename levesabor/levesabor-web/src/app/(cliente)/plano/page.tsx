// FE-C03 · T-04 Dashboard do plano semanal — tabs de dias, MealCard + MacroRing sm (F1-CLI-03)
// Empty state: /images/empty-plano (P-02) — prompt na pasta.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BrandIllustration } from "@/components/ui/BrandIllustration";
import { Reveal } from "@/components/ui/Reveal";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useActiveMealPlan } from "@/hooks/useActiveMealPlan";
import { DayTabs } from "@/components/plan/DayTabs";
import { WeekSelector } from "@/components/plan/WeekSelector";
import { MealCard } from "@/components/plan/MealCard";
import { DaySummary } from "@/components/plan/DaySummary";
import { MonthProgressRing } from "@/components/plan/MonthProgressRing";
import { useToggleMealPlanEntryCompleted } from "@/hooks/useMealPlanCompleted";
import {
  computeStreakDays,
  currentMealSlot,
  formatMonthLabel,
  sortEntriesBySlot,
  streakLabel,
  timeOfDayGreeting,
  todayIsoDate,
} from "@/lib/planStats";
import mealCardStyles from "@/components/plan/MealCard.module.css";
import styles from "./page.module.css";

const DAYS_PER_WEEK = 7;

/** Mesma geometria do MealCard real (regra "loading = skeleton com a geometria do conteúdo"). */
function MealCardSkeleton() {
  return (
    <div className={mealCardStyles.card} aria-hidden="true">
      <Skeleton variant="rect" width="84px" height="84px" borderRadius="var(--radius-card)" />
      <div className={mealCardStyles.info} style={{ width: "100%" }}>
        <Skeleton variant="text" width="35%" height="0.75em" />
        <Skeleton variant="text" width="72%" height="1.15em" />
        <Skeleton variant="text" width="30%" height="0.85em" />
      </div>
      <Skeleton variant="circle" width="44px" height="44px" />
    </div>
  );
}

export default function PlanoPage() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const firstName = getSession()?.name?.split(" ")[0];
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toggleCompletedMutation = useToggleMealPlanEntryCompleted();

  const { data: plan, isLoading, isError, error, refetch } = useActiveMealPlan();

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

  // FE-C09 · 30 dias não cabem/funcionam num único DayTabs em 360px — fatiam-se em semanas de
  // 7 dias (a última pode ter menos) e só a semana selecionada é passada ao DayTabs existente,
  // que continua a receber a mesma forma de `days` que já recebia (T-04).
  const weekCount = Math.max(1, Math.ceil(days.length / DAYS_PER_WEEK));
  const defaultWeekIndex = todayIndex >= 0 ? Math.floor(todayIndex / DAYS_PER_WEEK) : 0;
  const activeWeekIndex =
    selectedWeekIndex !== null && selectedWeekIndex < weekCount ? selectedWeekIndex : defaultWeekIndex;
  const weekStart = activeWeekIndex * DAYS_PER_WEEK;
  const weekDays = days.slice(weekStart, weekStart + DAYS_PER_WEEK);

  const todayIndexInWeek =
    todayIndex >= weekStart && todayIndex < weekStart + weekDays.length ? todayIndex - weekStart : undefined;
  const defaultLocalIndex = todayIndexInWeek ?? 0;
  const activeLocalIndex =
    selectedDayIndex !== null && selectedDayIndex >= weekStart && selectedDayIndex < weekStart + weekDays.length
      ? selectedDayIndex - weekStart
      : defaultLocalIndex;
  const activeIndex = weekStart + activeLocalIndex;
  const selectedDay = days[activeIndex];
  const sortedEntries = selectedDay ? sortEntriesBySlot(selectedDay.entries ?? []) : [];

  const streak = computeStreakDays(days);
  const completedDaysCount = days.filter((day) => (day.entries ?? []).some((entry) => entry.completed)).length;

  // FE-Y05 [nice-to-have] · resumo diário sob o mês, sempre relativo a "hoje" (não ao dia
  // seleccionado nas tabs) — dá contexto imediato sem depender do "0/30" (feedback do cliente).
  const todayDay = days.find((day) => day.date === todayIsoDate());
  const todayEntryCount = todayDay?.entries?.length ?? 0;
  const todayCostMt = (todayDay?.entries ?? []).reduce((sum, entry) => sum + (entry.recipe?.estimatedCostMt ?? 0), 0);

  // FE-Y05 · destaca o cartão da refeição "actual" por hora do dia — só quando o dia seleccionado
  // nas tabs é mesmo hoje (noutros dias não faz sentido destacar nada).
  const isSelectedDayToday = selectedDay?.date === todayIsoDate();
  const activeMealSlot = currentMealSlot();

  return (
    <main className={styles.main}>
      {!isOnline ? (
        <OfflineBanner message="Estás offline — a mostrar o último plano guardado." />
      ) : null}
      <header className={styles.header}>
        {firstName ? (
          <p className={styles.greeting}>
            {timeOfDayGreeting()}, {firstName}
          </p>
        ) : null}
        <h1 className={styles.title}>O teu plano · {formatMonthLabel(plan.monthStart ?? days[0]?.date ?? "")}</h1>
        {days.length > 0 ? (
          <div className={styles.progressRow}>
            <MonthProgressRing completedDays={completedDaysCount} totalDays={days.length} size="sm" />
            <p className={styles.streakText}>{streakLabel(streak)}</p>
          </div>
        ) : null}
        {todayDay ? (
          <p className={styles.todaySummary}>
            Hoje · {todayEntryCount} {todayEntryCount === 1 ? "refeição" : "refeições"} · {todayDay.totalKcal ?? 0}{" "}
            kcal · {todayCostMt} MT
          </p>
        ) : null}
      </header>

      <Card className={styles.adHocCard}>
        <p className={styles.adHocText}>Não sabes o que cozinhar agora?</p>
        <Link href="/plano/pedir-agora" className={styles.adHocCta}>
          Pedir uma receita
        </Link>
      </Card>

      <WeekSelector
        weekCount={weekCount}
        selectedIndex={activeWeekIndex}
        onSelect={(weekIndex) => {
          setSelectedWeekIndex(weekIndex);
          setSelectedDayIndex(null);
        }}
      />

      <DayTabs
        days={weekDays.map((day) => ({ date: day.date ?? "", weekday: day.weekday ?? "" }))}
        selectedIndex={activeLocalIndex}
        onSelect={(localIndex) => setSelectedDayIndex(weekStart + localIndex)}
        todayIndex={todayIndexInWeek}
      />

      <div className={styles.cardList}>
        {sortedEntries.map((entry, index) => (
          <Reveal key={entry.id} delay={index * 40}>
            <MealCard
              entry={entry}
              href={`/plano/refeicao/${entry.id}`}
              current={isSelectedDayToday && entry.mealSlot === activeMealSlot}
              onToggleCompleted={(next) => {
                if (entry.id === undefined) return;
                toggleCompletedMutation.mutate({ id: entry.id, completed: next });
              }}
            />
          </Reveal>
        ))}
      </div>

      {selectedDay ? <DaySummary day={selectedDay} className={styles.summary} /> : null}

      <div className={styles.footerActions}>
        {/* FE-Y05 (ago/2026) · renomeado a pedido do cliente — "Gerar novo plano" soava a apagar
            tudo; "Criar outro plano" deixa claro que é uma alternativa, não uma substituição. */}
        <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
          Criar outro plano
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Criar outro plano"
        message="O plano actual passa a arquivo e criamos um novo a partir das tuas preferências. Queres continuar?"
        confirmLabel="Criar outro plano"
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
