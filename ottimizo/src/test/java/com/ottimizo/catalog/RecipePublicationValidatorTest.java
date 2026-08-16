package com.ottimizo.catalog;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class RecipePublicationValidatorTest {

    private final RecipePublicationValidator validator = new RecipePublicationValidator();

    @Test
    void validateForPublication_completeRecipe_doesNotThrow() {
        Recipe recipe = completeRecipe();

        assertThatCode(() -> validator.validateForPublication(recipe)).doesNotThrowAnyException();
    }

    @Test
    void validateForPublication_noIngredients_throwsRecipeIncomplete() {
        Recipe recipe = completeRecipe();
        recipe.replaceIngredients(List.of());

        assertThatThrownBy(() -> validator.validateForPublication(recipe))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA023_RECIPE_INCOMPLETE);
    }

    @Test
    void validateForPublication_fewerThanTwoSteps_throwsRecipeIncomplete() {
        Recipe recipe = completeRecipe();
        recipe.replaceSteps(List.of(new RecipeStep(1, "Only step.")));

        assertThatThrownBy(() -> validator.validateForPublication(recipe))
            .isInstanceOf(ServiceException.class)
            .hasMessageContaining("dois passos");
    }

    @Test
    void validateForPublication_missingKcal_throwsRecipeIncomplete() {
        Recipe recipe = completeRecipe();
        recipe.applyOverrideMacros(null, 10, 10, 10, 10);

        assertThatThrownBy(() -> validator.validateForPublication(recipe))
            .isInstanceOf(ServiceException.class)
            .hasMessageContaining("calorias");
    }

    @Test
    void validateForPublication_missingOneOfFourMacros_throwsRecipeIncomplete() {
        Recipe recipe = completeRecipe();
        recipe.applyOverrideMacros(new BigDecimal("300"), 10, 10, 10, null);

        assertThatThrownBy(() -> validator.validateForPublication(recipe))
            .isInstanceOf(ServiceException.class)
            .hasMessageContaining("macronutrientes");
    }

    @Test
    void validateForPublication_noHealthTags_throwsRecipeIncomplete() {
        Recipe recipe = new Recipe("Receita sem tags", "desc", "almoco", null, 10, 2, null, List.of());
        recipe.replaceIngredients(List.of(ingredientLine()));
        recipe.replaceSteps(List.of(new RecipeStep(1, "Passo 1."), new RecipeStep(2, "Passo 2.")));
        recipe.applyOverrideMacros(new BigDecimal("300"), 10, 10, 10, 10);

        assertThatThrownBy(() -> validator.validateForPublication(recipe))
            .isInstanceOf(ServiceException.class)
            .hasMessageContaining("tag de saude");
    }

    @Test
    void validateForPublication_multipleMissingReasons_joinsAllInMessage() {
        Recipe recipe = new Recipe("Receita vazia", null, null, null, 0, 1, null, List.of());

        assertThatThrownBy(() -> validator.validateForPublication(recipe))
            .isInstanceOf(ServiceException.class)
            .hasMessageContaining("ingrediente")
            .hasMessageContaining("passos")
            .hasMessageContaining("calorias")
            .hasMessageContaining("tag de saude");
    }

    private Recipe completeRecipe() {
        Recipe recipe = new Recipe("Frango com arroz", "desc", "almoco", null, 20, 2, null, List.of("vegetariana"));
        recipe.replaceIngredients(List.of(ingredientLine()));
        recipe.replaceSteps(List.of(new RecipeStep(1, "Cozer o arroz."), new RecipeStep(2, "Grelhar o frango.")));
        recipe.applyOverrideMacros(new BigDecimal("400"), 30, 40, 20, 10);
        return recipe;
    }

    private RecipeIngredient ingredientLine() {
        Ingredient ingredient = new Ingredient(
            "Arroz", "cereais", "g",
            new BigDecimal("130"), new BigDecimal("2.7"), new BigDecimal("28"), new BigDecimal("0.3"), new BigDecimal("0.4"),
            null
        );
        return new RecipeIngredient(ingredient, new BigDecimal("100"), "g");
    }
}
