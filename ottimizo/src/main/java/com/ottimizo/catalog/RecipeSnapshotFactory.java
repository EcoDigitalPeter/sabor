package com.ottimizo.catalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

/**
 * Constroi o {@code RecipeSnapshot} (forma alinhada com
 * {@code components.schemas.RecipeSnapshot} em
 * {@code levesabor-web/src/types/api.d.ts}: {@code recipeId}, {@code name},
 * {@code kcal}, {@code prepMinutes}, {@code estimatedCostMt}, {@code macros}
 * ({@code proteina}/{@code carbs}/{@code gordura}/{@code fibra}),
 * {@code healthTags}, {@code healthNote}, {@code ingredients}, {@code steps})
 * a partir de um {@link Recipe} vivo do catalogo. Usado por
 * {@code MealPlanSwapService} (BE-C05) para gravar o novo
 * {@code recipe_snapshot} no momento da troca; a geracao inicial do plano
 * (BE-C03) ainda nao existe nesta branch, mas quando for construida deve
 * poder reutilizar esta mesma fabrica em vez de duplicar o mapeamento.
 */
@Component
public class RecipeSnapshotFactory {

    private final ObjectMapper objectMapper;

    public RecipeSnapshotFactory(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ObjectNode from(Recipe recipe) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("recipeId", recipe.id());
        node.put("name", recipe.name());
        if (recipe.imageUrl() != null) {
            node.put("imageUrl", recipe.imageUrl());
        }
        if (recipe.kcal() != null) {
            node.put("kcal", recipe.kcal());
        }
        node.put("prepMinutes", recipe.prepMinutes());
        if (recipe.estimatedCostMt() != null) {
            node.put("estimatedCostMt", recipe.estimatedCostMt());
        }

        ObjectNode macros = node.putObject("macros");
        macros.put("proteina", recipe.proteinPct());
        macros.put("carbs", recipe.carbsPct());
        macros.put("gordura", recipe.fatPct());
        macros.put("fibra", recipe.fiberPct());

        ArrayNode healthTags = node.putArray("healthTags");
        recipe.healthTags().forEach(healthTags::add);

        if (recipe.healthNote() != null) {
            node.put("healthNote", recipe.healthNote());
        }

        ArrayNode ingredients = node.putArray("ingredients");
        recipe.ingredients().forEach(line -> {
            ObjectNode ingredientNode = ingredients.addObject();
            if (line.ingredient() != null) {
                ingredientNode.put("ingredientId", line.ingredient().id());
            }
            ingredientNode.put("name", line.nameSnapshot());
            ingredientNode.put("quantity", line.quantity());
            ingredientNode.put("unit", line.unit());
        });

        ArrayNode steps = node.putArray("steps");
        recipe.steps().forEach(step -> {
            ObjectNode stepNode = steps.addObject();
            stepNode.put("order", step.stepOrder());
            stepNode.put("text", step.text());
        });

        return node;
    }
}
