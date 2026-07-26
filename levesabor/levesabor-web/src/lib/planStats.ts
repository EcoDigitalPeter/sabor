// FE-C03/FE-C09 · Funções puras partilhadas entre /plano e /inicio para data de hoje, rótulo do
// mês, sequência de dias (streak, sem gamificação — só texto + número) e saudação por hora do dia.
// Extraído de plano/page.tsx para não duplicar entre as duas páginas que consomem o plano ativo.
import type { components } from "@/types/api";

type MealPlanDay = components["schemas"]["MealPlanDay"];
type MealPlanEntry = components["schemas"]["MealPlanEntry"];

export const SLOT_ORDER: Record<string, number> = { PEQUENO_ALMOCO: 0, ALMOCO: 1, JANTAR: 2, LANCHE: 3 };

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

export function streakLabel(streak: number): string {
  if (streak <= 0) return "Ainda sem sequência este mês.";
  const dayWord = streak === 1 ? "dia seguido" : "dias seguidos";
  return `Já marcaste refeições em ${streak} ${dayWord}.`;
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
