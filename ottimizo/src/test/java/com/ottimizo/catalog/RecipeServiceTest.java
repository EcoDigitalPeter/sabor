package com.ottimizo.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class RecipeServiceTest {

    @Mock
    private RecipeRepository recipes;
    @Mock
    private IngredientRepository ingredients;
    @Mock
    private RecipeSwapReasonRepository swapReasons;
    @Mock
    private AuditService audit;

    private final RecipeMacroCalculator macroCalculator = new RecipeMacroCalculator();
    private final RecipePublicationValidator publicationValidator = new RecipePublicationValidator();

    private RecipeService service;

    private final CurrentUser actor = new CurrentUser(1L, UUID.randomUUID(), "admin@example.com", Role.ADMIN, null);

    @BeforeEach
    void setUp() {
        service = new RecipeService(recipes, ingredients, macroCalculator, publicationValidator, swapReasons, audit);
    }

    @Test
    void create_duplicateName_throwsDuplicate() {
        when(recipes.existsByNameIgnoreCase("Frango com arroz")).thenReturn(true);

        assertThatThrownBy(() -> service.create(completeRequest(), actor))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA006_DUPLICATE);

        verify(recipes, never()).save(any());
    }

    @Test
    void create_unknownIngredientId_throwsNotFound() {
        when(recipes.existsByNameIgnoreCase(any())).thenReturn(false);
        when(ingredients.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(completeRequest(), actor))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    @Test
    void create_withoutMacrosOverride_calculatesMacrosFromIngredients() {
        when(recipes.existsByNameIgnoreCase(any())).thenReturn(false);
        Ingredient arroz = new Ingredient(
            "Arroz", "cereais", "g",
            new BigDecimal("130"), new BigDecimal("2.7"), new BigDecimal("28"), new BigDecimal("0.3"), new BigDecimal("0.4"),
            null
        );
        when(ingredients.findById(1L)).thenReturn(Optional.of(arroz));
        when(recipes.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Recipe saved = service.create(completeRequest(), actor);

        assertThat(saved.macrosOverride()).isFalse();
        assertThat(saved.kcal()).isEqualByComparingTo("260.00"); // 200g de arroz a 130 kcal/100g
        assertThat(saved.ingredients()).hasSize(1);
        assertThat(saved.steps()).hasSize(2);
        verify(audit).record(eq(actor), eq("recipe.create"), eq("Recipe"), any());
    }

    @Test
    void create_withMacrosOverride_usesRequestValuesVerbatim() {
        when(recipes.existsByNameIgnoreCase(any())).thenReturn(false);
        Ingredient arroz = new Ingredient(
            "Arroz", "cereais", "g",
            new BigDecimal("130"), new BigDecimal("2.7"), new BigDecimal("28"), new BigDecimal("0.3"), new BigDecimal("0.4"),
            null
        );
        when(ingredients.findById(1L)).thenReturn(Optional.of(arroz));
        when(recipes.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RecipeRequest overrideRequest = new RecipeRequest(
            "Frango com arroz", "desc", "almoco", null, 20, 2, null,
            List.of("vegetariana"),
            List.of(new RecipeIngredientRequest(1L, new BigDecimal("200"), "g")),
            List.of(new RecipeStepRequest("Passo 1."), new RecipeStepRequest("Passo 2.")),
            true, new BigDecimal("500"), 25, 25, 25, 25
        );

        Recipe saved = service.create(overrideRequest, actor);

        assertThat(saved.macrosOverride()).isTrue();
        assertThat(saved.kcal()).isEqualByComparingTo("500");
        assertThat(saved.proteinPct()).isEqualTo(25);
    }

    @Test
    void updateStatus_publishIncompleteRecipe_throwsRecipeIncomplete_andNeverPublishes() {
        Recipe draft = BeanUtils.instantiateClass(Recipe.class);
        ReflectionTestUtils.setField(draft, "id", 7L);
        ReflectionTestUtils.setField(draft, "name", "Receita incompleta");
        ReflectionTestUtils.setField(draft, "healthTags", List.of());
        ReflectionTestUtils.setField(draft, "ingredients", List.of());
        ReflectionTestUtils.setField(draft, "steps", List.of());
        ReflectionTestUtils.setField(draft, "status", RecipeStatus.DRAFT);
        when(recipes.findById(7L)).thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> service.updateStatus(7L, RecipeStatus.PUBLISHED, actor))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA023_RECIPE_INCOMPLETE);

        assertThat(draft.status()).isEqualTo(RecipeStatus.DRAFT);
        verify(audit, never()).record(eq(actor), eq("recipe.publish"), any(), any());
    }

    @Test
    void updateStatus_publishCompleteRecipe_publishesAndAudits() {
        Recipe recipe = service.create(completeRequestForCalculatedMacros(), actor);
        // simula persistencia: findById devolve a mesma instancia recem-criada
        ReflectionTestUtils.setField(recipe, "id", 3L);
        when(recipes.findById(3L)).thenReturn(Optional.of(recipe));

        Recipe published = service.updateStatus(3L, RecipeStatus.PUBLISHED, actor);

        assertThat(published.status()).isEqualTo(RecipeStatus.PUBLISHED);
        verify(audit).record(eq(actor), eq("recipe.publish"), eq("Recipe"), eq(3L));
    }

    @Test
    void updateStatus_unpublish_setsDraftAndAudits() {
        Recipe published = BeanUtils.instantiateClass(Recipe.class);
        ReflectionTestUtils.setField(published, "id", 3L);
        ReflectionTestUtils.setField(published, "status", RecipeStatus.PUBLISHED);
        when(recipes.findById(3L)).thenReturn(Optional.of(published));

        Recipe result = service.updateStatus(3L, RecipeStatus.DRAFT, actor);

        assertThat(result.status()).isEqualTo(RecipeStatus.DRAFT);
        verify(audit).record(eq(actor), eq("recipe.unpublish"), eq("Recipe"), eq(3L));
    }

    // -- listPublished (BE-C08/F1-CLI-08: catalogo navegavel do cliente) --

    @Test
    void listPublished_withTagsAndQuery_normalizesAndForwardsToRepository() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Recipe> emptyPage = new PageImpl<>(List.of());
        when(recipes.searchPublished(eq("vegan,sem_gluten"), eq("frango"), eq(pageable))).thenReturn(emptyPage);

        Page<Recipe> result = service.listPublished(List.of(" vegan ", "sem_gluten"), "  frango  ", pageable);

        assertThat(result).isSameAs(emptyPage);
        verify(recipes).searchPublished("vegan,sem_gluten", "frango", pageable);
    }

    @Test
    void listPublished_withNullOrEmptyTags_passesNullTagsCsv() {
        Pageable pageable = PageRequest.of(0, 20);
        when(recipes.searchPublished(isNull(), any(), eq(pageable))).thenReturn(new PageImpl<>(List.of()));

        service.listPublished(null, null, pageable);
        service.listPublished(List.of(), null, pageable);
        service.listPublished(List.of("  ", ""), null, pageable);

        verify(recipes, times(3)).searchPublished(isNull(), isNull(), eq(pageable));
    }

    @Test
    void listPublished_withBlankQuery_passesNullQ() {
        Pageable pageable = PageRequest.of(0, 20);
        when(recipes.searchPublished(any(), any(), eq(pageable))).thenReturn(new PageImpl<>(List.of()));

        service.listPublished(null, "   ", pageable);

        verify(recipes).searchPublished(null, null, pageable);
    }

    @Test
    void listPublished_returnsRepositoryPageVerbatim_soControllerCanPaginate() {
        Pageable pageable = PageRequest.of(1, 5);
        Recipe recipe = BeanUtils.instantiateClass(Recipe.class);
        ReflectionTestUtils.setField(recipe, "id", 42L);
        ReflectionTestUtils.setField(recipe, "status", RecipeStatus.PUBLISHED);
        Page<Recipe> page = new PageImpl<>(List.of(recipe), pageable, 6);
        when(recipes.searchPublished(any(), any(), eq(pageable))).thenReturn(page);

        Page<Recipe> result = service.listPublished(List.of("alta_proteina"), "arroz", pageable);

        assertThat(result.getContent()).containsExactly(recipe);
        assertThat(result.getTotalElements()).isEqualTo(6);
    }

    private RecipeRequest completeRequest() {
        return new RecipeRequest(
            "Frango com arroz", "desc", "almoco", null, 20, 2, null,
            List.of("vegetariana"),
            List.of(new RecipeIngredientRequest(1L, new BigDecimal("200"), "g")),
            List.of(new RecipeStepRequest("Cozer o arroz."), new RecipeStepRequest("Grelhar o frango.")),
            false, null, null, null, null, null
        );
    }

    private RecipeRequest completeRequestForCalculatedMacros() {
        Ingredient arroz = new Ingredient(
            "Arroz", "cereais", "g",
            new BigDecimal("130"), new BigDecimal("2.7"), new BigDecimal("28"), new BigDecimal("0.3"), new BigDecimal("0.4"),
            null
        );
        when(recipes.existsByNameIgnoreCase(any())).thenReturn(false);
        when(ingredients.findById(1L)).thenReturn(Optional.of(arroz));
        when(recipes.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));
        return completeRequest();
    }
}
