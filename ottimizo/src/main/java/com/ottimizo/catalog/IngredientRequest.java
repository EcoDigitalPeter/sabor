package com.ottimizo.catalog;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record IngredientRequest(
    @NotBlank String name,
    @NotBlank String category,
    @NotBlank String baseUnit,
    @NotNull @DecimalMin("0") @DecimalMax("900") BigDecimal kcalPer100g,
    @NotNull @DecimalMin("0") BigDecimal proteinPer100g,
    @NotNull @DecimalMin("0") BigDecimal carbsPer100g,
    @NotNull @DecimalMin("0") BigDecimal fatPer100g,
    @NotNull @DecimalMin("0") BigDecimal fiberPer100g,
    @Positive BigDecimal referencePriceMt,
    boolean active
) {
}
