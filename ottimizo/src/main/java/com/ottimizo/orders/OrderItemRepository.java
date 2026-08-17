package com.ottimizo.orders;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByOrder_IdOrderByIdAsc(Long orderId);

    /** Usado por {@link OrderService#toPageResponse} para evitar N+1 ao listar encomendas. */
    List<OrderItem> findByOrder_IdInOrderByIdAsc(List<Long> orderIds);
}
