package com.ottimizo.orders;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.api.PageResponse;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.UserContextService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
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
 * Encomendas do cliente a lojas parceiras (BE-C07, F1-CLI-07 / F3-CLI-07).
 * Rota gated a ROLE_CLIENTE/ROLE_ADMIN em {@code SecurityConfig}
 * ({@code /api/v1/me/**}). Ownership sempre derivada do JWT via
 * {@link CurrentUser} — ver {@link OrderService} para o detalhe de cada
 * verificacao.
 */
@RestController
@RequestMapping("/api/v1/me/orders")
public class OrderController {

    private final OrderService orderService;
    private final UserContextService userContext;

    public OrderController(OrderService orderService, UserContextService userContext) {
        this.orderService = orderService;
        this.userContext = userContext;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<OrderResponse> create(
        @Valid @RequestBody OrderRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(orderService.create(actor, request));
    }

    @GetMapping
    public ApiResponse<PageResponse<OrderResponse>> list(
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(orderService.list(actor, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<OrderResponse> get(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(orderService.get(actor, id));
    }

    @PatchMapping("/{id}/cancel")
    public ApiResponse<OrderResponse> cancel(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(orderService.cancel(actor, id));
    }
}
