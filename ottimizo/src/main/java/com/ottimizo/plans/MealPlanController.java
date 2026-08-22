package com.ottimizo.plans;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.UserContextService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Plano activo e as suas entradas (BE-C04, F1-CLI-03/04) + troca de entradas
 * (BE-C05, F1-CLI-05) + geracao (BE-C03, F1-CLI-02). Rota gated a
 * ROLE_CLIENTE/ROLE_ADMIN em {@code SecurityConfig} ({@code /api/v1/me/**}).
 * Ownership sempre derivado do JWT via {@link CurrentUser} — nunca aceita um
 * {@code userId} de parametro; ver {@link MealPlanService}/
 * {@link MealPlanSwapService}/{@link AiMealPlanService} para o detalhe de
 * cada verificacao.
 *
 * <p>"Comi isto" ({@code completed}, BE-C05 tambem mas nao coberto neste
 * cartao) nao vive aqui ainda.
 */
@RestController
@RequestMapping("/api/v1/me/meal-plans")
public class MealPlanController {

    private final MealPlanService mealPlanService;
    private final MealPlanSwapService mealPlanSwapService;
    private final AiMealPlanService aiMealPlanService;
    private final AdHocRecipeService adHocRecipeService;
    private final UserContextService userContext;

    public MealPlanController(
        MealPlanService mealPlanService,
        MealPlanSwapService mealPlanSwapService,
        AiMealPlanService aiMealPlanService,
        AdHocRecipeService adHocRecipeService,
        UserContextService userContext
    ) {
        this.mealPlanService = mealPlanService;
        this.mealPlanSwapService = mealPlanSwapService;
        this.aiMealPlanService = aiMealPlanService;
        this.adHocRecipeService = adHocRecipeService;
        this.userContext = userContext;
    }

    /**
     * Pedir geracao do plano mensal (BE-C03, F1-CLI-02). Devolve de imediato
     * ({@code 202 Accepted}) com o id da geracao para polling em
     * {@code GET /me/meal-plans/{id}} — o trabalho da IA corre em segundo
     * plano, ver {@link AiMealPlanService#generateAsync}.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<MealGenerationResponse> generate(@AuthenticationPrincipal Jwt jwt) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(aiMealPlanService.requestGeneration(actor));
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

    /**
     * Propor/aplicar troca de refeicao (BE-C05, F1-CLI-05).
     * {@code confirm=false} (omisso) so' calcula e devolve a alternativa;
     * {@code confirm=true} aplica-a na entrada.
     */
    @PostMapping("/entries/{id}/swap")
    public ApiResponse<SwapResponse> swap(
        @PathVariable Long id,
        @RequestParam(defaultValue = "false") boolean confirm,
        @RequestBody(required = false) SwapRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        String reason = request == null ? null : request.reason();
        return ApiResponse.success(mealPlanSwapService.swap(id, actor, confirm, reason));
    }

    /**
     * "Guardar num dia" a receita avulsa (BE-C08): substitui a receita desta
     * entrada pela receita escolhida via {@code POST /me/recipes/adhoc}.
     */
    @PostMapping("/entries/{id}/replace")
    public ApiResponse<MealPlanEntryResponse> replace(
        @PathVariable Long id,
        @jakarta.validation.Valid @RequestBody ReplaceMealPlanEntryRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(adHocRecipeService.replaceEntry(id, request.recipeId(), actor));
    }

    /** "Comi isto" (gamificacao discreta, FE-V01) — independente do 👍/👎 de {@link #swap}. */
    @PatchMapping("/entries/{id}/completed")
    public ApiResponse<MealPlanEntryResponse> setCompleted(
        @PathVariable Long id,
        @RequestBody SetCompletedRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(mealPlanService.setCompleted(id, request.completed(), actor));
    }
}
