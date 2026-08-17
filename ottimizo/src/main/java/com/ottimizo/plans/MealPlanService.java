package com.ottimizo.plans;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * BE-C04 — leitura do plano activo e das suas entradas. Ownership e' sempre
 * derivado de {@link CurrentUser#id()} (extraido do JWT ja validado por
 * {@code UserContextService}); nenhum metodo aqui aceita um {@code userId}
 * vindo do pedido. Quando o recurso pedido ({@code {id}}) existe mas
 * pertence a outro utilizador, devolve o mesmo {@link ErrorCode#LSA005_NOT_FOUND}
 * que "nao existe" — nunca 403 — para nao revelar a um cliente que um dado
 * id pertence a outra pessoa.
 *
 * <p>Escrita (geracao assincrona via Spring AI, feedback, swap, "comi isto")
 * fica fora deste servico: pertence a BE-C03/BE-C05.
 */
@Service
public class MealPlanService {

    private final MealPlanRepository mealPlans;
    private final MealPlanDayRepository mealPlanDays;
    private final MealPlanEntryRepository mealPlanEntries;
    private final MealGenerationRepository mealGenerations;

    public MealPlanService(
        MealPlanRepository mealPlans,
        MealPlanDayRepository mealPlanDays,
        MealPlanEntryRepository mealPlanEntries,
        MealGenerationRepository mealGenerations
    ) {
        this.mealPlans = mealPlans;
        this.mealPlanDays = mealPlanDays;
        this.mealPlanEntries = mealPlanEntries;
        this.mealGenerations = mealGenerations;
    }

    /** {@code GET /me/meal-plans/active} — payload unico compacto (F1-CLI-03). */
    @Transactional(readOnly = true)
    public MealPlanResponse getActive(CurrentUser actor) {
        MealPlan plan = mealPlans.findByUserIdAndStatus(actor.id(), MealPlanStatus.ACTIVE)
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND, "Ainda nao tens um plano activo."));
        return toResponse(plan);
    }

    /**
     * {@code GET /me/meal-plans/{id}} — estado/resultado de uma geracao,
     * usado para polling (F1-CLI-02). Nota de rota: o mock/contrato
     * frontend ({@code levesabor-web/src/mocks/handlers.ts},
     * {@code src/types/api.d.ts operations.getMealPlanGenerationStatus})
     * expoe isto em {@code /me/meal-plans/{id}} (id = id da geracao), nao
     * em {@code /me/meal-plans/generations/{id}} como o texto do cartao
     * BE-C04 sugeria — segui o contrato real, ver nota no relatorio da
     * tarefa.
     */
    @Transactional(readOnly = true)
    public MealGenerationResponse getGenerationStatus(Long id, CurrentUser actor) {
        MealGeneration generation = mealGenerations.findById(id)
            .filter(g -> g.userId().equals(actor.id()))
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));
        return MealGenerationResponse.from(generation);
    }

    /** {@code GET /me/meal-plans/entries/{id}} — detalhe de uma entrada/receita do plano (F1-CLI-04). */
    @Transactional(readOnly = true)
    public MealPlanEntryResponse getEntry(Long id, CurrentUser actor) {
        MealPlanEntry entry = mealPlanEntries.findByIdWithOwnership(id)
            .filter(e -> e.day().mealPlan().userId().equals(actor.id()))
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));
        return MealPlanEntryResponse.from(entry);
    }

    private MealPlanResponse toResponse(MealPlan plan) {
        List<MealPlanDay> days = mealPlanDays.findByMealPlan_IdOrderByDateAsc(plan.id());
        List<Long> dayIds = days.stream().map(MealPlanDay::id).toList();
        Map<Long, List<MealPlanEntry>> entriesByDay = mealPlanEntries.findByDay_IdInOrderByIdAsc(dayIds).stream()
            .collect(Collectors.groupingBy(e -> e.day().id()));

        List<MealPlanDayResponse> dayResponses = days.stream()
            .map(day -> MealPlanDayResponse.from(day, entriesByDay.getOrDefault(day.id(), List.of())))
            .toList();

        return MealPlanResponse.from(plan, dayResponses);
    }
}
