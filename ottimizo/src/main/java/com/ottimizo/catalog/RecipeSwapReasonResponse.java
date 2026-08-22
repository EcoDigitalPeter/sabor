package com.ottimizo.catalog;

import java.time.OffsetDateTime;

/** {@code GET /admin/recipes/{id}/swap-reasons} — mais recentes primeiro. */
public record RecipeSwapReasonResponse(
    Long id,
    String reason,
    OffsetDateTime createdAt
) {

    public static RecipeSwapReasonResponse from(RecipeSwapReason entity) {
        return new RecipeSwapReasonResponse(entity.id(), entity.reason(), entity.createdAt());
    }
}
