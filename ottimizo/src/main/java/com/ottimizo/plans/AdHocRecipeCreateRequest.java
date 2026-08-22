package com.ottimizo.plans;

import com.ottimizo.profile.Goal;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Corpo de {@code POST /me/recipes/adhoc} — forma alinhada com
 * {@code components.schemas.AdHocRecipeRequest} em
 * {@code levesabor-web/src/types/api.d.ts}. Nomeado
 * {@code AdHocRecipeCreateRequest} (nao {@code AdHocRecipeRequest}, o nome do
 * schema/DTO frontend) para nao colidir com a entidade JPA
 * {@link AdHocRecipeRequest} que representa a mesma coisa do lado da BD.
 */
public record AdHocRecipeCreateRequest(
    @NotNull MealSlot mealSlot,
    Goal goal,
    @Size(max = 140) String note
) {
}
