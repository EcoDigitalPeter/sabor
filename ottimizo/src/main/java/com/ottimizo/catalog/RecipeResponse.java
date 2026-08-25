package com.ottimizo.catalog;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record RecipeResponse(
    Long id,
    String name,
    String description,
    String mealTag,
    String healthNote,
    String imageUrl,
    Integer prepMinutes,
    Integer servings,
    BigDecimal estimatedCostMt,
    List<String> healthTags,
    BigDecimal kcal,
    Integer proteinPct,
    Integer carbsPct,
    Integer fatPct,
    Integer fiberPct,
    boolean macrosOverride,
    RecipeStatus status,
    List<RecipeIngredientResponse> ingredients,
    List<RecipeStepResponse> steps,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {

    public static RecipeResponse from(Recipe recipe) {
        return new RecipeResponse(
            recipe.id(),
            recipe.name(),
            recipe.description(),
            recipe.mealTag(),
            recipe.healthNote(),
            recipe.imageUrl(),
            recipe.prepMinutes(),
            recipe.servings(),
            recipe.estimatedCostMt(),
            recipe.healthTags(),
            recipe.kcal(),
            recipe.proteinPct(),
            recipe.carbsPct(),
            recipe.fatPct(),
            recipe.fiberPct(),
            recipe.macrosOverride(),
            recipe.status(),
            recipe.ingredients().stream().map(RecipeIngredientResponse::from).toList(),
            recipe.steps().stream().map(RecipeStepResponse::from).toList(),
            recipe.createdAt(),
            recipe.updatedAt()
        );
    }
}
