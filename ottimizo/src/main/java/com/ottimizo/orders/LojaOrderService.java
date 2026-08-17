package com.ottimizo.orders;

import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.api.PageResponse;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gestao do ciclo de vida da encomenda do lado da loja (BE-L04, F3-LOJ-03).
 * Complementa {@link OrderService} (BE-C07, lado do cliente) sem o
 * substituir: este service so cobre listar/consultar/mudar de estado
 * encomendas escopadas a {@link CurrentUser#storeId()} — nunca cria nem
 * cancela encomendas, isso continua exclusivo do cliente.
 *
 * <p>Mesmo padrao de {@code LojaProductService} (BE-L02): o storeId usado em
 * todos os metodos vem sempre de {@link CurrentUser#requireOwnStoreId(Long)},
 * nunca de um valor recebido no pedido; uma encomenda que exista mas
 * pertenca a outra loja resulta em {@link ErrorCode#LSA005_NOT_FOUND}, nunca
 * 403 (nao revela a outra loja se um dado id de encomenda existe ou nao).
 */
@Service
public class LojaOrderService {

    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final AuditService audit;

    public LojaOrderService(OrderRepository orders, OrderItemRepository orderItems, AuditService audit) {
        this.orders = orders;
        this.orderItems = orderItems;
        this.audit = audit;
    }

    /** {@code GET /api/v1/loja/orders} — paginado, filtro opcional por estado. */
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> list(CurrentUser actor, OrderStatus status, Pageable pageable) {
        Long storeId = ownStoreId(actor);
        Page<Order> page = status == null
            ? orders.findByStoreId(storeId, pageable)
            : orders.findByStoreIdAndStatus(storeId, status, pageable);

        List<Order> pageOrders = page.getContent();
        if (pageOrders.isEmpty()) {
            return PageResponse.from(page.map(order -> OrderResponse.from(order, List.of())));
        }

        List<Long> orderIds = pageOrders.stream().map(Order::id).toList();
        Map<Long, List<OrderItem>> itemsByOrderId = new LinkedHashMap<>();
        for (OrderItem item : orderItems.findByOrder_IdInOrderByIdAsc(orderIds)) {
            itemsByOrderId.computeIfAbsent(item.order().id(), key -> new ArrayList<>()).add(item);
        }

        return PageResponse.from(page.map(order ->
            OrderResponse.from(order, itemsByOrderId.getOrDefault(order.id(), List.of()))
        ));
    }

    /** {@code GET /api/v1/loja/orders/{id}} — ownership obrigatoria. */
    @Transactional(readOnly = true)
    public OrderResponse get(CurrentUser actor, Long id) {
        Order order = findOwnedOrThrow(id, ownStoreId(actor));
        return OrderResponse.from(order, orderItems.findByOrder_IdOrderByIdAsc(order.id()));
    }

    /**
     * {@code PATCH /api/v1/loja/orders/{id}/status} (F3-LOJ-03) — valida a
     * transicao contra {@link OrderStateMachine} antes de aplicar qualquer
     * alteracao. {@code request.reason()} so e persistido quando o destino e
     * {@code RECUSADA}; para as restantes transicoes e ignorado, mesmo que
     * venha preenchido no pedido.
     */
    @Transactional
    public OrderResponse updateStatus(CurrentUser actor, Long id, LojaOrderStatusUpdateRequest request) {
        Long storeId = ownStoreId(actor);
        Order order = findOwnedOrThrow(id, storeId);

        OrderStatus from = order.status();
        OrderStatus to = request.status();
        OrderStateMachine.assertValidLojaTransition(from, to);

        String rejectReason = to == OrderStatus.RECUSADA ? trimToNull(request.reason()) : null;
        order.changeStatus(to, rejectReason);

        audit.record(actor, "ORDER_STATUS_CHANGED", "order", id, Map.of(
            "from", from.name(),
            "to", to.name()
        ));
        return OrderResponse.from(order, orderItems.findByOrder_IdOrderByIdAsc(order.id()));
    }

    private Long ownStoreId(CurrentUser actor) {
        return actor.requireOwnStoreId(actor.storeId());
    }

    private Order findOwnedOrThrow(Long id, Long storeId) {
        return orders.findByIdAndStoreId(id, storeId)
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
