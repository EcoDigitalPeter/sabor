package com.ottimizo.plans;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdHocRecipeRequestRepository extends JpaRepository<AdHocRecipeRequest, Long> {

    /** BE-C08 — LSA015: contagem de pedidos avulsos feitos hoje, para o limite diario. */
    long countByUserIdAndCreatedAtGreaterThanEqual(Long userId, OffsetDateTime since);

    /** Ownership: so' devolve o pedido se pertencer ao utilizador autenticado (senao LSA005, nunca LSA004). */
    Optional<AdHocRecipeRequest> findByIdAndUserId(Long id, Long userId);
}
