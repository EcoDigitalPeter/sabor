package com.ottimizo.catalog;

import java.math.BigDecimal;
import java.util.List;

/** Linha da tabela `/admin/receitas` — mais leve que {@link RecipeResponse} (sem ingredientes/passos). */
public record RecipeSummaryResponse(
    Long id,
    String name,
    String imageUrl,
    String mealTag,
    List<String> healthTags,
    BigDecimal kcal,
    RecipeStatus status
) {

    public static RecipeSummaryResponse from(Recipe recipe) {
        return new RecipeSummaryResponse(
            recipe.id(),
            recipe.name(),
            recipe.imageUrl(),
            recipe.mealTag(),
            recipe.healthTags(),
            recipe.kcal(),
            recipe.status()
        );
    }
}
