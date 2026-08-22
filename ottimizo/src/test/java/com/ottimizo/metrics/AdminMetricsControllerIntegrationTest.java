package com.ottimizo.metrics;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ottimizo.catalog.Recipe;
import com.ottimizo.catalog.RecipeRepository;
import com.ottimizo.common.security.Role;
import com.ottimizo.orders.OrderRepository;
import com.ottimizo.plans.MealGeneration;
import com.ottimizo.plans.MealGenerationKind;
import com.ottimizo.plans.MealGenerationRepository;
import com.ottimizo.support.AbstractIntegrationTest;
import com.ottimizo.users.AppUser;
import com.ottimizo.users.AppUserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Testa {@code GET /api/v1/admin/metrics/summary} (BE-E01) de ponta a ponta
 * contra um Postgres real (Testcontainers, {@link AbstractIntegrationTest}) —
 * requer Docker, ver nota em {@code ProfileControllerIntegrationTest}. So um
 * Postgres real consegue validar {@link AdminMetricsService}: as queries
 * usam views SQL (V005) e sintaxe especifica de Postgres
 * ({@code generate_series}, {@code interval}), nao replicavel em H2.
 */
@AutoConfigureMockMvc
class AdminMetricsControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private AppUserRepository users;
    @Autowired
    private RecipeRepository recipes;
    @Autowired
    private MealGenerationRepository mealGenerations;
    @Autowired
    private OrderRepository orders;

    @Test
    void summary_countsUsersAndPlans_withinDefaultPeriod() throws Exception {
        AppUser admin = registerAdmin("admin.metricas@example.com");
        AppUser cliente1 = users.save(new AppUser(UUID.randomUUID(), "Cliente Um", "c1.metricas@example.com", Role.CLIENTE));
        users.save(new AppUser(UUID.randomUUID(), "Cliente Dois", "c2.metricas@example.com", Role.CLIENTE));

        // Sem markReady(planId): a FK real de meal_generations.meal_plan_id (V003) exigiria um
        // MealPlan existente — o teste so' precisa do status READY, por isso define-o directamente.
        MealGeneration ready = new MealGeneration(cliente1.id(), MealGenerationKind.MONTHLY_PLAN);
        ReflectionTestUtils.setField(ready, "status", com.ottimizo.plans.MealGenerationStatus.READY);
        mealGenerations.save(ready);
        MealGeneration failed = new MealGeneration(cliente1.id(), MealGenerationKind.MONTHLY_PLAN);
        failed.markFailed("LSA013_AI_UNAVAILABLE");
        mealGenerations.save(failed);

        Recipe published = new Recipe("Frango grelhado", "descricao", "almoco", null, 15, 2, null, List.of());
        published.publish();
        recipes.save(published);

        mockMvc.perform(get("/api/v1/admin/metrics/summary").with(admin(admin.authUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalUsers").value(2))
            .andExpect(jsonPath("$.data.newUsersInPeriod").value(2))
            .andExpect(jsonPath("$.data.mealPlansGenerated").value(1))
            .andExpect(jsonPath("$.data.aiSuccessRate").value(0.5))
            .andExpect(jsonPath("$.data.ordersInPeriod.total").value(0))
            .andExpect(jsonPath("$.data.topRecipes[0].name").value("Frango grelhado"));
    }

    @Test
    void summary_invalidPeriod_fallsBackToThirtyDays() throws Exception {
        AppUser admin = registerAdmin("admin.periodo@example.com");

        mockMvc.perform(get("/api/v1/admin/metrics/summary").param("period", "999").with(admin(admin.authUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.plansPerDay.length()").value(31));
    }

    @Test
    void summary_withoutJwt_isRejected() throws Exception {
        mockMvc.perform(get("/api/v1/admin/metrics/summary"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void summary_asClient_isForbidden() throws Exception {
        AppUser cliente = users.save(new AppUser(UUID.randomUUID(), "Cliente Comum", "cliente.comum@example.com", Role.CLIENTE));

        mockMvc.perform(get("/api/v1/admin/metrics/summary").with(jwt().jwt(builder -> builder
                .subject(cliente.authUserId().toString())
                .claim("role", "CLIENTE"))))
            .andExpect(status().isForbidden());
    }

    private AppUser registerAdmin(String email) {
        return users.save(new AppUser(UUID.randomUUID(), "Admin Teste", email, Role.ADMIN));
    }

    private SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor admin(UUID authUserId) {
        return jwt().jwt(builder -> builder
            .subject(authUserId.toString())
            .claim("role", "ADMIN"));
    }
}
