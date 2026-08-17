package com.ottimizo.catalog;

import jakarta.validation.constraints.NotBlank;

public record RecipeStepRequest(
    @NotBlank String text
) {
}
