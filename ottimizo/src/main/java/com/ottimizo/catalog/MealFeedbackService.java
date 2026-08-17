package com.ottimizo.catalog;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@code PUT /me/recipes/{id}/feedback} (BE-C05) — preferencia global do
 * cliente por uma receita. Ver {@link MealFeedback} para a distincao face ao
 * feedback por entrada do plano.
 */
@Service
public class MealFeedbackService {

    private final MealFeedbackRepository mealFeedbacks;
    private final RecipeRepository recipes;

    public MealFeedbackService(MealFeedbackRepository mealFeedbacks, RecipeRepository recipes) {
        this.mealFeedbacks = mealFeedbacks;
        this.recipes = recipes;
    }

    /**
     * Cria ou actualiza a preferencia do utilizador autenticado para a
     * receita dada. Idempotente: repetir o mesmo pedido (mesmo
     * utilizador+receita+valor) faz update sobre a mesma linha, nunca
     * duplica — garantido tanto pelo {@code findByUserIdAndRecipeId} aqui
     * como pela unique constraint em BD (V002).
     */
    @Transactional
    public void setFeedback(CurrentUser actor, Long recipeId, FeedbackValue value) {
        if (!recipes.existsById(recipeId)) {
            throw new ServiceException(ErrorCode.LSA005_NOT_FOUND, "Receita nao encontrada.");
        }
        mealFeedbacks.findByUserIdAndRecipeId(actor.id(), recipeId)
            .ifPresentOrElse(
                existing -> existing.updateValue(value),
                () -> mealFeedbacks.save(new MealFeedback(actor.id(), recipeId, value))
            );
    }

    /** Ids de receitas com feedback {@code LIKE} do utilizador — usado pelo swap para priorizar alternativas. */
    @Transactional(readOnly = true)
    public Set<Long> likedRecipeIds(Long userId) {
        return mealFeedbacks.findRecipeIdsByUserIdAndValue(userId, FeedbackValue.LIKE);
    }

    /** Ids de receitas com feedback {@code DISLIKE} do utilizador — usado pelo swap para excluir alternativas. */
    @Transactional(readOnly = true)
    public Set<Long> dislikedRecipeIds(Long userId) {
        return mealFeedbacks.findRecipeIdsByUserIdAndValue(userId, FeedbackValue.DISLIKE);
    }
}
