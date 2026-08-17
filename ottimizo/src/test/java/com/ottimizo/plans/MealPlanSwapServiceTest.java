package com.ottimizo.plans;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ottimizo.catalog.MealFeedbackService;
import com.ottimizo.catalog.Recipe;
import com.ottimizo.catalog.RecipeCatalogService;
import com.ottimizo.catalog.RecipeSnapshotFactory;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
import com.ottimizo.profile.ClientProfile;
import com.ottimizo.profile.ClientProfileRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * BE-C05 — {@code POST /me/meal-plans/entries/{id}/swap}. Cobre: ownership
 * (mesmo padrao de {@code MealPlanServiceTest} — 404, nunca 403), o filtro
 * determinístico ±20% de kcal, exclusao da propria receita, propor
 * ({@code confirm=false}) vs aplicar ({@code confirm=true}), e
 * {@code LSA014_NO_ALTERNATIVE} quando nao ha alternativa elegivel.
 */
@ExtendWith(MockitoExtension.class)
class MealPlanSwapServiceTest {

    @Mock
    private MealPlanEntryRepository mealPlanEntries;
    @Mock
    private ClientProfileRepository clientProfiles;
    @Mock
    private RecipeCatalogService recipeCatalogService;
    @Mock
    private MealFeedbackService mealFeedbackService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RecipeSnapshotFactory recipeSnapshotFactory = new RecipeSnapshotFactory(objectMapper);

    private MealPlanSwapService service;

    private static final Long USER_A = 1L;
    private static final Long USER_B = 2L;

    @BeforeEach
    void setUp() {
        service = new MealPlanSwapService(
            mealPlanEntries, clientProfiles, recipeCatalogService, mealFeedbackService, recipeSnapshotFactory
        );
    }

    // ---- ownership --------------------------------------------------------

    @Test
    void swap_unknownEntry_throwsNotFound() {
        CurrentUser actor = clientUser(USER_A);
        when(mealPlanEntries.findByIdWithOwnership(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.swap(999L, actor, true))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    @Test
    void swap_entryBelongsToAnotherUser_throwsNotFound_notForbidden() {
        CurrentUser actorB = clientUser(USER_B);
        MealPlanEntry entryOfUserA = mealPlanEntry(USER_A, 1000L, 500);
        when(mealPlanEntries.findByIdWithOwnership(1000L)).thenReturn(Optional.of(entryOfUserA));

        assertThatThrownBy(() -> service.swap(1000L, actorB, true))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);

        verifyNoInteractions(recipeCatalogService);
    }

    // ---- filtro +-20% kcal -------------------------------------------------

    @Test
    void swap_picksFirstEligibleRecipeWithin20PercentOfCurrentKcal() {
        CurrentUser actor = clientUser(USER_A);
        MealPlanEntry entry = mealPlanEntry(USER_A, 1000L, 500); // current recipeId=1, kcal=500
        when(mealPlanEntries.findByIdWithOwnership(1000L)).thenReturn(Optional.of(entry));
        when(clientProfiles.findByUserId(USER_A)).thenReturn(Optional.empty());
        when(mealFeedbackService.likedRecipeIds(USER_A)).thenReturn(Set.of());
        when(mealFeedbackService.dislikedRecipeIds(USER_A)).thenReturn(Set.of());

        Recipe tooLow = recipeWithKcal(2L, 300);   // < 400 (80% de 500) -> fora
        Recipe withinRange = recipeWithKcal(3L, 580); // <= 600 (120% de 500) -> dentro
        Recipe tooHigh = recipeWithKcal(4L, 900);  // > 600 -> fora
        when(recipeCatalogService.eligibleFor(any(), anySet(), anySet()))
            .thenReturn(List.of(tooLow, withinRange, tooHigh));

        SwapResponse response = service.swap(1000L, actor, false);

        assertThat(response.state()).isEqualTo("proposed");
        assertThat(response.alternative().recipe().get("recipeId").asLong()).isEqualTo(3L);
    }

    @Test
    void swap_excludesTheEntrysOwnCurrentRecipe_evenIfWithinKcalRange() {
        CurrentUser actor = clientUser(USER_A);
        MealPlanEntry entry = mealPlanEntry(USER_A, 1000L, 500); // recipeId=1
        when(mealPlanEntries.findByIdWithOwnership(1000L)).thenReturn(Optional.of(entry));
        when(clientProfiles.findByUserId(USER_A)).thenReturn(Optional.empty());
        when(mealFeedbackService.likedRecipeIds(USER_A)).thenReturn(Set.of());
        when(mealFeedbackService.dislikedRecipeIds(USER_A)).thenReturn(Set.of());

        Recipe sameRecipe = recipeWithKcal(1L, 500); // mesma receita da entrada -> excluida
        Recipe alternative = recipeWithKcal(5L, 510);
        when(recipeCatalogService.eligibleFor(any(), anySet(), anySet()))
            .thenReturn(List.of(sameRecipe, alternative));

        SwapResponse response = service.swap(1000L, actor, false);

        assertThat(response.alternative().recipe().get("recipeId").asLong()).isEqualTo(5L);
    }

    @Test
    void swap_noRecipeWithinKcalRange_throwsNoAlternative() {
        CurrentUser actor = clientUser(USER_A);
        MealPlanEntry entry = mealPlanEntry(USER_A, 1000L, 500);
        when(mealPlanEntries.findByIdWithOwnership(1000L)).thenReturn(Optional.of(entry));
        when(clientProfiles.findByUserId(USER_A)).thenReturn(Optional.empty());
        when(mealFeedbackService.likedRecipeIds(USER_A)).thenReturn(Set.of());
        when(mealFeedbackService.dislikedRecipeIds(USER_A)).thenReturn(Set.of());

        Recipe farTooHigh = recipeWithKcal(2L, 2000);
        when(recipeCatalogService.eligibleFor(any(), anySet(), anySet())).thenReturn(List.of(farTooHigh));

        assertThatThrownBy(() -> service.swap(1000L, actor, true))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA014_NO_ALTERNATIVE);
    }

    @Test
    void swap_catalogHasNoEligibleRecipesAtAll_throwsNoAlternative() {
        CurrentUser actor = clientUser(USER_A);
        MealPlanEntry entry = mealPlanEntry(USER_A, 1000L, 500);
        when(mealPlanEntries.findByIdWithOwnership(1000L)).thenReturn(Optional.of(entry));
        when(clientProfiles.findByUserId(USER_A)).thenReturn(Optional.empty());
        when(mealFeedbackService.likedRecipeIds(USER_A)).thenReturn(Set.of());
        when(mealFeedbackService.dislikedRecipeIds(USER_A)).thenReturn(Set.of());
        when(recipeCatalogService.eligibleFor(any(), anySet(), anySet())).thenReturn(List.of());

        assertThatThrownBy(() -> service.swap(1000L, actor, true))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA014_NO_ALTERNATIVE);
    }

    // ---- propor vs aplicar --------------------------------------------------

    @Test
    void swap_confirmFalse_returnsProposal_andDoesNotMutateTheEntry() {
        CurrentUser actor = clientUser(USER_A);
        MealPlanEntry entry = mealPlanEntry(USER_A, 1000L, 500);
        when(mealPlanEntries.findByIdWithOwnership(1000L)).thenReturn(Optional.of(entry));
        when(clientProfiles.findByUserId(USER_A)).thenReturn(Optional.empty());
        when(mealFeedbackService.likedRecipeIds(USER_A)).thenReturn(Set.of());
        when(mealFeedbackService.dislikedRecipeIds(USER_A)).thenReturn(Set.of());
        Recipe alternative = recipeWithKcal(9L, 500);
        when(recipeCatalogService.eligibleFor(any(), anySet(), anySet())).thenReturn(List.of(alternative));

        SwapResponse response = service.swap(1000L, actor, false);

        assertThat(response.state()).isEqualTo("proposed");
        assertThat(entry.recipeId()).isEqualTo(1L); // entrada nao foi tocada
        assertThat(entry.feedback()).isEqualTo(EntryFeedback.NONE);
    }

    @Test
    void swap_confirmTrue_appliesTheAlternative_andResetsEntryFeedback() {
        CurrentUser actor = clientUser(USER_A);
        MealPlanEntry entry = mealPlanEntry(USER_A, 1000L, 500);
        ReflectionTestUtils.setField(entry, "feedback", EntryFeedback.LIKE);
        when(mealPlanEntries.findByIdWithOwnership(1000L)).thenReturn(Optional.of(entry));
        when(clientProfiles.findByUserId(USER_A)).thenReturn(Optional.empty());
        when(mealFeedbackService.likedRecipeIds(USER_A)).thenReturn(Set.of());
        when(mealFeedbackService.dislikedRecipeIds(USER_A)).thenReturn(Set.of());
        Recipe alternative = recipeWithKcal(9L, 500);
        when(recipeCatalogService.eligibleFor(any(), anySet(), anySet())).thenReturn(List.of(alternative));

        SwapResponse response = service.swap(1000L, actor, true);

        assertThat(response.state()).isEqualTo("applied");
        assertThat(entry.recipeId()).isEqualTo(9L);
        assertThat(entry.recipeSnapshot().get("recipeId").asLong()).isEqualTo(9L);
        assertThat(entry.feedback()).isEqualTo(EntryFeedback.NONE);
    }

    @Test
    void swap_usesLikedAndDislikedRecipeIdsFromMealFeedbackService() {
        CurrentUser actor = clientUser(USER_A);
        MealPlanEntry entry = mealPlanEntry(USER_A, 1000L, 500);
        when(mealPlanEntries.findByIdWithOwnership(1000L)).thenReturn(Optional.of(entry));
        ClientProfile profile = new ClientProfile(USER_A);
        when(clientProfiles.findByUserId(USER_A)).thenReturn(Optional.of(profile));
        when(mealFeedbackService.likedRecipeIds(USER_A)).thenReturn(Set.of(7L));
        when(mealFeedbackService.dislikedRecipeIds(USER_A)).thenReturn(Set.of(8L));
        Recipe alternative = recipeWithKcal(9L, 500);
        when(recipeCatalogService.eligibleFor(profile, Set.of(7L), Set.of(8L))).thenReturn(List.of(alternative));

        service.swap(1000L, actor, false);

        org.mockito.Mockito.verify(recipeCatalogService).eligibleFor(profile, Set.of(7L), Set.of(8L));
    }

    // ---- fixtures -----------------------------------------------------------

    private CurrentUser clientUser(Long id) {
        return new CurrentUser(id, UUID.randomUUID(), "cliente" + id + "@example.com", Role.CLIENTE, null);
    }

    private MealPlanEntry mealPlanEntry(Long planOwnerId, Long entryId, int currentKcal) {
        MealPlan plan = new MealPlan(planOwnerId, LocalDate.of(2026, 8, 1), objectMapper.createObjectNode());
        MealPlanDay day = new MealPlanDay(plan, LocalDate.of(2026, 8, 1), "Sabado",
            BigDecimal.valueOf(1800), BigDecimal.valueOf(1800), 25, 55, 15, 5);
        ObjectNode snapshot = objectMapper.createObjectNode();
        snapshot.put("recipeId", 1);
        snapshot.put("name", "Receita actual");
        snapshot.put("kcal", currentKcal);
        MealPlanEntry entry = new MealPlanEntry(day, MealSlot.ALMOCO, 1L, snapshot);
        ReflectionTestUtils.setField(entry, "id", entryId);
        return entry;
    }

    private Recipe recipeWithKcal(long id, int kcal) {
        Recipe recipe = new Recipe("Receita " + id, "descricao", "almoco", null, 15, 2, null, List.of());
        ReflectionTestUtils.setField(recipe, "id", id);
        recipe.publish();
        recipe.applyOverrideMacros(BigDecimal.valueOf(kcal), 25, 55, 15, 5);
        return recipe;
    }
}
