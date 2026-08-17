package com.ottimizo.orders;

import jakarta.validation.constraints.NotNull;

/**
 * Corpo de {@code PATCH /api/v1/loja/orders/{id}/status} (BE-L04, F3-LOJ-03).
 * {@code reason} so tem efeito quando {@code status == RECUSADA} — fica
 * gravado em {@code Order#rejectReason}; ignorado para as restantes
 * transicoes (ver {@link LojaOrderService#updateStatus}).
 */
public record LojaOrderStatusUpdateRequest(
    @NotNull OrderStatus status,
    String reason
) {
}
