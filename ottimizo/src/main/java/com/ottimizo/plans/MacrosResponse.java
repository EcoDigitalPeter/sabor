package com.ottimizo.plans;

/**
 * Percentagens de macronutrientes de um dia do plano. Nomes de campo em
 * portugues por serem os esperados pelo frontend ({@code Macros} em
 * levesabor-web/src/types/api.d.ts) — nao alterar sem consultar o Revisor
 * de Copy e Marca nem sem actualizar o contrato la.
 */
public record MacrosResponse(
    Integer proteina,
    Integer carbs,
    Integer gordura,
    Integer fibra
) {

    public static MacrosResponse from(MealPlanDay day) {
        return new MacrosResponse(day.proteinPct(), day.carbsPct(), day.fatPct(), day.fiberPct());
    }
}
