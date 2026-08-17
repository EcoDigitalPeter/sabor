package com.ottimizo.catalog;

import jakarta.validation.constraints.NotNull;

/** Corpo de {@code PUT /me/recipes/{id}/feedback} — {@code components.schemas.FeedbackRequest} em api.d.ts. */
public record FeedbackRequest(
    @NotNull FeedbackValue value
) {
}
