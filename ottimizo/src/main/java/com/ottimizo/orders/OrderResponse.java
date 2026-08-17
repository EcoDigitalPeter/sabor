package com.ottimizo.orders;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Forma alinhada com {@code Order} em levesabor-web/src/types/api.d.ts.
 * {@code rejectReason} nao e exposto de proposito (o contrato do frontend
 * nao o inclui em {@code Order} — nasce so do lado da loja, F3-LOJ-03/BE-L04).
 */
public record OrderResponse(
    Long id,
    Long storeId,
    String storeName,
    String storeContact,
    String customerName,
    String customerContact,
    OrderStatus status,
    String note,
    List<OrderItemResponse> items,
    OffsetDateTime createdAt
) {

    public static OrderResponse from(Order order, List<OrderItem> items) {
        return new OrderResponse(
            order.id(),
            order.storeId(),
            order.storeName(),
            order.storeContact(),
            order.customerName(),
            order.customerContact(),
            order.status(),
            order.note(),
            items.stream().map(OrderItemResponse::from).toList(),
            order.createdAt()
        );
    }
}
