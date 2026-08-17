package com.ottimizo.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record RecipeIngredientRequest(
    @NotNull Long ingredientId,
    @NotNull @Positive BigDecimal quantity,
    @NotBlank String unit
) {
}
