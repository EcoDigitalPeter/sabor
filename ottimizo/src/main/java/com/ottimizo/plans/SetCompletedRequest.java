package com.ottimizo.plans;

/**
 * Corpo de {@code PATCH /me/meal-plans/entries/{id}/completed} ("Comi isto",
 * FE-V01). Forma alinhada com {@code components.schemas.SetCompletedRequest}
 * em {@code levesabor-web/src/types/api.d.ts}.
 */
public record SetCompletedRequest(
    boolean completed
) {
}
