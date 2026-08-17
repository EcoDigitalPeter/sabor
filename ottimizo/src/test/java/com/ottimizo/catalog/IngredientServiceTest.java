package com.ottimizo.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class IngredientServiceTest {

    @Mock
    private IngredientRepository ingredients;
    @Mock
    private RecipeIngredientRepository recipeIngredients;
    @Mock
    private RecipeRepository recipes;
    @Mock
    private AuditService audit;

    private IngredientService service;

    private final CurrentUser actor = new CurrentUser(1L, UUID.randomUUID(), "admin@example.com", Role.ADMIN, null);

    @BeforeEach
    void setUp() {
        service = new IngredientService(ingredients, recipeIngredients, recipes, audit);
    }

    @Test
    void create_savesIngredientAndAudits() {
        IngredientRequest request = request("Arroz", false);
        when(ingredients.existsByNameIgnoreCase("Arroz")).thenReturn(false);
        when(ingredients.save(any(Ingredient.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Ingredient created = service.create(request, actor);

        assertThat(created.name()).isEqualTo("Arroz");
        verify(audit).record(eq(actor), eq("ingredient.create"), eq("Ingredient"), any());
    }

    @Test
    void create_duplicateNameCaseInsensitive_throwsDuplicate() {
        IngredientRequest request = request("Arroz", false);
        when(ingredients.existsByNameIgnoreCase("Arroz")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request, actor))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA006_DUPLICATE);

        verify(ingredients, never()).save(any());
    }

    @Test
    void get_notFound_throwsNotFound() {
        when(ingredients.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(99L))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    @Test
    void update_duplicateNameOnAnotherIngredient_throwsDuplicate() {
        Ingredient existing = ingredient(5L, "Arroz");
        when(ingredients.findById(5L)).thenReturn(Optional.of(existing));
        when(ingredients.existsByNameIgnoreCaseAndIdNot("Feijao", 5L)).thenReturn(true);

        assertThatThrownBy(() -> service.update(5L, request("Feijao", false), actor))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA006_DUPLICATE);
    }

    @Test
    void delete_ingredientNotUsedByAnyRecipe_deletesAndAudits() {
        Ingredient existing = ingredient(5L, "Arroz");
        when(ingredients.findById(5L)).thenReturn(Optional.of(existing));
        when(recipeIngredients.findByIngredientId(5L)).thenReturn(List.of());

        service.delete(5L, actor);

        verify(ingredients).delete(existing);
        verify(audit).record(eq(actor), eq("ingredient.delete"), eq("Ingredient"), eq(5L), any());
    }

    @Test
    void delete_ingredientInUse_throwsInUse_listsRecipeNames_andNeverDeletes() {
        Ingredient existing = ingredient(5L, "Arroz");
        when(ingredients.findById(5L)).thenReturn(Optional.of(existing));

        RecipeIngredient usage = new RecipeIngredient(existing, new BigDecimal("100"), "g");
        ReflectionTestUtils.setField(usage, "recipeId", 42L);
        when(recipeIngredients.findByIngredientId(5L)).thenReturn(List.of(usage));

        Recipe usingRecipe = BeanUtils.instantiateClass(Recipe.class);
        ReflectionTestUtils.setField(usingRecipe, "id", 42L);
        ReflectionTestUtils.setField(usingRecipe, "name", "Frango com arroz");
        when(recipes.findAllById(List.of(42L))).thenReturn(List.of(usingRecipe));

        assertThatThrownBy(() -> service.delete(5L, actor))
            .isInstanceOf(ServiceException.class)
            .hasMessageContaining("Frango com arroz")
            .extracting("code")
            .isEqualTo(ErrorCode.LSA021_INGREDIENT_IN_USE);

        verify(ingredients, never()).delete(any());
        verify(audit, never()).record(eq(actor), eq("ingredient.delete"), any(), anyLong(), any());
    }

    private IngredientRequest request(String name, boolean active) {
        return new IngredientRequest(
            name, "cereais", "g",
            new BigDecimal("130"), new BigDecimal("2.7"), new BigDecimal("28"), new BigDecimal("0.3"), new BigDecimal("0.4"),
            null, active
        );
    }

    private Ingredient ingredient(Long id, String name) {
        Ingredient ingredient = BeanUtils.instantiateClass(Ingredient.class);
        ReflectionTestUtils.setField(ingredient, "id", id);
        ReflectionTestUtils.setField(ingredient, "name", name);
        return ingredient;
    }
}
