// FE-D01 · T-09 Dashboard de métricas — KPIs, gráfico planos/dia, top/bottom receitas, custo IA
// (F2-ADM-06). Estados: loading (skeleton dos cartões) · ready · empty (sem dados no período) · erro.
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@/types/api";
import { KpiCard } from "@/components/ui/KpiCard";
import { LineChart } from "@/components/ui/LineChart";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./page.module.css";

type MetricsSummary = components["schemas"]["MetricsSummary"];
type Period = 7 | 30 | 90;

// MetricsSummary vem do OpenAPI com todos os campos opcionais (schema genérico); normalizamos
// aqui para os tipos concretos que LineChart/a tabela de feedback esperam, com defaults sensatos
// (a fixture mock nunca omite estes campos, mas o contrato TypeScript exige tratar o caso).
type RecipeFeedback = { recipeId: number; name: string; likeCount: number; dislikeCount: number };

function normalizePlansPerDay(data: MetricsSummary["plansPerDay"]): { date: string; count: number }[] {
  return (data ?? []).map((point) => ({ date: point.date ?? "", count: point.count ?? 0 }));
}

function normalizeRecipes(data: MetricsSummary["topRecipes"]): RecipeFeedback[] {
  return (data ?? []).map((recipe, index) => ({
    recipeId: recipe.recipeId ?? index,
    name: recipe.name ?? "—",
    likeCount: recipe.likeCount ?? 0,
    dislikeCount: recipe.dislikeCount ?? 0,
  }));
}

const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

function formatPercent(value: number | undefined): string {
  if (value === undefined) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatUsd(value: number | undefined): string {
  if (value === undefined) return "—";
  return `${value.toFixed(2)} USD`;
}

// "Sem dados no período" — nenhuma série, nenhum feedback de receitas e nenhum plano gerado.
// Nota: o mock (src/mocks/handlers.ts) ignora o query param `period` e devolve sempre a mesma
// fixture (METRICS_SUMMARY), pelo que este estado nunca é atingido a partir da UI hoje — é
// esperado/conhecido (ver relatório da tarefa), não um bug desta página.
function isMetricsEmpty(data: MetricsSummary): boolean {
  return (
    (data.mealPlansGenerated ?? 0) === 0 &&
    (data.plansPerDay?.length ?? 0) === 0 &&
    (data.topRecipes?.length ?? 0) === 0 &&
    (data.bottomRecipes?.length ?? 0) === 0
  );
}

function RecipeFeedbackTable({ title, recipes }: { title: string; recipes: RecipeFeedback[] }) {
  return (
    <Card className={styles.feedbackCard}>
      <h2 className={styles.feedbackTitle}>{title}</h2>
      {recipes.length === 0 ? (
        <p className={styles.feedbackEmpty}>Sem receitas com feedback no período.</p>
      ) : (
        <table className={styles.feedbackTable}>
          <thead>
            <tr>
              <th>Receita</th>
              <th className={styles.alignRight}>👍</th>
              <th className={styles.alignRight}>👎</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((recipe) => (
              <tr key={recipe.recipeId}>
                <td>{recipe.name}</td>
                <td className={styles.alignRight}>{recipe.likeCount}</td>
                <td className={styles.alignRight}>{recipe.dislikeCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<Period>(30);

  const { data, isLoading, isError, refetch } = useQuery<MetricsSummary>({
    queryKey: ["admin-metrics-summary", period],
    queryFn: () => api<MetricsSummary>(`/admin/metrics/summary?period=${period}`),
    retry: false,
  });

  const periodSelector = (
    <Select
      aria-label="Período"
      options={PERIOD_OPTIONS}
      value={String(period)}
      onChange={(event) => setPeriod(Number(event.target.value) as Period)}
      className={styles.periodSelect}
    />
  );

  if (isLoading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dashboard</h1>
          {periodSelector}
        </header>

        <div className={styles.kpiGrid}>
          <KpiCard label="Utilizadores" value="" isLoading />
          <KpiCard label="Novos no período" value="" isLoading />
          <KpiCard label="Planos gerados" value="" isLoading />
          <KpiCard label="Taxa de sucesso da IA" value="" isLoading />
        </div>

        <div className={styles.chartRow}>
          <Card className={styles.chartCard}>
            <h2 className={styles.sectionTitle}>Planos gerados por dia</h2>
            <LineChart data={[]} isLoading />
          </Card>
          <KpiCard label="Custo estimado de IA" value="" isLoading className={styles.costCard} />
        </div>

        <div className={styles.feedbackGrid}>
          <Card className={styles.feedbackCard} aria-busy="true">
            <h2 className={styles.feedbackTitle}>Melhor feedback</h2>
          </Card>
          <Card className={styles.feedbackCard} aria-busy="true">
            <h2 className={styles.feedbackTitle}>Pior feedback</h2>
          </Card>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dashboard</h1>
          {periodSelector}
        </header>
        <ErrorState
          message="Não foi possível carregar as métricas. Verifica a tua ligação e tenta novamente."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (isMetricsEmpty(data)) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dashboard</h1>
          {periodSelector}
        </header>
        <EmptyState
          title="Sem dados neste período"
          description="Ainda não há atividade suficiente para mostrar métricas."
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        {periodSelector}
      </header>

      <div className={styles.kpiGrid}>
        <KpiCard label="Utilizadores" value={data.totalUsers ?? "—"} />
        <KpiCard label="Novos no período" value={data.newUsersInPeriod ?? "—"} hint={`Últimos ${period} dias`} />
        <KpiCard label="Planos gerados" value={data.mealPlansGenerated ?? "—"} />
        <KpiCard label="Taxa de sucesso da IA" value={formatPercent(data.aiSuccessRate)} />
      </div>

      <div className={styles.chartRow}>
        <Card className={styles.chartCard}>
          <h2 className={styles.sectionTitle}>Planos gerados por dia</h2>
          <LineChart data={normalizePlansPerDay(data.plansPerDay)} label="Planos gerados por dia" />
        </Card>
        <KpiCard label="Custo estimado de IA" value={formatUsd(data.estimatedAiCostUsd)} className={styles.costCard} />
      </div>

      <div className={styles.feedbackGrid}>
        <RecipeFeedbackTable title="Melhor feedback" recipes={normalizeRecipes(data.topRecipes)} />
        <RecipeFeedbackTable title="Pior feedback" recipes={normalizeRecipes(data.bottomRecipes)} />
      </div>
    </div>
  );
}
