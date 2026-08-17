package com.ottimizo.orders;

import java.math.BigDecimal;

/**
 * Forma alinhada com {@code OrderItem} em levesabor-web/src/types/api.d.ts —
 * so o snapshot visivel ao cliente, sem {@code shoppingListItemId}/{@code
 * productId} (detalhe interno de resolucao, ver {@link OrderService}).
 */
public record OrderItemResponse(
    String ingredientName,
    BigDecimal quantity,
    String unit,
    BigDecimal priceMt
) {

    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(item.ingredientName(), item.quantity(), item.unit(), item.priceMt());
    }
}
