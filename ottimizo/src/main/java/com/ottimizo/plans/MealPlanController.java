package com.ottimizo.plans;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.UserContextService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Plano activo e as suas entradas (BE-C04, F1-CLI-03/04). Rota gated a
 * ROLE_CLIENTE/ROLE_ADMIN em {@code SecurityConfig} ({@code /api/v1/me/**}).
 * Ownership sempre derivado do JWT via {@link CurrentUser} — nunca aceita
 * um {@code userId} de parametro; ver {@link MealPlanService} para o
 * detalhe de cada verificacao.
 *
 * <p>Geracao ({@code POST /me/meal-plans}, BE-C03) e as mutacoes de
 * entradas ({@code swap}, {@code completed}, BE-C05) nao vivem aqui.
 */
@RestController
@RequestMapping("/api/v1/me/meal-plans")
public class MealPlanController {

    private final MealPlanService mealPlanService;
    private final UserContextService userContext;

    public MealPlanController(MealPlanService mealPlanService, UserContextService userContext) {
        this.mealPlanService = mealPlanService;
        this.userContext = userContext;
    }

    @GetMapping("/active")
    public ApiResponse<MealPlanResponse> getActive(@AuthenticationPrincipal Jwt jwt) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(mealPlanService.getActive(actor));
    }

    /**
     * Estado/resultado de uma geracao, para polling (F1-CLI-02). Caminho
     * {@code /{id}} (nao {@code /generations/{id}}) porque e' o que o
     * contrato frontend ({@code operations.getMealPlanGenerationStatus} em
     * {@code levesabor-web/src/types/api.d.ts}, e os mocks em
     * {@code src/mocks/handlers.ts}) espera — ver nota em
     * {@link MealPlanService#getGenerationStatus}.
     */
    @GetMapping("/{id}")
    public ApiResponse<MealGenerationResponse> getGenerationStatus(
        @PathVariable Long id,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(mealPlanService.getGenerationStatus(id, actor));
    }

    @GetMapping("/entries/{id}")
    public ApiResponse<MealPlanEntryResponse> getEntry(
        @PathVariable Long id,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(mealPlanService.getEntry(id, actor));
    }
}
