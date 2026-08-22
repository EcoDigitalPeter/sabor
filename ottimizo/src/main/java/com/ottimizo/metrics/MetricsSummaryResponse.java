package com.ottimizo.metrics;

import com.ottimizo.orders.OrderStatus;
import java.time.LocalDate;
import java.util.List;

/**
 * Forma alinhada com {@code components.schemas.MetricsSummary} em
 * {@code levesabor-web/src/types/api.d.ts} (BE-E01). {@code engagement} fica
 * sempre omisso ({@code null}) nesta versao — o proprio mock que originou o
 * campo (FE-X03, "[Sugestao]") ja o documenta como "valor estatico
 * ilustrativo... sem equivalente real"; nao ha streak agregavel no schema
 * actual (streak e' calculado 100% client-side a partir do plano activo de
 * um unico utilizador). Inventar um numero aqui seria pior do que omitir.
 */
public record MetricsSummaryResponse(
    long totalUsers,
    long newUsersInPeriod,
    long mealPlansGenerated,
    Double aiSuccessRate,
    Double estimatedAiCostUsd,
    List<DailyCount> plansPerDay,
    List<RecipeFeedback> topRecipes,
    List<RecipeFeedback> bottomRecipes,
    long adHocRecipeRequestsCount,
    OrdersSummary ordersInPeriod
) {

    public record DailyCount(LocalDate date, long count) {
    }

    public record RecipeFeedback(Long recipeId, String name, long likeCount, long dislikeCount) {
    }

    public record OrdersSummary(long total, List<StatusCount> byStatus) {
    }

    public record StatusCount(OrderStatus status, long count) {
    }
}
