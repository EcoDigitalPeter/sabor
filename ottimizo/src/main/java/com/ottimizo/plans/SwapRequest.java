package com.ottimizo.plans;

/**
 * Corpo de {@code POST /me/meal-plans/entries/{id}/swap}. {@code reason} e'
 * livre e opcional ("Porque queres trocar?", FE-Q06) — quando presente e a
 * troca e' confirmada ({@code confirm=true}), fica gravado contra a receita
 * "de saida" ({@code recipe_swap_reasons}, V002) e consumido pelo admin em
 * {@code GET /admin/recipes/{id}/swap-reasons} (BE-D06/INT-01). Nao ha IA a
 * interpretar o motivo — e' so texto livre arquivado.
 */
public record SwapRequest(
    String reason
) {
}
