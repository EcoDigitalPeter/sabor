package com.ottimizo.plans;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottimizo.catalog.MealFeedbackService;
import com.ottimizo.catalog.Recipe;
import com.ottimizo.catalog.RecipeCatalogService;
import com.ottimizo.catalog.RecipeSnapshotFactory;
import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
import com.ottimizo.profile.ClientProfile;
import com.ottimizo.profile.ClientProfileRepository;
import com.ottimizo.profile.Goal;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.YearMonth;
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
 * BE-C03 — {@link AiMealPlanService}. Cobre: guardas sincronas de
 * {@code requestGeneration}/{@code createGeneration} (perfil incompleto,
 * geracao em curso, limite diario) e o processamento assincrono
 * ({@code generateAsync}): resposta valida da IA, normalizacao de um
 * {@code recipeId} alucinado (fora do catalogo elegivel), esgotamento de
 * retries, e catalogo elegivel vazio.
 *
 * <p>{@code self} (auto-referencia usada em produçao para os proxies de
 * {@code @Async}/{@code @Transactional}) e apontado para a propria instancia
 * em teste — sem container Spring nao ha proxy nenhum, por isso chamar
 * {@code self.metodo(...)} aqui e equivalente a uma chamada directa,
 * incluindo {@code generateAsync}, que corre de forma sincrona (conveniente
 * para testar sem esperar por threads).
 */
@ExtendWith(MockitoExtension.class)
class AiMealPlanServiceTest {

    @Mock
    private MealGenerationRepository mealGenerations;
    @Mock
    private MealPlanRepository mealPlans;
    @Mock
    private MealPlanDayRepository mealPlanDays;
    @Mock
    private MealPlanEntryRepository mealPlanEntries;
    @Mock
    private ClientProfileRepository clientProfiles;
    @Mock
    private RecipeCatalogService recipeCatalogService;
    @Mock
    private MealFeedbackService mealFeedbackService;
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

    private AiMealPlanService service;

    /** "Linha" da MealGeneration em teste — mesma referencia devolvida por save()/findById(), simulando uma tabela de 1 linha. */
    private final MealGeneration[] savedGeneration = new MealGeneration[1];

    private static final Long USER_ID = 42L;

    @BeforeEach
    void setUp() {
        when(chatClientBuilder.build()).thenReturn(chatClient);
        service = new AiMealPlanService(
            mealGenerations, mealPlans, mealPlanDays, mealPlanEntries,
            clientProfiles, recipeCatalogService, mealFeedbackService, recipeSnapshotFactory,
            audit, chatClientBuilder, objectMapper, null
        );
        ReflectionTestUtils.setField(service, "self", service);

        org.mockito.Mockito.lenient().when(mealGenerations.save(any())).thenAnswer(inv -> {
            MealGeneration generation = inv.getArgument(0);
            if (generation.id() == null) {
                ReflectionTestUtils.setField(generation, "id", 900L);
            }
            savedGeneration[0] = generation;
            return generation;
        });
        org.mockito.Mockito.lenient().when(mealGenerations.findById(900L)).thenAnswer(inv -> Optional.ofNullable(savedGeneration[0]));
        org.mockito.Mockito.lenient().when(mealPlans.save(any())).thenAnswer(inv -> {
            MealPlan plan = inv.getArgument(0);
            ReflectionTestUtils.setField(plan, "id", 500L);
            return plan;
        });
        org.mockito.Mockito.lenient().when(mealPlanDays.save(any())).thenAnswer(inv -> inv.getArgument(0));
        org.mockito.Mockito.lenient().when(mealPlanEntries.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    // ---- guardas sincronas (createGeneration) ------------------------------

    @Test
    void requestGeneration_semPerfil_lancaProfileIncomplete() {
        CurrentUser actor = clientUser(USER_ID);
        when(clientProfiles.findByUserId(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.requestGeneration(actor))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA010_PROFILE_INCOMPLETE);

        verify(mealGenerations, never()).save(any());
    }

    @Test
    void requestGeneration_perfilSemDisclaimerAceite_lancaProfileIncomplete() {
        CurrentUser actor = clientUser(USER_ID);
        ClientProfile profile = completeProfile(USER_ID, 3);
        ReflectionTestUtils.setField(profile, "medicalDisclaimerAccepted", false);
        when(clientProfiles.findByUserId(USER_ID)).thenReturn(Optional.of(profile));

        assertThatThrownBy(() -> service.requestGeneration(actor))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA010_PROFILE_INCOMPLETE);
    }

    @Test
    void requestGeneration_jaExisteGeracaoEmCurso_lancaGenerationInProgress() {
        CurrentUser actor = clientUser(USER_ID);
        when(clientProfiles.findByUserId(USER_ID)).thenReturn(Optional.of(completeProfile(USER_ID, 3)));
        when(mealGenerations.existsByUserIdAndKindAndStatus(USER_ID, MealGenerationKind.MONTHLY_PLAN, MealGenerationStatus.GENERATING))
            .thenReturn(true);

        assertThatThrownBy(() -> service.requestGeneration(actor))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA011_GENERATION_IN_PROGRESS);

        verify(mealGenerations, never()).save(any());
    }

    @Test
    void requestGeneration_limiteDiarioAtingido_lancaGenerationLimit() {
        CurrentUser actor = clientUser(USER_ID);
        when(clientProfiles.findByUserId(USER_ID)).thenReturn(Optional.of(completeProfile(USER_ID, 3)));
        when(mealGenerations.existsByUserIdAndKindAndStatus(USER_ID, MealGenerationKind.MONTHLY_PLAN, MealGenerationStatus.GENERATING))
            .thenReturn(false);
        when(mealGenerations.countByUserIdAndKindAndCreatedAtGreaterThanEqual(eq(USER_ID), eq(MealGenerationKind.MONTHLY_PLAN), any(OffsetDateTime.class)))
            .thenReturn(3L); // dailyLimit por omissao = 3

        assertThatThrownBy(() -> service.requestGeneration(actor))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA012_GENERATION_LIMIT);

        verify(mealGenerations, never()).save(any());
    }

    // ---- geracao assincrona -------------------------------------------------

    @Test
    void requestGeneration_catalogoVazio_marcaGeracaoComoFailed_comInsufficientCatalog() {
        CurrentUser actor = clientUser(USER_ID);
        ClientProfile profile = completeProfile(USER_ID, 2);
        when(clientProfiles.findByUserId(USER_ID)).thenReturn(Optional.of(profile));
        when(mealGenerations.existsByUserIdAndKindAndStatus(any(), any(), any())).thenReturn(false);
        when(mealGenerations.countByUserIdAndKindAndCreatedAtGreaterThanEqual(any(), any(), any())).thenReturn(0L);
        when(mealFeedbackService.likedRecipeIds(USER_ID)).thenReturn(Set.of());
        when(mealFeedbackService.dislikedRecipeIds(USER_ID)).thenReturn(Set.of());
        when(recipeCatalogService.eligibleFor(any(), any(), any())).thenReturn(List.of());

        service.requestGeneration(actor);

        verify(mealGenerations, times(2)).save(any()); // 1: GENERATING; 2: FAILED
        assertThat(lastSavedGeneration().status()).isEqualTo(MealGenerationStatus.FAILED);
        assertThat(lastSavedGeneration().errorCode()).isEqualTo(ErrorCode.LSA018_INSUFFICIENT_CATALOG.name());
        verify(mealPlans, never()).save(any());
        verify(chatClient, never()).prompt();
    }

    @Test
    void generateAsync_iaEsgotaTentativas_marcaGeracaoComoFailed_comAiUnavailable() {
        CurrentUser actor = clientUser(USER_ID);
        ClientProfile profile = completeProfile(USER_ID, 2);
        when(clientProfiles.findByUserId(USER_ID)).thenReturn(Optional.of(profile));
        when(mealGenerations.existsByUserIdAndKindAndStatus(any(), any(), any())).thenReturn(false);
        when(mealGenerations.countByUserIdAndKindAndCreatedAtGreaterThanEqual(any(), any(), any())).thenReturn(0L);
        when(mealFeedbackService.likedRecipeIds(USER_ID)).thenReturn(Set.of());
        when(mealFeedbackService.dislikedRecipeIds(USER_ID)).thenReturn(Set.of());
        when(recipeCatalogService.eligibleFor(any(), any(), any())).thenReturn(List.of(recipeWithKcal(1L, 500)));

        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.system(anyString())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.options(any(org.springframework.ai.chat.prompt.ChatOptions.class))).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content()).thenThrow(new RuntimeException("IA indisponivel"));

        service.requestGeneration(actor);

        verify(callResponseSpec, times(3)).content(); // MAX_ATTEMPTS = 3
        assertThat(lastSavedGeneration().status()).isEqualTo(MealGenerationStatus.FAILED);
        assertThat(lastSavedGeneration().errorCode()).isEqualTo(ErrorCode.LSA013_AI_UNAVAILABLE.name());
        verify(mealPlans, never()).save(any());
    }

    @Test
    void generateAsync_respostaValida_geraPlanoComEntradasParaTodosOsDiasEfeicoes() {
        CurrentUser actor = clientUser(USER_ID);
        ClientProfile profile = completeProfile(USER_ID, 2); // 2 refeicoes/dia -> PEQUENO_ALMOCO, ALMOCO
        when(clientProfiles.findByUserId(USER_ID)).thenReturn(Optional.of(profile));
        when(mealGenerations.existsByUserIdAndKindAndStatus(any(), any(), any())).thenReturn(false);
        when(mealGenerations.countByUserIdAndKindAndCreatedAtGreaterThanEqual(any(), any(), any())).thenReturn(0L);
        when(mealFeedbackService.likedRecipeIds(USER_ID)).thenReturn(Set.of());
        when(mealFeedbackService.dislikedRecipeIds(USER_ID)).thenReturn(Set.of());

        Recipe recipeA = recipeWithKcal(10L, 400);
        Recipe recipeB = recipeWithKcal(11L, 600);
        when(recipeCatalogService.eligibleFor(any(), any(), any())).thenReturn(List.of(recipeA, recipeB));
        when(mealPlans.findByUserIdAndStatus(USER_ID, MealPlanStatus.ACTIVE)).thenReturn(Optional.empty());

        // So especifica o dia 1 — os restantes dias caem no fallback deterministico
        // (rotacao pelo catalogo elegivel), o que ja e coberto pelo teste seguinte.
        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.system(anyString())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.options(any(org.springframework.ai.chat.prompt.ChatOptions.class))).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content()).thenReturn("""
            {"days":[{"day":1,"meals":[
                {"mealSlot":"PEQUENO_ALMOCO","recipeId":10},
                {"mealSlot":"ALMOCO","recipeId":11}
            ]}]}
            """);

        service.requestGeneration(actor);

        int daysInMonth = YearMonth.now().lengthOfMonth();
        verify(mealPlanDays, times(daysInMonth)).save(any());
        verify(mealPlanEntries, times(daysInMonth * 2)).save(any());
        verify(mealPlans).save(any());

        assertThat(lastSavedGeneration().status()).isEqualTo(MealGenerationStatus.READY);
        assertThat(lastSavedGeneration().mealPlanId()).isEqualTo(500L);

        verify(audit).record(eq(USER_ID), eq("meal_plan.generation.ready"), eq("MealPlan"), eq(500L), any());
    }

    @Test
    void generateAsync_recipeIdAlucinado_eDescartadoEsubstituidoPorFallbackDoCatalogo() {
        CurrentUser actor = clientUser(USER_ID);
        ClientProfile profile = completeProfile(USER_ID, 2);
        when(clientProfiles.findByUserId(USER_ID)).thenReturn(Optional.of(profile));
        when(mealGenerations.existsByUserIdAndKindAndStatus(any(), any(), any())).thenReturn(false);
        when(mealGenerations.countByUserIdAndKindAndCreatedAtGreaterThanEqual(any(), any(), any())).thenReturn(0L);
        when(mealFeedbackService.likedRecipeIds(USER_ID)).thenReturn(Set.of());
        when(mealFeedbackService.dislikedRecipeIds(USER_ID)).thenReturn(Set.of());

        Recipe onlyEligible = recipeWithKcal(77L, 500);
        when(recipeCatalogService.eligibleFor(any(), any(), any())).thenReturn(List.of(onlyEligible));
        when(mealPlans.findByUserIdAndStatus(USER_ID, MealPlanStatus.ACTIVE)).thenReturn(Optional.empty());

        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.system(anyString())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.options(any(org.springframework.ai.chat.prompt.ChatOptions.class))).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(callResponseSpec);
        // 9999 nao existe no catalogo elegivel -> tem de ser descartado e substituido
        when(callResponseSpec.content()).thenReturn("""
            {"days":[{"day":1,"meals":[
                {"mealSlot":"PEQUENO_ALMOCO","recipeId":9999},
                {"mealSlot":"ALMOCO","recipeId":77}
            ]}]}
            """);

        service.requestGeneration(actor);

        assertThat(lastSavedGeneration().status()).isEqualTo(MealGenerationStatus.READY);
        var entryCaptor = org.mockito.ArgumentCaptor.forClass(MealPlanEntry.class);
        verify(mealPlanEntries, times(YearMonth.now().lengthOfMonth() * 2)).save(entryCaptor.capture());
        assertThat(entryCaptor.getAllValues())
            .extracting(MealPlanEntry::recipeId)
            .allMatch(id -> id.equals(77L)); // unico elegivel -> tanto o valido como o fallback do alucinado apontam para ele
    }

    @Test
    void generateAsync_arquivaPlanoActivoAnterior_antesDeCriarONovo() {
        CurrentUser actor = clientUser(USER_ID);
        ClientProfile profile = completeProfile(USER_ID, 2);
        when(clientProfiles.findByUserId(USER_ID)).thenReturn(Optional.of(profile));
        when(mealGenerations.existsByUserIdAndKindAndStatus(any(), any(), any())).thenReturn(false);
        when(mealGenerations.countByUserIdAndKindAndCreatedAtGreaterThanEqual(any(), any(), any())).thenReturn(0L);
        when(mealFeedbackService.likedRecipeIds(USER_ID)).thenReturn(Set.of());
        when(mealFeedbackService.dislikedRecipeIds(USER_ID)).thenReturn(Set.of());
        when(recipeCatalogService.eligibleFor(any(), any(), any())).thenReturn(List.of(recipeWithKcal(1L, 500)));

        MealPlan oldActive = new MealPlan(USER_ID, java.time.LocalDate.now().minusMonths(1).withDayOfMonth(1), objectMapper.createObjectNode());
        when(mealPlans.findByUserIdAndStatus(USER_ID, MealPlanStatus.ACTIVE)).thenReturn(Optional.of(oldActive));

        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.system(anyString())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.options(any(org.springframework.ai.chat.prompt.ChatOptions.class))).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content()).thenReturn("{\"days\":[]}");

        service.requestGeneration(actor);

        assertThat(oldActive.status()).isEqualTo(MealPlanStatus.ARCHIVED);
    }

    // ---- fixtures -----------------------------------------------------------

    private CurrentUser clientUser(Long id) {
        return new CurrentUser(id, UUID.randomUUID(), "cliente" + id + "@example.com", Role.CLIENTE, null);
    }

    private ClientProfile completeProfile(Long userId, int mealsPerDay) {
        ClientProfile profile = new ClientProfile(userId);
        ReflectionTestUtils.setField(profile, "goal", Goal.PERDER_PESO);
        ReflectionTestUtils.setField(profile, "medicalDisclaimerAccepted", true);
        ReflectionTestUtils.setField(profile, "mealsPerDay", mealsPerDay);
        return profile;
    }

    private Recipe recipeWithKcal(long id, int kcal) {
        Recipe recipe = new Recipe("Receita " + id, "descricao", "almoco", null, 15, 2, null, List.of());
        ReflectionTestUtils.setField(recipe, "id", id);
        recipe.publish();
        recipe.applyOverrideMacros(BigDecimal.valueOf(kcal), 25, 55, 15, 5);
        return recipe;
    }

    /** Estado actual (mesma referencia) da MealGeneration criada em {@code createGeneration}. */
    private MealGeneration lastSavedGeneration() {
        return savedGeneration[0];
    }
}
