package com.ottimizo.plans;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MealPlanDayRepository extends JpaRepository<MealPlanDay, Long> {

    List<MealPlanDay> findByMealPlan_IdOrderByDateAsc(Long mealPlanId);
}
