package com.ottimizo.orders;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * {@code POST /me/orders} (F3-CLI-07) — cria uma encomenda a partir de itens
 * da lista de compras actual do cliente autenticado, para uma loja parceira
 * ({@code storeId}). Forma alinhada com {@code OrderRequest} em
 * levesabor-web/src/types/api.d.ts.
 */
public record OrderRequest(
    @NotNull Long storeId,
    @Size(max = 300) String note,
    @NotEmpty List<@Valid OrderItemRequest> items
) {
}
