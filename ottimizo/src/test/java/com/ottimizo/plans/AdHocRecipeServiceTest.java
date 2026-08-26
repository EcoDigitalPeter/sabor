package com.ottimizo.plans;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ottimizo.catalog.MealFeedbackService;
import com.ottimizo.catalog.Recipe;
import com.ottimizo.catalog.RecipeCatalogService;
import com.ottimizo.catalog.RecipeImageService;
import com.ottimizo.catalog.RecipeService;
import com.ottimizo.catalog.RecipeSnapshotFactory;
import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
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
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * BE-C08 — {@link AdHocRecipeService}. Cobre: limite diario (LSA015), a
 * geracao assincrona (aqui sincrona em teste, ver nota de {@code self} em
 * {@code AiMealPlanServiceTest}), catalogo elegivel vazio (FAILED), polling
 * com ownership (404, nunca 403), e "guardar num dia"
 * ({@code replaceEntry}): ownership da entrada + so aceita receitas
 * {@code PUBLISHED}.
 */
@ExtendWith(MockitoExtension.class)
class AdHocRecipeServiceTest {

    @Mock
    private AdHocRecipeRequestRepository adHocRequests;
    @Mock
    private MealPlanEntryRepository mealPlanEntries;
    @Mock
    private ClientProfileRepository clientProfiles;
    @Mock
    private RecipeCatalogService recipeCatalogService;
    @Mock
    private MealFeedbackService mealFeedbackService;
    @Mock
    private RecipeService recipeService;
    @Mock
    private RecipeImageService recipeImageService;
    @Mock
    private AuditService audit;
    @Mock
    private ChatClient.Builder chatClientBuilder;
    @Mock
    private ChatClient chatClient;
    @Mock
    private ChatClient.ChatClientRequestSpec requestSpec;
    @Mock
    private ChatClient.CallResponseSpec callResponseSpec;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RecipeSnapshotFactory recipeSnapshotFactory = new RecipeSnapshotFactory(objectMapper);

    private AdHocRecipeService service;

    private static final Long USER_A = 1L;
    private static final Long USER_B = 2L;

    @BeforeEach
    void setUp() {
        lenient().when(chatClientBuilder.build()).thenReturn(chatClient);
        service = new AdHocRecipeService(
            adHocRequests, mealPlanEntries, clientProfiles, recipeCatalogService,
            mealFeedbackService, recipeService, recipeSnapshotFactory, recipeImageService,
            audit, chatClientBuilder, objectMapper, null
        );
        ReflectionTestUtils.setField(service, "self", service);
    }

    // ---- limite diario ------------------------------------------------------

    @Test
    void requestGeneration_underDailyLimit_savesGeneratingRequest() {
        CurrentUser actor = clientUser(USER_A);
        when(adHocRequests.countByUserIdAndCreatedAtGreaterThanEqual(org.mockito.ArgumentMatchers.eq(USER_A), any()))
            .thenReturn(2L);
        AdHocRecipeRequest saved = adHocRecipeRequest(USER_A, 500L);
        when(adHocRequests.save(any())).thenReturn(saved);
        lenient().when(adHocRequests.findById(500L)).thenReturn(Optional.of(saved));
        lenient().when(clientProfiles.findByUserId(USER_A)).thenReturn(Optional.empty());
        lenient().when(mealFeedbackService.likedRecipeIds(USER_A)).thenReturn(Set.of());
        lenient().when(mealFeedbackService.dislikedRecipeIds(USER_A)).thenReturn(Set.of());
        lenient().when(recipeCatalogService.eligibleFor(any(), anySet(), anySet())).thenReturn(List.of());

        AdHocRecipeHandle handle = service.requestGeneration(
            new AdHocRecipeCreateRequest(MealSlot.ALMOCO, null, null), actor
        );

        assertThat(handle.id()).isEqualTo(500L);
    }

    @Test
    void requestGeneration_atDailyLimit_throwsAdhocLimit() {
        CurrentUser actor = clientUser(USER_A);
        when(adHocRequests.countByUserIdAndCreatedAtGreaterThanEqual(org.mockito.ArgumentMatchers.eq(USER_A), any()))
            .thenReturn(3L);

        assertThatThrownBy(() -> service.requestGeneration(
            new AdHocRecipeCreateRequest(MealSlot.ALMOCO, null, null), actor
        ))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA015_ADHOC_LIMIT);

        verifyNoInteractions(recipeCatalogService);
    }

    // ---- geracao (async, sincrona em teste) ----------------------------------

    @Test
    void requestGeneration_withEligibleRecipes_marksReadyWithFirstEligible() {
        CurrentUser actor = clientUser(USER_A);
        when(adHocRequests.countByUserIdAndCreatedAtGreaterThanEqual(org.mockito.ArgumentMatchers.eq(USER_A), any()))
            .thenReturn(0L);
        AdHocRecipeRequest saved = adHocRecipeRequest(USER_A, 500L);
        when(adHocRequests.save(any())).thenReturn(saved);
        when(adHocRequests.findById(500L)).thenReturn(Optional.of(saved));
        when(clientProfiles.findByUserId(USER_A)).thenReturn(Optional.empty());
        when(mealFeedbackService.likedRecipeIds(USER_A)).thenReturn(Set.of());
        when(mealFeedbackService.dislikedRecipeIds(USER_A)).thenReturn(Set.of());
        Recipe chosen = recipeWithId(9L);
        when(recipeCatalogService.eligibleFor(any(), anySet(), anySet())).thenReturn(List.of(chosen));
        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.system(anyString())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.options(any(org.springframework.ai.chat.prompt.ChatOptions.class))).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(callResponseSpec);
        // IA indisponivel -- esgota MAX_ATTEMPTS e cai no fallback (primeira elegivel).
        when(callResponseSpec.content()).thenThrow(new RuntimeException("IA indisponivel"));
        when(recipeImageService.ensureGenerated(9L)).thenReturn(chosen);

        service.requestGeneration(new AdHocRecipeCreateRequest(MealSlot.JANTAR, null, "sem picante"), actor);

        assertThat(saved.status()).isEqualTo(MealGenerationStatus.READY);
        assertThat(saved.recipeSnapshot().get("recipeId").asLong()).isEqualTo(9L);
    }

    @Test
    void requestGeneration_noEligibleRecipes_marksFailed() {
        CurrentUser actor = clientUser(USER_A);
        when(adHocRequests.countByUserIdAndCreatedAtGreaterThanEqual(org.mockito.ArgumentMatchers.eq(USER_A), any()))
            .thenReturn(0L);
        AdHocRecipeRequest saved = adHocRecipeRequest(USER_A, 500L);
        when(adHocRequests.save(any())).thenReturn(saved);
        when(adHocRequests.findById(500L)).thenReturn(Optional.of(saved));
        when(clientProfiles.findByUserId(USER_A)).thenReturn(Optional.empty());
        when(mealFeedbackService.likedRecipeIds(USER_A)).thenReturn(Set.of());
        when(mealFeedbackService.dislikedRecipeIds(USER_A)).thenReturn(Set.of());
        when(recipeCatalogService.eligibleFor(any(), anySet(), anySet())).thenReturn(List.of());

        service.requestGeneration(new AdHocRecipeCreateRequest(MealSlot.PEQUENO_ALMOCO, null, null), actor);

        assertThat(saved.status()).isEqualTo(MealGenerationStatus.FAILED);
        assertThat(saved.recipeSnapshot()).isNull();
    }

    // ---- polling / ownership --------------------------------------------------

    @Test
    void pollStatus_unknownOrOtherUser_throwsNotFound() {
        CurrentUser actorB = clientUser(USER_B);
        when(adHocRequests.findByIdAndUserId(500L, USER_B)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.pollStatus(500L, actorB))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    @Test
    void pollStatus_ownRequest_returnsHandle() {
        CurrentUser actor = clientUser(USER_A);
        AdHocRecipeRequest request = adHocRecipeRequest(USER_A, 500L);
        when(adHocRequests.findByIdAndUserId(500L, USER_A)).thenReturn(Optional.of(request));

        AdHocRecipeHandle handle = service.pollStatus(500L, actor);

        assertThat(handle.id()).isEqualTo(500L);
        assertThat(handle.status()).isEqualTo(MealGenerationStatus.GENERATING);
    }

    // ---- replaceEntry ("guardar num dia") --------------------------------------

    @Test
    void replaceEntry_entryBelongsToAnotherUser_throwsNotFound_notForbidden() {
        CurrentUser actorB = clientUser(USER_B);
        MealPlanEntry entryOfUserA = mealPlanEntry(USER_A, 1000L);
        when(mealPlanEntries.findByIdWithOwnership(1000L)).thenReturn(Optional.of(entryOfUserA));

        assertThatThrownBy(() -> service.replaceEntry(1000L, 9L, actorB))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);

        verifyNoInteractions(recipeService);
    }

    @Test
    void replaceEntry_recipeNotPublished_throwsNotFound() {
        CurrentUser actor = clientUser(USER_A);
        MealPlanEntry entry = mealPlanEntry(USER_A, 1000L);
        when(mealPlanEntries.findByIdWithOwnership(1000L)).thenReturn(Optional.of(entry));
        Recipe draft = recipeWithId(9L); // nao publicada (RecipeStatus.DRAFT por omissao)
        when(recipeService.get(9L)).thenReturn(draft);

        assertThatThrownBy(() -> service.replaceEntry(1000L, 9L, actor))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);

        assertThat(entry.recipeId()).isEqualTo(1L); // entrada nao foi tocada
    }

    @Test
    void replaceEntry_publishedRecipe_appliesAndResetsFeedback() {
        CurrentUser actor = clientUser(USER_A);
        MealPlanEntry entry = mealPlanEntry(USER_A, 1000L);
        ReflectionTestUtils.setField(entry, "feedback", EntryFeedback.LIKE);
        when(mealPlanEntries.findByIdWithOwnership(1000L)).thenReturn(Optional.of(entry));
        Recipe published = recipeWithId(9L);
        published.publish();
        when(recipeService.get(9L)).thenReturn(published);

        MealPlanEntryResponse response = service.replaceEntry(1000L, 9L, actor);

        assertThat(response.recipe().get("recipeId").asLong()).isEqualTo(9L);
        assertThat(entry.recipeId()).isEqualTo(9L);
        assertThat(entry.feedback()).isEqualTo(EntryFeedback.NONE);
    }

    // ---- fixtures -----------------------------------------------------------

    private CurrentUser clientUser(Long id) {
        return new CurrentUser(id, UUID.randomUUID(), "cliente" + id + "@example.com", Role.CLIENTE, null);
    }

    private AdHocRecipeRequest adHocRecipeRequest(Long userId, Long id) {
        AdHocRecipeRequest request = new AdHocRecipeRequest(userId, MealSlot.ALMOCO, null, null);
        ReflectionTestUtils.setField(request, "id", id);
        return request;
    }

    private MealPlanEntry mealPlanEntry(Long planOwnerId, Long entryId) {
        MealPlan plan = new MealPlan(planOwnerId, LocalDate.of(2026, 8, 1), objectMapper.createObjectNode());
        MealPlanDay day = new MealPlanDay(plan, LocalDate.of(2026, 8, 1), "Sabado",
            BigDecimal.valueOf(1800), BigDecimal.valueOf(1800), 25, 55, 15, 5);
        ObjectNode snapshot = objectMapper.createObjectNode();
        snapshot.put("recipeId", 1);
        snapshot.put("name", "Receita actual");
        MealPlanEntry entry = new MealPlanEntry(day, MealSlot.ALMOCO, 1L, snapshot);
        ReflectionTestUtils.setField(entry, "id", entryId);
        return entry;
    }

    private Recipe recipeWithId(long id) {
        Recipe recipe = new Recipe("Receita " + id, "descricao", "almoco", null, 15, 2, null, List.of());
        ReflectionTestUtils.setField(recipe, "id", id);
        recipe.applyOverrideMacros(BigDecimal.valueOf(500), 25, 55, 15, 5);
        return recipe;
    }
}
