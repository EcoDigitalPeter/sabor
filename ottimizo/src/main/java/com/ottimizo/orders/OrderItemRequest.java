package com.ottimizo.orders;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

/**
 * Uma linha de {@code POST /me/orders} — {@code itemId} referencia um
 * {@code ShoppingListItem} (BE-C06) da lista de compras do cliente
 * autenticado, nunca um id livre; a quantidade pode ser menor que a do item
 * (encomenda parcial, ex. so o que falta comprar).
 */
public record OrderItemRequest(
    @NotNull Long itemId,
    @NotNull @Positive BigDecimal quantity
) {
}
