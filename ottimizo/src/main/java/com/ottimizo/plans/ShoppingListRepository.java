package com.ottimizo.plans;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShoppingListRepository extends JpaRepository<ShoppingList, Long> {

    /** No maximo uma por plano ({@code unique (meal_plan_id)}, V003). */
    Optional<ShoppingList> findByMealPlanId(Long mealPlanId);
}
