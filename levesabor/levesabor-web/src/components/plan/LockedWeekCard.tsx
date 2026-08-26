// FE-Y09 (ago/2026) · Cartão de "semana ainda não gerada" — o backend passou a gerar o plano
// mensal por semanas de 7 dias em vez do mês inteiro de uma vez (custo de IA); a semana seguinte
// só nasce quando o cliente termina de marcar "Comi isto" em toda a semana actual, em segundo
// plano no servidor. Mesma família visual do fallback "sem foto" de RecipeHero/RecipeGridCard
// (ícone sobre gradiente terracotta/tan) — nunca bloqueia o resto do ecrã, só substitui os
// MealCard dessa semana; sem cadeados/tom de "não podes", é um estado de espera, não de proibição.
import { ChefHat, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import styles from "./LockedWeekCard.module.css";

export type LockedWeekCardProps = {
  weekLabel: string;
  /** Progresso "Comi isto" da semana actual (a que ainda falta terminar para desbloquear esta) —
   * quando `totalMeals` é 0 (plano sem refeições nessa semana) o indicador não é mostrado. */
  completedMeals: number;
  totalMeals: number;
  /**
   * true enquanto a semana anterior já está 100% concluída e o backend está a gerar esta semana
   * (polling ligeiro em useActiveMealPlan) — mostra um estado intermédio em vez de saltar direto
   * de "bloqueado" para o conteúdo.
   */
  preparing?: boolean;
  className?: string;
};

export function LockedWeekCard({
  weekLabel,
  completedMeals,
  totalMeals,
  preparing = false,
  className,
}: LockedWeekCardProps) {
  return (
    <Card variant="alt" className={[styles.card, className].filter(Boolean).join(" ")}>
      <div
        className={[styles.icon, preparing ? styles.iconPreparing : ""].filter(Boolean).join(" ")}
        aria-hidden="true"
      >
        {preparing ? <Sparkles size={28} strokeWidth={1.5} /> : <ChefHat size={28} strokeWidth={1.5} />}
      </div>
      <p className={styles.weekLabel}>{weekLabel}</p>
      {preparing ? (
        <>
          <p className={styles.title}>A preparar a tua próxima semana</p>
          <p className={styles.description}>
            Estamos a escolher os teus próximos pratos — pode demorar alguns segundos.
          </p>
        </>
      ) : (
        <>
          {totalMeals > 0 ? (
            <p className={styles.progress}>{`${completedMeals} de ${totalMeals} refeições concluídas esta semana`}</p>
          ) : null}
          <p className={styles.title}>Disponível assim que terminares a semana em curso — vais bem, continua!</p>
        </>
      )}
    </Card>
  );
}
