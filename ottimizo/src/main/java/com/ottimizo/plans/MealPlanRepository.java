package com.ottimizo.plans;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MealPlanRepository extends JpaRepository<MealPlan, Long> {

    /**
     * No maximo um resultado por desenho ({@code ux_meal_plans_one_active},
     * V003) — usado por {@code GET /me/meal-plans/active}.
     */
    Optional<MealPlan> findByUserIdAndStatus(Long userId, MealPlanStatus status);
}
