// FE-A04 · Início — hub pós-login: saudação + progresso do mês, resumo das refeições de hoje,
// atalhos para Compras/Encomendas, e CTA "Pedir receita agora" (F1-CLI-03, F1-CLI-05B, F3-CLI-07).
"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { useActiveMealPlan } from "@/hooks/useActiveMealPlan";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useOrders } from "@/hooks/useOrders";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BrandIllustration } from "@/components/ui/BrandIllustration";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { MealCard } from "@/components/plan/MealCard";
import { MonthProgressRing } from "@/components/plan/MonthProgressRing";
import {
  computeStreakDays,
  sortEntriesBySlot,
  streakLabel,
  timeOfDayGreeting,
  todayIsoDate,
} from "@/lib/planStats";
import styles from "./page.module.css";

const MEALS_PREVIEW_COUNT = 2;

export default function InicioPage() {
  const isOnline = useOnlineStatus();
  const firstName = getSession()?.name?.split(" ")[0];

  const { data: plan, isLoading, isError, error, refetch } = useActiveMealPlan();
  const { data: shoppingList, isLoading: isShoppingLoading } = useShoppingList();
  const { data: ordersData, isLoading: isOrdersLoading, isError: isOrdersError } = useOrders();

  if (isLoading) {
    return (
      <main className={styles.main}>
        <Skeleton variant="text" width="60%" height="1.4em" className={styles.headerSkeleton} />
        <Skeleton variant="rect" width="100%" height="96px" borderRadius="var(--radius-card)" />
        <Skeleton variant="rect" width="100%" height="64px" borderRadius="var(--radius-card)" />
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
          message="Não foi possível carregar o teu início. Verifica a tua ligação e tenta novamente."
          onRetry={() => refetch()}
        />
      </main>
    );
  }

  const days = plan.days ?? [];
  const todayDay = days.find((day) => day.date === todayIsoDate());
  const todayEntries = todayDay ? sortEntriesBySlot(todayDay.entries ?? []) : [];
  const visibleEntries = todayEntries.slice(0, MEALS_PREVIEW_COUNT);
  const hiddenCount = todayEntries.length - visibleEntries.length;

  const streak = computeStreakDays(days);
  const completedDaysCount = days.filter((day) => (day.entries ?? []).some((entry) => entry.completed)).length;

  const latestOrder = ordersData?.items?.[0];

  return (
    <main className={styles.main}>
      {!isOnline ? <OfflineBanner message="Estás offline — a mostrar a última versão guardada." /> : null}

      <header className={styles.header}>
        {firstName ? (
          <h1 className={styles.greeting}>
            {timeOfDayGreeting()}, {firstName}
          </h1>
        ) : null}
        {days.length > 0 ? (
          <div className={styles.progressRow}>
            <MonthProgressRing completedDays={completedDaysCount} totalDays={days.length} size="sm" />
            <p className={styles.streakText}>{streakLabel(streak)}</p>
          </div>
        ) : null}
      </header>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Refeições de hoje</h2>
        {visibleEntries.length > 0 ? (
          <div className={styles.mealList}>
            {visibleEntries.map((entry) => (
              <MealCard key={entry.id} entry={entry} href={`/plano/refeicao/${entry.id}`} />
            ))}
            {hiddenCount > 0 ? <Chip className={styles.hiddenChip}>+{hiddenCount}</Chip> : null}
          </div>
        ) : (
          <p className={styles.sectionEmptyText}>Sem refeições previstas para hoje.</p>
        )}
        <Link href="/plano" className={styles.sectionLink}>
          Ver plano completo
        </Link>
      </Card>

      {/* FE-W05/F1-CLI-08 · ponto de entrada para o catálogo de receitas navegável — BottomNav já
          tem 4 itens (Início/Plano/Compras/Perfil), acrescentar um 5º ficaria apertado num layout
          mobile-first, por isso o acesso vive aqui no dashboard. */}
      <Card className={styles.recipesCard}>
        <Link href="/receitas" className={styles.recipesLink}>
          <BookOpen size={20} aria-hidden="true" />
          <div>
            <h2 className={styles.sectionTitle}>Receitas</h2>
            <p className={styles.sectionText}>Explora o catálogo todo, com filtro por dieta</p>
          </div>
        </Link>
      </Card>

      {isShoppingLoading || shoppingList ? (
        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Compras</h2>
          {isShoppingLoading ? (
            <Skeleton variant="text" width="50%" height="1em" />
          ) : (
            <>
              <p className={styles.sectionText}>
                {shoppingList?.checkedItems ?? 0}/{shoppingList?.totalItems ?? 0} comprados
              </p>
              <Link href="/compras" className={styles.sectionLink}>
                Ver lista de compras
              </Link>
            </>
          )}
        </Card>
      ) : null}

      {!isOrdersError ? (
        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Encomendas</h2>
          {isOrdersLoading ? (
            <Skeleton variant="text" width="50%" height="1em" />
          ) : latestOrder ? (
            <>
              <div className={styles.orderRow}>
                <StatusBadge status={latestOrder.status ?? "PENDENTE"} />
                <span className={styles.sectionText}>{latestOrder.storeName}</span>
              </div>
              <Link href="/encomendas" className={styles.sectionLink}>
                Ver minhas encomendas
              </Link>
            </>
          ) : (
            <>
              <p className={styles.sectionEmptyText}>Ainda não tens encomendas.</p>
              <Link href="/compras/encomendar" className={styles.sectionLink}>
                Encomendar rancho
              </Link>
            </>
          )}
        </Card>
      ) : null}

      <Card className={styles.adHocCard}>
        <p className={styles.adHocText}>Não sabes o que cozinhar agora?</p>
        <Link href="/plano/pedir-agora" className={styles.adHocCta}>
          Pedir uma receita
        </Link>
      </Card>
    </main>
  );
}
