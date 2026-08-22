package com.ottimizo.plans;

import jakarta.validation.constraints.NotNull;

/**
 * Corpo de {@code POST /me/meal-plans/entries/{id}/replace} — "guardar num
 * dia" a receita avulsa devolvida por {@code GET /me/recipes/adhoc/{id}}
 * (BE-C08). Forma alinhada com
 * {@code components.schemas.ReplaceMealPlanEntryRequest} em api.d.ts.
 */
public record ReplaceMealPlanEntryRequest(
    @NotNull Long recipeId
) {
}
