package com.ottimizo.catalog;

import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IngredientService {

    private final IngredientRepository ingredients;
    private final RecipeIngredientRepository recipeIngredients;
    private final RecipeRepository recipes;
    private final AuditService audit;

    public IngredientService(
        IngredientRepository ingredients,
        RecipeIngredientRepository recipeIngredients,
        RecipeRepository recipes,
        AuditService audit
    ) {
        this.ingredients = ingredients;
        this.recipeIngredients = recipeIngredients;
        this.recipes = recipes;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Page<Ingredient> list(String q, Pageable pageable) {
        if (q == null || q.isBlank()) {
            return ingredients.findAll(pageable);
        }
        return ingredients.findByNameContainingIgnoreCase(q.trim(), pageable);
    }

    @Transactional(readOnly = true)
    public Ingredient get(Long id) {
        return ingredients.findById(id)
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));
    }

    @Transactional
    public Ingredient create(IngredientRequest request, CurrentUser actor) {
        if (ingredients.existsByNameIgnoreCase(request.name().trim())) {
            throw new ServiceException(ErrorCode.LSA006_DUPLICATE, "Ja existe um ingrediente com este nome.");
        }
        Ingredient ingredient = new Ingredient(
            request.name().trim(),
            request.category(),
            request.baseUnit(),
            request.kcalPer100g(),
            request.proteinPer100g(),
            request.carbsPer100g(),
            request.fatPer100g(),
            request.fiberPer100g(),
            request.referencePriceMt()
        );
        ingredient = ingredients.save(ingredient);
        audit.record(actor, "ingredient.create", "Ingredient", ingredient.id());
        return ingredient;
    }

    @Transactional
    public Ingredient update(Long id, IngredientRequest request, CurrentUser actor) {
        Ingredient ingredient = get(id);
        if (ingredients.existsByNameIgnoreCaseAndIdNot(request.name().trim(), id)) {
            throw new ServiceException(ErrorCode.LSA006_DUPLICATE, "Ja existe um ingrediente com este nome.");
        }
        ingredient.update(
            request.name().trim(),
            request.category(),
            request.baseUnit(),
            request.kcalPer100g(),
            request.proteinPer100g(),
            request.carbsPer100g(),
            request.fatPer100g(),
            request.fiberPer100g(),
            request.referencePriceMt(),
            request.active()
        );
        audit.record(actor, "ingredient.update", "Ingredient", ingredient.id());
        return ingredient;
    }

    @Transactional
    public void delete(Long id, CurrentUser actor) {
        Ingredient ingredient = get(id);
        List<RecipeIngredient> usages = recipeIngredients.findByIngredientId(id);
        if (!usages.isEmpty()) {
            List<Long> recipeIds = usages.stream().map(RecipeIngredient::recipeId).distinct().toList();
            String recipeNames = recipes.findAllById(recipeIds).stream()
                .map(Recipe::name)
                .collect(Collectors.joining(", "));
            throw new ServiceException(
                ErrorCode.LSA021_INGREDIENT_IN_USE,
                "Ingrediente em uso nas receitas: " + recipeNames + "."
            );
        }
        ingredients.delete(ingredient);
        audit.record(actor, "ingredient.delete", "Ingredient", id, Map.of("name", ingredient.name()));
    }
}
