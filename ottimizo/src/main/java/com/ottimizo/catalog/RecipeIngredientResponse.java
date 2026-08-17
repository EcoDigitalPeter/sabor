package com.ottimizo.catalog;

import java.math.BigDecimal;

public record RecipeIngredientResponse(
    Long ingredientId,
    String ingredientName,
    BigDecimal quantity,
    String unit
) {

    public static RecipeIngredientResponse from(RecipeIngredient line) {
        return new RecipeIngredientResponse(
            line.ingredient() == null ? null : line.ingredient().id(),
            line.nameSnapshot(),
            line.quantity(),
            line.unit()
        );
    }
}
