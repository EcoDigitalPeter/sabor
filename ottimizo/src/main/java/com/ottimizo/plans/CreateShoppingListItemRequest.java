package com.ottimizo.plans;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * {@code POST /me/shopping-list/items} — item manual (F1-CLI-06B),
 * independente da agregacao automatica do plano; sobrevive a regeneracoes
 * ({@link ShoppingListService#rebuildForPlan} nunca toca em itens
 * {@code origin = MANUAL}).
 */
public record CreateShoppingListItemRequest(
    @NotBlank @Size(min = 2, max = 80) String ingredientName,
    @NotBlank String category,
    @NotNull @Positive BigDecimal quantity,
    @NotBlank String unit,
    BigDecimal estimatedCostMt
) {
}
