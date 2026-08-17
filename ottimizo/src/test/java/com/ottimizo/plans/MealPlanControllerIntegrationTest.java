package com.ottimizo.plans;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottimizo.common.security.Role;
import com.ottimizo.support.AbstractIntegrationTest;
import com.ottimizo.users.AppUser;
import com.ottimizo.users.AppUserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Testa {@code GET /api/v1/me/meal-plans/active}, {@code /{id}} (geracao) e
 * {@code /entries/{id}} de ponta a ponta contra um Postgres real
 * (Testcontainers, {@link AbstractIntegrationTest}) — requer Docker, ver
 * nota em {@code ProfileControllerIntegrationTest}. O foco e' confirmar que
 * a ownership tambem se aplica na camada HTTP (404, nao 403 nem os dados de
 * outro utilizador) e que a forma JSON bate com
 * {@code levesabor-web/src/types/api.d.ts}. BE-C03 ainda nao existe nesta
 * branch, por isso os dados sao semeados directamente pelos repositorios
 * JPA (nao ha endpoint de escrita para isto ainda).
 */
@AutoConfigureMockMvc
class MealPlanControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private AppUserRepository users;
    @Autowired
    private MealPlanRepository mealPlans;
    @Autowired
    private MealPlanDayRepository mealPlanDays;
    @Autowired
    private MealPlanEntryRepository mealPlanEntries;
    @Autowired
    private MealGenerationRepository mealGenerations;

    @Test
    void getActive_returnsCompactPayload_forTheAuthenticatedUsersOwnPlan() throws Exception {
        AppUser clienteA = registerClient("com.plano@example.com");
        MealPlanEntry entry = seedActivePlanWithOneDayAndEntry(clienteA.id());

        mockMvc.perform(get("/api/v1/me/meal-plans/active").with(cliente(clienteA.authUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andExpect(jsonPath("$.data.days[0].entries[0].recipe.name").value("Papas de aveia"))
            .andExpect(jsonPath("$.data.days[0].entries[0].id").value(entry.id()));
    }

    @Test
    void getActive_withoutAnActivePlan_returnsNotFound() throws Exception {
        AppUser semPlano = registerClient("sem.plano@example.com");

        mockMvc.perform(get("/api/v1/me/meal-plans/active").with(cliente(semPlano.authUserId())))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("LSA005_NOT_FOUND"));
    }

    @Test
    void getActive_neverReturnsAnotherUsersPlan() throws Exception {
        AppUser clienteA = registerClient("dono.do.plano@example.com");
        AppUser clienteB = registerClient("outro.cliente@example.com");
        seedActivePlanWithOneDayAndEntry(clienteA.id());

        mockMvc.perform(get("/api/v1/me/meal-plans/active").with(cliente(clienteB.authUserId())))
            .andExpect(status().isNotFound());
    }

    @Test
    void getGenerationStatus_belongingToAnotherUser_isNotFound_notForbidden() throws Exception {
        AppUser clienteA = registerClient("gera.plano@example.com");
        AppUser clienteB = registerClient("nao.pode.ver@example.com");
        MealGeneration generation = new MealGeneration(clienteA.id(), MealGenerationKind.MONTHLY_PLAN);
        generation = mealGenerations.save(generation);

        mockMvc.perform(get("/api/v1/me/meal-plans/" + generation.id()).with(cliente(clienteB.authUserId())))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("LSA005_NOT_FOUND"));

        // O dono continua a conseguir ler o proprio estado de geracao.
        mockMvc.perform(get("/api/v1/me/meal-plans/" + generation.id()).with(cliente(clienteA.authUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("GENERATING"));
    }

    @Test
    void getEntry_belongingToAnotherUsersPlan_isNotFound_notForbidden() throws Exception {
        AppUser clienteA = registerClient("dono.da.entrada@example.com");
        AppUser clienteB = registerClient("intruso@example.com");
        MealPlanEntry entry = seedActivePlanWithOneDayAndEntry(clienteA.id());

        mockMvc.perform(get("/api/v1/me/meal-plans/entries/" + entry.id()).with(cliente(clienteB.authUserId())))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("LSA005_NOT_FOUND"));

        mockMvc.perform(get("/api/v1/me/meal-plans/entries/" + entry.id()).with(cliente(clienteA.authUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.recipe.name").value("Papas de aveia"));
    }

    @Test
    void get_withoutJwt_isRejected() throws Exception {
        mockMvc.perform(get("/api/v1/me/meal-plans/active"))
            .andExpect(status().isUnauthorized());
    }

    private MealPlanEntry seedActivePlanWithOneDayAndEntry(Long userId) {
        JsonNode profileSnapshot = objectMapper.createObjectNode();
        MealPlan plan = mealPlans.save(new MealPlan(userId, LocalDate.of(2026, 8, 1), profileSnapshot));

        MealPlanDay day = mealPlanDays.save(new MealPlanDay(
            plan, LocalDate.of(2026, 8, 1), "Sabado",
            BigDecimal.valueOf(1800), BigDecimal.valueOf(1800), 25, 55, 15, 5
        ));

        var recipeSnapshot = objectMapper.createObjectNode();
        recipeSnapshot.put("recipeId", 1);
        recipeSnapshot.put("name", "Papas de aveia");
        recipeSnapshot.put("kcal", 300);

        return mealPlanEntries.save(new MealPlanEntry(day, MealSlot.PEQUENO_ALMOCO, 1L, recipeSnapshot));
    }

    private AppUser registerClient(String email) {
        return users.save(new AppUser(UUID.randomUUID(), "Cliente Teste", email, Role.CLIENTE));
    }

    private SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor cliente(UUID authUserId) {
        return jwt().jwt(builder -> builder
            .subject(authUserId.toString())
            .claim("role", "CLIENTE"));
    }
}
