package com.ottimizo.catalog;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.api.PageResponse;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.UserContextService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** CRUD de receitas + publicacao (F2-ADM-05). Rota gated a ROLE_ADMIN em {@code SecurityConfig}. */
@RestController
@RequestMapping("/api/v1/admin/recipes")
public class AdminRecipeController {

    private final RecipeService recipeService;
    private final UserContextService userContext;

    public AdminRecipeController(RecipeService recipeService, UserContextService userContext) {
        this.recipeService = recipeService;
        this.userContext = userContext;
    }

    @GetMapping
    public ApiResponse<PageResponse<RecipeSummaryResponse>> list(
        @RequestParam(required = false) RecipeStatus status,
        @RequestParam(required = false) String tag,
        @RequestParam(required = false) String q,
        Pageable pageable
    ) {
        var page = recipeService.list(status, tag, q, pageable).map(RecipeSummaryResponse::from);
        return ApiResponse.success(PageResponse.from(page));
    }

    @GetMapping("/{id}")
    public ApiResponse<RecipeResponse> get(@PathVariable Long id) {
        return ApiResponse.success(RecipeResponse.from(recipeService.get(id)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RecipeResponse> create(
        @Valid @RequestBody RecipeRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(RecipeResponse.from(recipeService.create(request, actor)));
    }

    @PutMapping("/{id}")
    public ApiResponse<RecipeResponse> update(
        @PathVariable Long id,
        @Valid @RequestBody RecipeRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(RecipeResponse.from(recipeService.update(id, request, actor)));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        CurrentUser actor = userContext.currentUser(jwt);
        recipeService.delete(id, actor);
        return ApiResponse.success();
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<RecipeResponse> updateStatus(
        @PathVariable Long id,
        @Valid @RequestBody RecipeStatusUpdateRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(RecipeResponse.from(recipeService.updateStatus(id, request.status(), actor)));
    }
}
