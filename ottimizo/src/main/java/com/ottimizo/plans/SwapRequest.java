package com.ottimizo.plans;

/**
 * Corpo de {@code POST /me/meal-plans/entries/{id}/swap}. {@code reason} e'
 * livre e opcional ("Porque queres trocar?", FE-Q06) — recebido para bater
 * com o contrato ({@code operations.swapMealPlanEntry} em api.d.ts), mas
 * nesta versao nao e' persistido: nao ha IA a interpretar o motivo e o
 * registo do motivo por receita ({@code recipe_swap_reasons}, V002) e'
 * consumido por um ecra de admin (BE-D06) fora do ambito deste cartao.
 */
public record SwapRequest(
    String reason
) {
}
