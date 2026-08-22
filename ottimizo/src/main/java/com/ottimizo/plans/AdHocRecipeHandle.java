package com.ottimizo.plans;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Resposta de {@code POST}/{@code GET .../me/recipes/adhoc} — forma alinhada
 * com {@code components.schemas.AdHocRecipeHandle} em api.d.ts. {@code recipe}
 * so vem preenchido quando {@code status == READY}.
 */
public record AdHocRecipeHandle(
    Long id,
    MealGenerationStatus status,
    JsonNode recipe
) {

    public static AdHocRecipeHandle from(AdHocRecipeRequest request) {
        return new AdHocRecipeHandle(request.id(), request.status(), request.recipeSnapshot());
    }
}
