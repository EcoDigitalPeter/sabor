package com.ottimizo.plans;

import java.math.BigDecimal;

/**
 * Forma alinhada com {@code ShoppingListItem} em
 * levesabor-web/src/types/api.d.ts — sem {@code ingredientId} de proposito,
 * o contrato do frontend nao o expoe (so serve para a agregacao interna do
 * {@link ShoppingListService}).
 */
public record ShoppingListItemResponse(
    Long id,
    String ingredientName,
    String category,
    BigDecimal quantity,
    String unit,
    boolean checked,
    BigDecimal estimatedCostMt,
    BigDecimal haveQuantity,
    ShoppingListItemOrigin origin
) {

    public static ShoppingListItemResponse from(ShoppingListItem item) {
        return new ShoppingListItemResponse(
            item.id(),
            item.ingredientName(),
            item.category(),
            item.quantity(),
            item.unit(),
            item.checked(),
            item.estimatedCostMt(),
            item.haveQuantity(),
            item.origin()
        );
    }
}
