package com.ottimizo.plans;

/**
 * Forma alinhada com {@code MealPlanGenerationEnvelope.data} em
 * levesabor-web/src/types/api.d.ts (id, status, mealPlanId).
 */
public record MealGenerationResponse(
    Long id,
    MealGenerationStatus status,
    Long mealPlanId
) {

    public static MealGenerationResponse from(MealGeneration generation) {
        return new MealGenerationResponse(generation.id(), generation.status(), generation.mealPlanId());
    }
}
