package com.ottimizo.catalog;

import java.math.BigDecimal;
import java.util.List;

/**
 * Linha do catalogo navegavel de receitas do cliente (BE-C08/F1-CLI-08) —
 * cartao com nome/foto/kcal/tempo (F1-CLI-08, "Fluxo do utilizador" passo 1).
 * Deliberadamente mais magro que {@link RecipeResponse}: sem ingredientes,
 * passos nem campos de moderacao interna (`status`, `macrosOverride`,
 * repartição fina de macros) — o cliente ve o detalhe completo, so-leitura,
 * atraves do ecra de detalhe da receita ja existente (F1-CLI-04) quando toca
 * num cartao.
 */
public record RecipeCatalogItemResponse(
    Long id,
    String name,
    String description,
    String mealTag,
    List<String> healthTags,
    Integer prepMinutes,
    Integer servings,
    BigDecimal kcal
) {

    public static RecipeCatalogItemResponse from(Recipe recipe) {
        return new RecipeCatalogItemResponse(
            recipe.id(),
            recipe.name(),
            recipe.description(),
            recipe.mealTag(),
            recipe.healthTags(),
            recipe.prepMinutes(),
            recipe.servings(),
            recipe.kcal()
        );
    }
}
