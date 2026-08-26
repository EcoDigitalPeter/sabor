-- BE-C03 (revisao Free/custo): plano mensal passa a ser gerado por semanas
-- (7 dias de cada vez) em vez do mes inteiro numa unica chamada a IA.
-- days_generated acompanha quantos dias do mes ja foram gerados/persistidos
-- para este plano; a semana seguinte so' e' gerada quando a anterior estiver
-- toda marcada como "Comi isto" (ver AiMealPlanService#maybeGenerateNextWeek).

alter table public.meal_plans add column if not exists days_generated integer not null default 7;

-- Backfill: planos ja existentes (gerados por inteiro antes desta mudanca)
-- ficam com days_generated a reflectir a contagem real de dias ja persistidos,
-- nao o default de 7 acima (esse default so' serve para o caminho normal de
-- planos novos, que ja chamam MealPlan.extendDaysGenerated no momento da
-- criacao).
update public.meal_plans mp
set days_generated = coalesce(
    (select count(*) from public.meal_plan_days d where d.meal_plan_id = mp.id),
    0
);
