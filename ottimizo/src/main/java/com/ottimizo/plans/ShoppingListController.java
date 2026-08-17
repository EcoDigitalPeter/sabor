package com.ottimizo.plans;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.UserContextService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lista de compras do plano activo (BE-C06, F1-CLI-06/06B). Rota gated a
 * ROLE_CLIENTE/ROLE_ADMIN em {@code SecurityConfig} ({@code /api/v1/me/**}).
 * Ownership sempre derivado do JWT via {@link CurrentUser} — ver
 * {@link ShoppingListService} para o detalhe de cada verificacao.
 */
@RestController
@RequestMapping("/api/v1/me/shopping-list")
public class ShoppingListController {

    private final ShoppingListService shoppingListService;
    private final UserContextService userContext;

    public ShoppingListController(ShoppingListService shoppingListService, UserContextService userContext) {
        this.shoppingListService = shoppingListService;
        this.userContext = userContext;
    }

    @GetMapping
    public ApiResponse<ShoppingListResponse> get(@AuthenticationPrincipal Jwt jwt) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(shoppingListService.getForActivePlan(actor));
    }

    @PatchMapping("/items/{id}")
    public ApiResponse<ShoppingListItemResponse> setChecked(
        @PathVariable Long id,
        @RequestBody SetCheckedRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(shoppingListService.setChecked(id, request, actor));
    }

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ShoppingListItemResponse> addManualItem(
        @Valid @RequestBody CreateShoppingListItemRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(shoppingListService.addManualItem(request, actor));
    }
}
