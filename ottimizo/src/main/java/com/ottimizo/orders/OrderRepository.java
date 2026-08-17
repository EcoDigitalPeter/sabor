package com.ottimizo.orders;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Page<Order> findByUserId(Long userId, Pageable pageable);

    /**
     * Lookup com ownership embutido na query: se a encomenda existir mas
     * pertencer a outro cliente, o resultado e vazio (404, nunca 403) —
     * mesmo padrao de {@code ProductRepository#findByIdAndStoreId}.
     */
    Optional<Order> findByIdAndUserId(Long id, Long userId);
}
