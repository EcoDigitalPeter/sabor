package com.ottimizo.metrics;

import com.ottimizo.metrics.MetricsSummaryResponse.DailyCount;
import com.ottimizo.metrics.MetricsSummaryResponse.OrdersSummary;
import com.ottimizo.metrics.MetricsSummaryResponse.RecipeFeedback;
import com.ottimizo.metrics.MetricsSummaryResponse.StatusCount;
import com.ottimizo.orders.OrderStatus;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * BE-E01 — {@code GET /admin/metrics/summary}. Le directamente das 6 views
 * SQL + tabelas base de V005/V001..V004 via {@link JdbcTemplate} (opcao
 * explicitamente aceite no cartao, alternativa a {@code @Immutable}/
 * {@code @Subselect}) — sao agregacoes de leitura, sem entidade JPA de
 * escrita que faca sentido mapear.
 *
 * <p><b>{@code estimatedAiCostUsd} fica sempre 0 nesta versao:</b>
 * {@code ai_generation_log} (V005) ainda nao tem nenhuma escrita — nem
 * {@code AiMealPlanService} (BE-C03) nem {@code AdHocRecipeService} (BE-C08)
 * gravam la o resultado das chamadas ao {@code ChatClient}. E' a mesma
 * lacuna que o proprio cartao BE-E01 ja assinalava como dependencia
 * ("para ai_generation_log ter dados") — instrumentar essa escrita e'
 * trabalho dos cartoes de origem (BE-C03/BE-C08), fora do ambito deste
 * cartao (leitura de metricas). A query fica pronta para o dia em que essa
 * escrita existir.
 */
@Service
public class AdminMetricsService {

    private static final List<Integer> ALLOWED_PERIODS = List.of(7, 30, 90);
    private static final int DEFAULT_PERIOD_DAYS = 30;
    private static final int TOP_RECIPES_LIMIT = 5;

    private final JdbcTemplate jdbc;

    public AdminMetricsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public MetricsSummaryResponse summary(Integer periodDays) {
        int days = periodDays != null && ALLOWED_PERIODS.contains(periodDays) ? periodDays : DEFAULT_PERIOD_DAYS;
        Timestamp since = Timestamp.from(OffsetDateTime.now(ZoneOffset.UTC).minusDays(days).toInstant());

        return new MetricsSummaryResponse(
            totalClientUsers(),
            newClientUsersSince(since),
            mealPlansGeneratedSince(since),
            aiSuccessRateSince(since),
            estimatedAiCostUsdSince(since),
            plansPerDay(days),
            topRecipes(),
            bottomRecipes(),
            adHocRequestsSince(since),
            ordersSince(since)
        );
    }

    private long totalClientUsers() {
        Long count = jdbc.queryForObject("select count(*) from users where role = 'CLIENTE'", Long.class);
        return count == null ? 0 : count;
    }

    private long newClientUsersSince(Timestamp since) {
        Long count = jdbc.queryForObject(
            "select count(*) from users where role = 'CLIENTE' and created_at >= ?", Long.class, since
        );
        return count == null ? 0 : count;
    }

    private long mealPlansGeneratedSince(Timestamp since) {
        Long count = jdbc.queryForObject(
            "select count(*) from meal_generations where kind = 'MONTHLY_PLAN' and status = 'READY' and created_at >= ?",
            Long.class, since
        );
        return count == null ? 0 : count;
    }

    /** Rácio READY / (READY + FAILED) das gerações de plano mensal tentadas no período; sem tentativas, devolve {@code null} (sem sinal, em vez de 0 ou 100% enganadores). */
    private Double aiSuccessRateSince(Timestamp since) {
        Long ready = jdbc.queryForObject(
            "select count(*) from meal_generations where kind = 'MONTHLY_PLAN' and status = 'READY' and created_at >= ?",
            Long.class, since
        );
        Long failed = jdbc.queryForObject(
            "select count(*) from meal_generations where kind = 'MONTHLY_PLAN' and status = 'FAILED' and created_at >= ?",
            Long.class, since
        );
        long readyCount = ready == null ? 0 : ready;
        long failedCount = failed == null ? 0 : failed;
        long attempts = readyCount + failedCount;
        return attempts == 0 ? null : (double) readyCount / attempts;
    }

    private Double estimatedAiCostUsdSince(Timestamp since) {
        Long promptTokens = jdbc.queryForObject(
            "select coalesce(sum(prompt_tokens), 0) from ai_generation_log where created_at >= ?", Long.class, since
        );
        Long completionTokens = jdbc.queryForObject(
            "select coalesce(sum(completion_tokens), 0) from ai_generation_log where created_at >= ?", Long.class, since
        );
        // Precos aproximados gpt-4o-mini (USD por 1000 tokens) — so' relevante quando ai_generation_log
        // passar a ter escrita real (ver nota de classe); com 0 linhas, isto e' sempre 0.0.
        double promptCostPer1k = 0.00015;
        double completionCostPer1k = 0.0006;
        double prompt = promptTokens == null ? 0 : promptTokens;
        double completion = completionTokens == null ? 0 : completionTokens;
        return (prompt / 1000.0) * promptCostPer1k + (completion / 1000.0) * completionCostPer1k;
    }

    /** Reaproveita a view {@code v_admin_metrics_daily} (V005, ja cobre os ultimos 90 dias), so filtrando a janela pedida. */
    private List<DailyCount> plansPerDay(int days) {
        return jdbc.query(
            "select date, meal_plans_generated from v_admin_metrics_daily "
                + "where date >= current_date - make_interval(days => ?) order by date",
            (rs, rowNum) -> new DailyCount(rs.getDate("date").toLocalDate(), rs.getLong("meal_plans_generated")),
            days
        );
    }

    private List<RecipeFeedback> topRecipes() {
        return recipesByFeedback("desc");
    }

    private List<RecipeFeedback> bottomRecipes() {
        return recipesByFeedback("asc");
    }

    /** Reaproveita a view {@code v_admin_recipe_list} (V005) — so' receitas {@code PUBLISHED}, ordenadas por gostei-menos-naogostei. */
    private List<RecipeFeedback> recipesByFeedback(String direction) {
        String sql = "select id, name, like_count, dislike_count from v_admin_recipe_list "
            + "where status = 'PUBLISHED' order by (like_count - dislike_count) " + direction + ", id asc limit ?";
        return jdbc.query(
            sql,
            (rs, rowNum) -> new RecipeFeedback(
                rs.getLong("id"), rs.getString("name"), rs.getLong("like_count"), rs.getLong("dislike_count")
            ),
            TOP_RECIPES_LIMIT
        );
    }

    private long adHocRequestsSince(Timestamp since) {
        Long count = jdbc.queryForObject(
            "select count(*) from ad_hoc_recipe_requests where created_at >= ?", Long.class, since
        );
        return count == null ? 0 : count;
    }

    private OrdersSummary ordersSince(Timestamp since) {
        List<StatusCount> byStatus = jdbc.query(
            "select status, count(*) as total from orders where created_at >= ? group by status",
            (rs, rowNum) -> new StatusCount(OrderStatus.valueOf(rs.getString("status")), rs.getLong("total")),
            since
        );
        long total = byStatus.stream().mapToLong(StatusCount::count).sum();
        return new OrdersSummary(total, byStatus);
    }
}
