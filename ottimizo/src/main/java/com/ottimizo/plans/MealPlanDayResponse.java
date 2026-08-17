package com.ottimizo.plans;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Forma alinhada com {@code MealPlanDay} em levesabor-web/src/types/api.d.ts. */
public record MealPlanDayResponse(
    LocalDate date,
    String weekday,
    BigDecimal totalKcal,
    MacrosResponse macros,
    List<MealPlanEntryResponse> entries
) {

    public static MealPlanDayResponse from(MealPlanDay day, List<MealPlanEntry> entries) {
        return new MealPlanDayResponse(
            day.date(),
            day.weekday(),
            day.totalKcal(),
            MacrosResponse.from(day),
            entries.stream().map(MealPlanEntryResponse::from).toList()
        );
    }
}
