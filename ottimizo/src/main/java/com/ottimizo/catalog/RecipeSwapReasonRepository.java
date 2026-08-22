package com.ottimizo.catalog;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecipeSwapReasonRepository extends JpaRepository<RecipeSwapReason, Long> {

    List<RecipeSwapReason> findByRecipeIdOrderByCreatedAtDesc(Long recipeId, Pageable pageable);
}
