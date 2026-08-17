package com.ottimizo.catalog;

import jakarta.validation.constraints.NotNull;

public record RecipeStatusUpdateRequest(
    @NotNull RecipeStatus status
) {
}
