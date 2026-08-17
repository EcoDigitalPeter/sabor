package com.ottimizo.catalog;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.List;

/**
 * Payload de criacao/edicao de receita. {@code ingredients} e {@code steps}
 * substituem sempre a lista completa (padrao PUT). Quando
 * {@code macrosOverride = true}, {@code kcal}/{@code proteinPct}/
 * {@code carbsPct}/{@code fatPct}/{@code fiberPct} sao usados tal como
 * enviados; quando {@code false} (ou omisso), esses campos sao ignorados e
 * recalculados por {@link RecipeMacroCalculator} a partir de {@code ingredients}.
 */
public record RecipeRequest(
    @NotBlank String name,
    String description,
    String mealTag,
    String healthNote,
    @NotNull @Min(0) Integer prepMinutes,
    @NotNull @Min(1) @Max(12) Integer servings,
    @Positive BigDecimal estimatedCostMt,
    @NotNull List<@NotBlank String> healthTags,
    @NotNull @Valid List<RecipeIngredientRequest> ingredients,
    @NotNull @Valid List<RecipeStepRequest> steps,
    boolean macrosOverride,
    @DecimalMin("0") @DecimalMax("900") BigDecimal kcal,
    @Min(0) @Max(100) Integer proteinPct,
    @Min(0) @Max(100) Integer carbsPct,
    @Min(0) @Max(100) Integer fatPct,
    @Min(0) @Max(100) Integer fiberPct
) {
}
