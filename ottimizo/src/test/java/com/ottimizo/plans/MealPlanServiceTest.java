package com.ottimizo.plans;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
import java.math.BigDecimal;
import java.time.LocalDate;
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

/**
 * BE-C04 — leitura do plano activo e das suas entradas. O foco destes testes
 * e' ownership: um utilizador nunca deve conseguir ler a geracao, o plano ou
 * a entrada de outro, mesmo sabendo o id (LSA005_NOT_FOUND, nunca 403, para
 * nao revelar que o id pertence a outra pessoa).
 */
@ExtendWith(MockitoExtension.class)
class MealPlanServiceTest {

    @Mock
    private MealPlanRepository mealPlans;
    @Mock
    private MealPlanDayRepository mealPlanDays;
    @Mock
    private MealPlanEntryRepository mealPlanEntries;
    @Mock
    private MealGenerationRepository mealGenerations;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private MealPlanService service;

    private static final Long USER_A = 1L;
    private static final Long USER_B = 2L;

    @BeforeEach
    void setUp() {
        service = new MealPlanService(mealPlans, mealPlanDays, mealPlanEntries, mealGenerations);
    }

    // ---- GET /me/meal-plans/active -------------------------------------

    @Test
    void getActive_noActivePlan_throwsNotFound() {
        CurrentUser actor = clientUser(USER_A);
        when(mealPlans.findByUserIdAndStatus(USER_A, MealPlanStatus.ACTIVE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getActive(actor))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    @Test
    void getActive_alwaysResolvesByAuthenticatedUser_neverByAnArbitraryId() {
        CurrentUser actor = clientUser(USER_A);
        when(mealPlans.findByUserIdAndStatus(USER_A, MealPlanStatus.ACTIVE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getActive(actor)).isInstanceOf(ServiceException.class);

        verify(mealPlans).findByUserIdAndStatus(USER_A, MealPlanStatus.ACTIVE);
    }

    @Test
    void getActive_buildsCompactPayload_withDaysAndEntriesGroupedAndOrdered() {
        CurrentUser actor = clientUser(USER_A);
        MealPlan plan = mealPlan(USER_A, 10L, LocalDate.of(2026, 8, 1));
        when(mealPlans.findByUserIdAndStatus(USER_A, MealPlanStatus.ACTIVE)).thenReturn(Optional.of(plan));

        MealPlanDay day1 = mealPlanDay(plan, 100L, LocalDate.of(2026, 8, 1), 55, 25, 15, 5);
        MealPlanDay day2 = mealPlanDay(plan, 101L, LocalDate.of(2026, 8, 2), 50, 30, 15, 5);
        when(mealPlanDays.findByMealPlan_IdOrderByDateAsc(10L)).thenReturn(List.of(day1, day2));

        MealPlanEntry entryDay1Breakfast = mealPlanEntry(day1, 1000L, MealSlot.PEQUENO_ALMOCO, recipeSnapshot("Papas", 300));
        MealPlanEntry entryDay1Lunch = mealPlanEntry(day1, 1001L, MealSlot.ALMOCO, recipeSnapshot("Arroz e feijao", 650));
        MealPlanEntry entryDay2Breakfast = mealPlanEntry(day2, 1002L, MealSlot.PEQUENO_ALMOCO, recipeSnapshot("Fruta", 200));
        when(mealPlanEntries.findByDay_IdInOrderByIdAsc(List.of(100L, 101L)))
            .thenReturn(List.of(entryDay1Breakfast, entryDay1Lunch, entryDay2Breakfast));

        MealPlanResponse response = service.getActive(actor);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.monthStart()).isEqualTo(LocalDate.of(2026, 8, 1));
        assertThat(response.status()).isEqualTo(MealPlanStatus.ACTIVE);
        assertThat(response.days()).hasSize(2);

        assertThat(response.days().get(0).date()).isEqualTo(LocalDate.of(2026, 8, 1));
        assertThat(response.days().get(0).entries()).hasSize(2);
        assertThat(response.days().get(0).entries().get(0).mealSlot()).isEqualTo(MealSlot.PEQUENO_ALMOCO);
        assertThat(response.days().get(0).entries().get(0).recipe().get("name").asText()).isEqualTo("Papas");
        assertThat(response.days().get(0).macros().proteina()).isEqualTo(55);

        assertThat(response.days().get(1).date()).isEqualTo(LocalDate.of(2026, 8, 2));
        assertThat(response.days().get(1).entries()).hasSize(1);
        assertThat(response.days().get(1).entries().get(0).recipe().get("name").asText()).isEqualTo("Fruta");
    }

    @Test
    void getActive_dayWithoutEntries_returnsEmptyEntriesList_notNull() {
        CurrentUser actor = clientUser(USER_A);
        MealPlan plan = mealPlan(USER_A, 10L, LocalDate.of(2026, 8, 1));
        when(mealPlans.findByUserIdAndStatus(USER_A, MealPlanStatus.ACTIVE)).thenReturn(Optional.of(plan));

        MealPlanDay day1 = mealPlanDay(plan, 100L, LocalDate.of(2026, 8, 1), 55, 25, 15, 5);
        when(mealPlanDays.findByMealPlan_IdOrderByDateAsc(10L)).thenReturn(List.of(day1));
        when(mealPlanEntries.findByDay_IdInOrderByIdAsc(anyList())).thenReturn(List.of());

        MealPlanResponse response = service.getActive(actor);

        assertThat(response.days()).hasSize(1);
        assertThat(response.days().get(0).entries()).isEmpty();
    }

    // ---- GET /me/meal-plans/{id} (estado da geracao) --------------------

    @Test
    void getGenerationStatus_belongsToActor_returnsIt() {
        CurrentUser actor = clientUser(USER_A);
        MealGeneration generation = mealGeneration(USER_A, 500L, MealGenerationKind.MONTHLY_PLAN);
        generation.markReady(10L);
        when(mealGenerations.findById(500L)).thenReturn(Optional.of(generation));

        MealGenerationResponse response = service.getGenerationStatus(500L, actor);

        assertThat(response.id()).isEqualTo(500L);
        assertThat(response.status()).isEqualTo(MealGenerationStatus.READY);
        assertThat(response.mealPlanId()).isEqualTo(10L);
    }

    @Test
    void getGenerationStatus_unknownId_throwsNotFound() {
        CurrentUser actor = clientUser(USER_A);
        when(mealGenerations.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getGenerationStatus(999L, actor))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    @Test
    void getGenerationStatus_belongsToAnotherUser_throwsNotFound_notForbidden() {
        CurrentUser actorB = clientUser(USER_B);
        MealGeneration generationOfUserA = mealGeneration(USER_A, 500L, MealGenerationKind.MONTHLY_PLAN);
        when(mealGenerations.findById(500L)).thenReturn(Optional.of(generationOfUserA));

        assertThatThrownBy(() -> service.getGenerationStatus(500L, actorB))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    // ---- GET /me/meal-plans/entries/{id} --------------------------------

    @Test
    void getEntry_belongsToActor_returnsRecipeSnapshotPassthrough() {
        CurrentUser actor = clientUser(USER_A);
        MealPlan plan = mealPlan(USER_A, 10L, LocalDate.of(2026, 8, 1));
        MealPlanDay day = mealPlanDay(plan, 100L, LocalDate.of(2026, 8, 1), 55, 25, 15, 5);
        MealPlanEntry entry = mealPlanEntry(day, 1000L, MealSlot.JANTAR, recipeSnapshot("Sopa de legumes", 220));
        when(mealPlanEntries.findByIdWithOwnership(1000L)).thenReturn(Optional.of(entry));

        MealPlanEntryResponse response = service.getEntry(1000L, actor);

        assertThat(response.id()).isEqualTo(1000L);
        assertThat(response.mealSlot()).isEqualTo(MealSlot.JANTAR);
        assertThat(response.recipe().get("kcal").asInt()).isEqualTo(220);
        assertThat(response.feedback()).isEqualTo(EntryFeedback.NONE);
        assertThat(response.completed()).isFalse();
    }

    @Test
    void getEntry_unknownId_throwsNotFound() {
        CurrentUser actor = clientUser(USER_A);
        when(mealPlanEntries.findByIdWithOwnership(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getEntry(999L, actor))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    /** Caso central de BE-C04: utilizador A nao pode ler uma entrada do plano de B. */
    @Test
    void getEntry_belongsToAnotherUsersPlan_throwsNotFound_notForbidden() {
        CurrentUser actorB = clientUser(USER_B);
        MealPlan planOfUserA = mealPlan(USER_A, 10L, LocalDate.of(2026, 8, 1));
        MealPlanDay dayOfUserA = mealPlanDay(planOfUserA, 100L, LocalDate.of(2026, 8, 1), 55, 25, 15, 5);
        MealPlanEntry entryOfUserA = mealPlanEntry(dayOfUserA, 1000L, MealSlot.ALMOCO, recipeSnapshot("Peixe grelhado", 400));
        when(mealPlanEntries.findByIdWithOwnership(1000L)).thenReturn(Optional.of(entryOfUserA));

        assertThatThrownBy(() -> service.getEntry(1000L, actorB))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    // ---- fixtures ---------------------------------------------------------

    private CurrentUser clientUser(Long id) {
        return new CurrentUser(id, UUID.randomUUID(), "cliente" + id + "@example.com", Role.CLIENTE, null);
    }

    private MealPlan mealPlan(Long userId, Long id, LocalDate monthStart) {
        MealPlan plan = new MealPlan(userId, monthStart, objectMapper.createObjectNode());
        ReflectionTestUtils.setField(plan, "id", id);
        return plan;
    }

    private MealPlanDay mealPlanDay(MealPlan plan, Long id, LocalDate date, int proteinPct, int carbsPct, int fatPct, int fiberPct) {
        MealPlanDay day = new MealPlanDay(plan, date, "Sabado", BigDecimal.valueOf(1800), BigDecimal.valueOf(1800),
            proteinPct, carbsPct, fatPct, fiberPct);
        ReflectionTestUtils.setField(day, "id", id);
        return day;
    }

    private MealPlanEntry mealPlanEntry(MealPlanDay day, Long id, MealSlot mealSlot, JsonNode recipeSnapshot) {
        MealPlanEntry entry = new MealPlanEntry(day, mealSlot, 1L, recipeSnapshot);
        ReflectionTestUtils.setField(entry, "id", id);
        return entry;
    }

    private MealGeneration mealGeneration(Long userId, Long id, MealGenerationKind kind) {
        MealGeneration generation = BeanUtils.instantiateClass(MealGeneration.class);
        ReflectionTestUtils.setField(generation, "id", id);
        ReflectionTestUtils.setField(generation, "userId", userId);
        ReflectionTestUtils.setField(generation, "kind", kind);
        ReflectionTestUtils.setField(generation, "status", MealGenerationStatus.GENERATING);
        return generation;
    }

    private JsonNode recipeSnapshot(String name, int kcal) {
        var node = objectMapper.createObjectNode();
        node.put("recipeId", 1);
        node.put("name", name);
        node.put("kcal", kcal);
        return node;
    }
}
