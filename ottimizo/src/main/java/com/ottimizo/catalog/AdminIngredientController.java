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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** CRUD de ingredientes (F2-ADM-05). Rota gated a ROLE_ADMIN em {@code SecurityConfig}. */
@RestController
@RequestMapping("/api/v1/admin/ingredients")
public class AdminIngredientController {

    private final IngredientService ingredientService;
    private final UserContextService userContext;

    public AdminIngredientController(IngredientService ingredientService, UserContextService userContext) {
        this.ingredientService = ingredientService;
        this.userContext = userContext;
    }

    @GetMapping
    public ApiResponse<PageResponse<IngredientResponse>> list(
        @RequestParam(required = false) String q,
        Pageable pageable
    ) {
        return ApiResponse.success(PageResponse.from(ingredientService.list(q, pageable).map(IngredientResponse::from)));
    }

    @GetMapping("/{id}")
    public ApiResponse<IngredientResponse> get(@PathVariable Long id) {
        return ApiResponse.success(IngredientResponse.from(ingredientService.get(id)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<IngredientResponse> create(
        @Valid @RequestBody IngredientRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(IngredientResponse.from(ingredientService.create(request, actor)));
    }

    @PutMapping("/{id}")
    public ApiResponse<IngredientResponse> update(
        @PathVariable Long id,
        @Valid @RequestBody IngredientRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(IngredientResponse.from(ingredientService.update(id, request, actor)));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        CurrentUser actor = userContext.currentUser(jwt);
        ingredientService.delete(id, actor);
        return ApiResponse.success();
    }
}
