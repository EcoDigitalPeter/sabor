package com.ottimizo.catalog;

import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.hibernate.Hibernate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecipeService {

    private static final int SWAP_REASONS_LIMIT = 20;

    private final RecipeRepository recipes;
    private final IngredientRepository ingredients;
    private final RecipeMacroCalculator macroCalculator;
    private final RecipePublicationValidator publicationValidator;
    private final RecipeSwapReasonRepository swapReasons;
    private final AuditService audit;

    public RecipeService(
        RecipeRepository recipes,
        IngredientRepository ingredients,
        RecipeMacroCalculator macroCalculator,
        RecipePublicationValidator publicationValidator,
        RecipeSwapReasonRepository swapReasons,
        AuditService audit
    ) {
        this.recipes = recipes;
        this.ingredients = ingredients;
        this.macroCalculator = macroCalculator;
        this.publicationValidator = publicationValidator;
        this.swapReasons = swapReasons;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Page<Recipe> list(RecipeStatus status, String tag, String q, Pageable pageable) {
        String statusValue = status == null ? null : status.name();
        String tagValue = tag == null || tag.isBlank() ? null : tag.trim();
        String qValue = q == null || q.isBlank() ? null : q.trim();
        return recipes.search(statusValue, tagValue, qValue, pageable);
    }

    /**
     * Catalogo navegavel do cliente (BE-C08/F1-CLI-08): so {@code PUBLISHED},
     * filtro por tags (AND — todas as tags pedidas tem de estar presentes) e
     * pesquisa por nome, ambos opcionais.
     */
    @Transactional(readOnly = true)
    public Page<Recipe> listPublished(List<String> tags, String q, Pageable pageable) {
        String tagsCsv = normalizeTags(tags);
        String qValue = q == null || q.isBlank() ? null : q.trim();
        return recipes.searchPublished(tagsCsv, qValue, pageable);
    }

    private String normalizeTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return null;
        }
        List<String> cleaned = tags.stream()
            .filter(tag -> tag != null && !tag.isBlank())
            .map(String::trim)
            .toList();
        return cleaned.isEmpty() ? null : String.join(",", cleaned);
    }

    /**
     * {@code ingredients}/{@code steps} sao {@code FetchType.LAZY} — inicializa-os
     * aqui, dentro da transaccao, porque {@code AdminRecipeController} mapeia a
     * entidade devolvida para {@code RecipeResponse} ja fora dela (a sessao do
     * Hibernate ja fechou nessa altura), o que rebentava com
     * {@code LazyInitializationException} tanto em {@code GET /admin/recipes/{id}}
     * como em {@code updateStatus} (apanhado a testar o portal admin — nunca
     * tinha sido exercitado fora de {@code create}/{@code update}, que repoem as
     * colecoes em memoria e por isso escapavam ao problema).
     */
    @Transactional(readOnly = true)
    public Recipe get(Long id) {
        Recipe recipe = recipes.findById(id)
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));
        Hibernate.initialize(recipe.ingredients());
        Hibernate.initialize(recipe.steps());
        return recipe;
    }

    @Transactional
    public Recipe create(RecipeRequest request, CurrentUser actor) {
        if (recipes.existsByNameIgnoreCase(request.name().trim())) {
            throw new ServiceException(ErrorCode.LSA006_DUPLICATE, "Ja existe uma receita com este nome.");
        }
        Recipe recipe = new Recipe(
            request.name().trim(),
            request.description(),
            request.mealTag(),
            request.healthNote(),
            request.prepMinutes(),
            request.servings(),
            request.estimatedCostMt(),
            request.healthTags()
        );
        applyIngredientsStepsAndMacros(recipe, request);
        recipe = recipes.save(recipe);
        audit.record(actor, "recipe.create", "Recipe", recipe.id());
        return recipe;
    }

    @Transactional
    public Recipe update(Long id, RecipeRequest request, CurrentUser actor) {
        Recipe recipe = get(id);
        if (recipes.existsByNameIgnoreCaseAndIdNot(request.name().trim(), id)) {
            throw new ServiceException(ErrorCode.LSA006_DUPLICATE, "Ja existe uma receita com este nome.");
        }
        recipe.updateDetails(
            request.name().trim(),
            request.description(),
            request.mealTag(),
            request.healthNote(),
            request.prepMinutes(),
            request.servings(),
            request.estimatedCostMt(),
            request.healthTags()
        );
        applyIngredientsStepsAndMacros(recipe, request);
        audit.record(actor, "recipe.update", "Recipe", recipe.id());
        return recipe;
    }

    @Transactional
    public void delete(Long id, CurrentUser actor) {
        Recipe recipe = get(id);
        recipes.delete(recipe);
        audit.record(actor, "recipe.delete", "Recipe", id, Map.of("name", recipe.name()));
    }

    /** {@code GET /admin/recipes/{id}/swap-reasons} (BE-D06) — motivos mais recentes primeiro, limitados a {@link #SWAP_REASONS_LIMIT}. */
    @Transactional(readOnly = true)
    public List<RecipeSwapReason> recentSwapReasons(Long recipeId) {
        return swapReasons.findByRecipeIdOrderByCreatedAtDesc(recipeId, PageRequest.of(0, SWAP_REASONS_LIMIT));
    }

    @Transactional
    public Recipe updateStatus(Long id, RecipeStatus status, CurrentUser actor) {
        Recipe recipe = get(id);
        if (status == RecipeStatus.PUBLISHED) {
            publicationValidator.validateForPublication(recipe);
            recipe.publish();
            audit.record(actor, "recipe.publish", "Recipe", recipe.id());
        } else {
            recipe.unpublish();
            audit.record(actor, "recipe.unpublish", "Recipe", recipe.id());
        }
        return recipe;
    }

    private void applyIngredientsStepsAndMacros(Recipe recipe, RecipeRequest request) {
        List<RecipeIngredient> lines = new ArrayList<>();
        for (RecipeIngredientRequest line : request.ingredients()) {
            Ingredient ingredient = ingredients.findById(line.ingredientId())
                .orElseThrow(() -> new ServiceException(
                    ErrorCode.LSA005_NOT_FOUND,
                    "Ingrediente nao encontrado: id " + line.ingredientId() + "."
                ));
            lines.add(new RecipeIngredient(ingredient, line.quantity(), line.unit()));
        }
        recipe.replaceIngredients(lines);

        List<RecipeStep> steps = new ArrayList<>();
        int order = 1;
        for (RecipeStepRequest step : request.steps()) {
            steps.add(new RecipeStep(order++, step.text()));
        }
        recipe.replaceSteps(steps);

        if (request.macrosOverride()) {
            recipe.applyOverrideMacros(request.kcal(), request.proteinPct(), request.carbsPct(), request.fatPct(), request.fiberPct());
        } else {
            RecipeMacros macros = macroCalculator.calculate(lines);
            recipe.applyCalculatedMacros(macros);
        }
    }
}
