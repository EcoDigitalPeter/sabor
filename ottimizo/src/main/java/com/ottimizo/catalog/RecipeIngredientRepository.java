package com.ottimizo.catalog;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecipeIngredientRepository extends JpaRepository<RecipeIngredient, Long> {

    List<RecipeIngredient> findByIngredientId(Long ingredientId);

    boolean existsByIngredientId(Long ingredientId);
}
