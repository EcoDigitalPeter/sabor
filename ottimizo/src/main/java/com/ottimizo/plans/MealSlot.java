package com.ottimizo.plans;

/**
 * Espelha o check constraint de {@code meal_plan_entries.meal_slot} e
 * {@code ad_hoc_recipe_requests.meal_slot} (V003).
 */
public enum MealSlot {
    PEQUENO_ALMOCO,
    ALMOCO,
    JANTAR,
    LANCHE
}
