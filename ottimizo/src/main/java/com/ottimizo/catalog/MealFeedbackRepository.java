package com.ottimizo.catalog;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MealFeedbackRepository extends JpaRepository<MealFeedback, Long> {

    Optional<MealFeedback> findByUserIdAndRecipeId(Long userId, Long recipeId);

    List<MealFeedback> findByUserId(Long userId);

    /** Usado por {@code MealPlanSwapService} para alimentar {@code likedRecipeIds}/{@code dislikedRecipeIds} de {@link RecipeCatalogService#eligibleFor}. */
    @Query("select f.recipeId from MealFeedback f where f.userId = :userId and f.value = :value")
    Set<Long> findRecipeIdsByUserIdAndValue(@Param("userId") Long userId, @Param("value") FeedbackValue value);
}
