package com.ottimizo.plans;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Forma alinhada com {@code MealPlanEntry} em
 * levesabor-web/src/types/api.d.ts. {@code recipe} e o
 * {@code recipe_snapshot} (jsonb) devolvido tal e qual — foi gravado no
 * momento da geracao (BE-C03) ja na forma de {@code RecipeSnapshot}
 * (recipeId, name, kcal, prepMinutes, estimatedCostMt, macros, healthTags,
 * healthNote, ingredients, steps), por isso nao precisa de remapeamento
 * aqui.
 */
public record MealPlanEntryResponse(
    Long id,
    MealSlot mealSlot,
    JsonNode recipe,
    EntryFeedback feedback,
    boolean completed
) {

    public static MealPlanEntryResponse from(MealPlanEntry entry) {
        return new MealPlanEntryResponse(
            entry.id(),
            entry.mealSlot(),
            entry.recipeSnapshot(),
            entry.feedback(),
            entry.completed()
        );
    }
}
