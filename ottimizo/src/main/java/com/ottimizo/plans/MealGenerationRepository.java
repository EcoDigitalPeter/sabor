package com.ottimizo.plans;

import java.time.OffsetDateTime;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MealGenerationRepository extends JpaRepository<MealGeneration, Long> {

    /** BE-C03 — LSA011: já existe uma geração deste tipo em curso para o utilizador. */
    boolean existsByUserIdAndKindAndStatus(Long userId, MealGenerationKind kind, MealGenerationStatus status);

    /** BE-C03 — LSA012: contagem de gerações pedidas hoje, para o limite diário. */
    long countByUserIdAndKindAndCreatedAtGreaterThanEqual(Long userId, MealGenerationKind kind, OffsetDateTime since);
}
