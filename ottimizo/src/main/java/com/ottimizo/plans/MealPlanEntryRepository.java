package com.ottimizo.plans;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MealPlanEntryRepository extends JpaRepository<MealPlanEntry, Long> {

    /**
     * Ordenado por {@code id} (ordem de insercao, tipicamente
     * pequeno-almoco/almoco/jantar/lanche) em vez de {@code mealSlot} — este
     * e' um enum guardado como texto, ordenar por ele daria ordem
     * alfabetica, nao a ordem das refeicoes do dia.
     */
    List<MealPlanEntry> findByDay_IdInOrderByIdAsc(List<Long> dayIds);

    /**
     * Traz a entrada com o dia e o plano associados numa unica query
     * (join fetch), para {@code MealPlanService} poder verificar
     * ownership (plano.userId == utilizador autenticado) sem N+1.
     */
    @Query("""
        select e from MealPlanEntry e
        join fetch e.day d
        join fetch d.mealPlan p
        where e.id = :id
        """)
    Optional<MealPlanEntry> findByIdWithOwnership(@Param("id") Long id);
}
