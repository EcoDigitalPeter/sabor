package com.ottimizo.catalog;

public record RecipeStepResponse(
    Integer stepOrder,
    String text
) {

    public static RecipeStepResponse from(RecipeStep step) {
        return new RecipeStepResponse(step.stepOrder(), step.text());
    }
}
