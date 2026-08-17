package com.ottimizo.plans;

import java.time.LocalDate;
import java.util.List;

/** Forma alinhada com {@code MealPlan} em levesabor-web/src/types/api.d.ts. */
public record MealPlanResponse(
    Long id,
    LocalDate monthStart,
    MealPlanStatus status,
    List<MealPlanDayResponse> days
) {

    public static MealPlanResponse from(MealPlan plan, List<MealPlanDayResponse> days) {
        return new MealPlanResponse(plan.id(), plan.monthStart(), plan.status(), days);
    }
}
