package com.ottimizo.catalog;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Regras de publicacao server-side de F2-ADM-05: uma receita so pode passar
 * a {@code PUBLISHED} (elegivel para a IA) se estiver completa. Bloqueia com
 * {@link ErrorCode#LSA023_RECIPE_INCOMPLETE}, listando todos os motivos em
 * falta de uma vez (nao so o primeiro), para o admin corrigir tudo numa
 * unica volta ao formulario.
 */
@Component
public class RecipePublicationValidator {

    public void validateForPublication(Recipe recipe) {
        List<String> reasons = new ArrayList<>();

        if (recipe.ingredients() == null || recipe.ingredients().isEmpty()) {
            reasons.add("Adiciona pelo menos um ingrediente.");
        }
        if (recipe.steps() == null || recipe.steps().size() < 2) {
            reasons.add("Adiciona pelo menos dois passos de preparo.");
        }
        if (recipe.kcal() == null) {
            reasons.add("Define as calorias da receita (calculadas ou com substituicao manual).");
        }
        if (recipe.proteinPct() == null || recipe.carbsPct() == null || recipe.fatPct() == null || recipe.fiberPct() == null) {
            reasons.add("Define os quatro macronutrientes da receita (calculados ou com substituicao manual).");
        }
        if (recipe.healthTags() == null || recipe.healthTags().isEmpty()) {
            reasons.add("Selecciona pelo menos uma tag de saude.");
        }

        if (!reasons.isEmpty()) {
            throw new ServiceException(ErrorCode.LSA023_RECIPE_INCOMPLETE, String.join(" ", reasons));
        }
    }
}
