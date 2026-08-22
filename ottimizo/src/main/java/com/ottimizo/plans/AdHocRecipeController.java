package com.ottimizo.plans;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.UserContextService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * "Pedir receita agora" (BE-C08, F1-CLI). Rota gated a
 * ROLE_CLIENTE/ROLE_ADMIN em {@code SecurityConfig} ({@code /api/v1/me/**}).
 */
@RestController
@RequestMapping("/api/v1/me/recipes/adhoc")
public class AdHocRecipeController {

    private final AdHocRecipeService adHocRecipeService;
    private final UserContextService userContext;

    public AdHocRecipeController(AdHocRecipeService adHocRecipeService, UserContextService userContext) {
        this.adHocRecipeService = adHocRecipeService;
        this.userContext = userContext;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<AdHocRecipeHandle> request(
        @Valid @RequestBody AdHocRecipeCreateRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(adHocRecipeService.requestGeneration(request, actor));
    }

    @GetMapping("/{id}")
    public ApiResponse<AdHocRecipeHandle> poll(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(adHocRecipeService.pollStatus(id, actor));
    }
}
