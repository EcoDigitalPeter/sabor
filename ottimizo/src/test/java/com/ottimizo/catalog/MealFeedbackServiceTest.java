package com.ottimizo.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * BE-C05 — {@code PUT /me/recipes/{id}/feedback}. Foco: idempotencia (o
 * mesmo par utilizador+receita nunca gera uma segunda linha, so' actualiza a
 * existente) e o 404 quando a receita nao existe.
 */
@ExtendWith(MockitoExtension.class)
class MealFeedbackServiceTest {

    @Mock
    private MealFeedbackRepository mealFeedbacks;
    @Mock
    private RecipeRepository recipes;

    private MealFeedbackService service;

    private static final Long USER_A = 1L;
    private static final Long RECIPE_1 = 100L;

    @BeforeEach
    void setUp() {
        service = new MealFeedbackService(mealFeedbacks, recipes);
    }

    @Test
    void setFeedback_recipeDoesNotExist_throwsNotFound() {
        CurrentUser actor = clientUser(USER_A);
        when(recipes.existsById(RECIPE_1)).thenReturn(false);

        assertThatThrownBy(() -> service.setFeedback(actor, RECIPE_1, FeedbackValue.LIKE))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);

        verify(mealFeedbacks, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void setFeedback_firstTime_createsANewRow() {
        CurrentUser actor = clientUser(USER_A);
        when(recipes.existsById(RECIPE_1)).thenReturn(true);
        when(mealFeedbacks.findByUserIdAndRecipeId(USER_A, RECIPE_1)).thenReturn(Optional.empty());

        service.setFeedback(actor, RECIPE_1, FeedbackValue.LIKE);

        verify(mealFeedbacks, times(1)).save(org.mockito.ArgumentMatchers.argThat(
            mf -> mf.userId().equals(USER_A) && mf.recipeId().equals(RECIPE_1) && mf.value() == FeedbackValue.LIKE
        ));
    }

    /** Idempotencia: repetir o mesmo pedido faz update sobre a linha existente, nunca insere outra. */
    @Test
    void setFeedback_repeatingTheSameValue_updatesExistingRow_neverInsertsASecondOne() {
        CurrentUser actor = clientUser(USER_A);
        when(recipes.existsById(RECIPE_1)).thenReturn(true);
        MealFeedback existing = new MealFeedback(USER_A, RECIPE_1, FeedbackValue.LIKE);
        when(mealFeedbacks.findByUserIdAndRecipeId(USER_A, RECIPE_1)).thenReturn(Optional.of(existing));

        service.setFeedback(actor, RECIPE_1, FeedbackValue.LIKE);
        service.setFeedback(actor, RECIPE_1, FeedbackValue.LIKE);

        assertThat(existing.value()).isEqualTo(FeedbackValue.LIKE);
        verify(mealFeedbacks, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void setFeedback_changingFromLikeToDislike_updatesTheSameRow() {
        CurrentUser actor = clientUser(USER_A);
        when(recipes.existsById(RECIPE_1)).thenReturn(true);
        MealFeedback existing = new MealFeedback(USER_A, RECIPE_1, FeedbackValue.LIKE);
        when(mealFeedbacks.findByUserIdAndRecipeId(USER_A, RECIPE_1)).thenReturn(Optional.of(existing));

        service.setFeedback(actor, RECIPE_1, FeedbackValue.DISLIKE);

        assertThat(existing.value()).isEqualTo(FeedbackValue.DISLIKE);
        verify(mealFeedbacks, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void likedRecipeIds_delegatesToRepositoryWithLikeValue() {
        when(mealFeedbacks.findRecipeIdsByUserIdAndValue(USER_A, FeedbackValue.LIKE)).thenReturn(Set.of(RECIPE_1));

        assertThat(service.likedRecipeIds(USER_A)).containsExactly(RECIPE_1);
    }

    @Test
    void dislikedRecipeIds_delegatesToRepositoryWithDislikeValue() {
        when(mealFeedbacks.findRecipeIdsByUserIdAndValue(USER_A, FeedbackValue.DISLIKE)).thenReturn(Set.of(RECIPE_1));

        assertThat(service.dislikedRecipeIds(USER_A)).containsExactly(RECIPE_1);
    }

    private CurrentUser clientUser(Long id) {
        return new CurrentUser(id, UUID.randomUUID(), "cliente" + id + "@example.com", Role.CLIENTE, null);
    }
}
