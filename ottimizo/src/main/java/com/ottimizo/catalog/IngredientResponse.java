package com.ottimizo.catalog;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record IngredientResponse(
    Long id,
    String name,
    String category,
    String baseUnit,
    BigDecimal kcalPer100g,
    BigDecimal proteinPer100g,
    BigDecimal carbsPer100g,
    BigDecimal fatPer100g,
    BigDecimal fiberPer100g,
    BigDecimal referencePriceMt,
    boolean active,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {

    public static IngredientResponse from(Ingredient ingredient) {
        return new IngredientResponse(
            ingredient.id(),
            ingredient.name(),
            ingredient.category(),
            ingredient.baseUnit(),
            ingredient.kcalPer100g(),
            ingredient.proteinPer100g(),
            ingredient.carbsPer100g(),
            ingredient.fatPer100g(),
            ingredient.fiberPer100g(),
            ingredient.referencePriceMt(),
            ingredient.active(),
            ingredient.createdAt(),
            ingredient.updatedAt()
        );
    }
}
