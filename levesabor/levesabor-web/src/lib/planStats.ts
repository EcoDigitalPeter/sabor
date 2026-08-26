// FE-C03/FE-C09 · Funções puras partilhadas entre /plano e /inicio para data de hoje, rótulo do
// mês, sequência de dias (streak, sem gamificação — só texto + número) e saudação por hora do dia.
// Extraído de plano/page.tsx para não duplicar entre as duas páginas que consomem o plano ativo.
import type { components } from "@/types/api";

type MealPlanDay = components["schemas"]["MealPlanDay"];
type MealPlanEntry = components["schemas"]["MealPlanEntry"];
type MealSlot = NonNullable<MealPlanEntry["mealSlot"]>;

export const SLOT_ORDER: Record<string, number> = { PEQUENO_ALMOCO: 0, ALMOCO: 1, JANTAR: 2, LANCHE: 3 };

/** FE-Y09 (ago/2026) — o backend passou a gerar o plano mensal por semanas de 7 dias em vez do
 * mês inteiro de uma só vez (custo de IA); `MealPlan.days` só traz os dias já gerados. */
export const DAYS_PER_WEEK = 7;

const MONTH_FULL_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function todayIsoDate(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

/** "Julho 2026" a partir de MealPlan.monthStart (YYYY-MM-DD). */
export function formatMonthLabel(monthStartIso: string): string {
  const [y, m] = monthStartIso.split("-").map(Number);
  if (!y || !m || !MONTH_FULL_PT[m - 1]) return monthStartIso;
  return `${MONTH_FULL_PT[m - 1]} ${y}`;
}

/**
 * FE-Y06 · "Segunda-feira, 3 Agosto" a partir de MealPlanDay.weekday ("segunda-feira") + .date
 * (YYYY-MM-DD) — usado no ecrã de "guardar num dia" de "pedir receita agora" para o utilizador
 * saber exactamente que dia está a substituir, não só o nome do dia da semana.
 */
export function formatFullDayLabel(weekday: string, dateIso: string): string {
  const capitalizedWeekday = weekday ? weekday.charAt(0).toUpperCase() + weekday.slice(1) : "";
  const [, m, d] = dateIso.split("-").map(Number);
  const month = m && MONTH_FULL_PT[m - 1] ? MONTH_FULL_PT[m - 1] : "";
  const datePart = [d ? String(d) : "", month].filter(Boolean).join(" ");
  return [capitalizedWeekday, datePart].filter(Boolean).join(", ");
}

/**
 * Sequência de dias (FE-C09, não gamificada — só texto + número): conta dias consecutivos, a
 * partir do dia mais recente com data <= hoje, em que pelo menos uma refeição está `completed`.
 * Para no primeiro dia sem nenhuma refeição marcada.
 */
export function computeStreakDays(days: MealPlanDay[]): number {
  const todayIso = todayIsoDate();
  let anchorIndex = -1;
  for (let i = days.length - 1; i >= 0; i--) {
    if ((days[i]?.date ?? "") <= todayIso) {
      anchorIndex = i;
      break;
    }
  }
  if (anchorIndex === -1) return 0;

  let streak = 0;
  for (let i = anchorIndex; i >= 0; i--) {
    const hasCompleted = (days[i]?.entries ?? []).some((entry) => entry.completed);
    if (!hasCompleted) break;
    streak++;
  }
  return streak;
}

/**
 * FE-Y05 (ago/2026) — a pedido do cliente: "Ainda sem sequência este mês" não era claro e soava
 * negativo. Em vez de só reformular ("Ainda não começaste..."), usa-se directamente uma das
 * frases motivadoras sugeridas pelo cliente, que resolve as duas queixas de uma vez (clareza +
 * tom positivo junto ao "0/30").
 */
export function streakLabel(streak: number): string {
  if (streak <= 0) return "Hoje é um bom dia para começares.";
  const dayWord = streak === 1 ? "dia seguido" : "dias seguidos";
  return `Já marcaste refeições em ${streak} ${dayWord}.`;
}

/**
 * FE-Y05 — refeição "actual" por hora do dia (cliente pediu para destacar visualmente qual é a
 * próxima refeição, ex.: às 12h destacar o Almoço). Bandas simples e aproximadas, sem depender de
 * horários reais configurados pelo utilizador (não existem ainda no perfil):
 * pequeno-almoço 5h-11h, almoço 11h-15h, jantar 18h-22h, lanche no resto (meio da tarde/noite).
 */
export function currentMealSlot(hour: number = new Date().getHours()): MealSlot {
  if (hour >= 5 && hour < 11) return "PEQUENO_ALMOCO";
  if (hour >= 11 && hour < 15) return "ALMOCO";
  if (hour >= 18 && hour < 22) return "JANTAR";
  return "LANCHE";
}

/**
 * FE-Y05 — indicador "dentro do objectivo" (ex.: "🟢 Dentro do objetivo"): banda de ±15% à volta
 * da meta diária de kcal (`MealPlanDay.targetKcal`, ver comentário FE-Y05 em fixtures.ts sobre a
 * origem do valor). Sem meta conhecida, não há indicador a mostrar.
 */
export function isWithinDailyTarget(totalKcal: number, targetKcal: number | null | undefined): boolean {
  if (!targetKcal || targetKcal <= 0) return false;
  const tolerance = 0.15;
  return totalKcal >= targetKcal * (1 - tolerance) && totalKcal <= targetKcal * (1 + tolerance);
}

/** Saudação por hora do dia (FE-Q03) — mesmo espírito do "Good Morning" das referências. */
export function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 19) return "Boa tarde";
  return "Boa noite";
}

/** Entradas de um dia, ordenadas por refeição (pequeno-almoço → lanche). */
export function sortEntriesBySlot(entries: MealPlanEntry[]): MealPlanEntry[] {
  return [...entries].sort((a, b) => (SLOT_ORDER[a.mealSlot ?? ""] ?? 99) - (SLOT_ORDER[b.mealSlot ?? ""] ?? 99));
}

/**
 * FE-Y09 · Nº de dias do mês de `monthStartIso` (YYYY-MM-DD) — usado para saber quantas
 * "semanas" o plano tem no total (7/14/21/28/resto do mês), mesmo quando `MealPlan.days` só traz
 * os dias já gerados pelo backend.
 */
export function daysInMonth(monthStartIso: string): number {
  const [y, m] = monthStartIso.split("-").map(Number);
  if (!y || !m) return 30; // fallback razoável — não deveria acontecer com uma data ISO válida
  return new Date(y, m, 0).getDate();
}

/**
 * FE-Y09 · Um dia conta como concluído quando tem pelo menos uma refeição e todas estão
 * marcadas "Comi isto" — um dia ainda sem refeições (não gerado) nunca conta como concluído.
 */
export function isDayFullyCompleted(day: MealPlanDay): boolean {
  const entries = day.entries ?? [];
  return entries.length > 0 && entries.every((entry) => entry.completed);
}

/**
 * FE-Y09 · Semana "terminada" — é isto que despoleta a geração da semana seguinte no backend,
 * em segundo plano. Precisa de ter pelo menos um dia devolvido e todos os dias devolvidos
 * concluídos (nunca uma semana vazia).
 */
export function isWeekFullyCompleted(weekDays: MealPlanDay[]): boolean {
  return weekDays.length > 0 && weekDays.every(isDayFullyCompleted);
}

/**
 * FE-Y09 · Progresso de refeições concluídas numa semana, para o indicador "X de Y" do cartão de
 * semana bloqueada — nunca um número nu (docs/plano/06-guia-de-copy-e-marca.md, regra 13).
 */
export function countWeekMealsProgress(weekDays: MealPlanDay[]): { completed: number; total: number } {
  let completed = 0;
  let total = 0;
  for (const day of weekDays) {
    const entries = day.entries ?? [];
    total += entries.length;
    completed += entries.filter((entry) => entry.completed).length;
  }
  return { completed, total };
}
