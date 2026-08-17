package com.ottimizo.orders;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.api.PageResponse;
import com.ottimizo.common.security.UserContextService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Gestao de encomendas do lado da loja (BE-L04, F3-LOJ-03). Protegido por
 * {@code /api/v1/loja/**} -> ROLE_LOJISTA em
 * {@link com.ottimizo.common.security.SecurityConfig}, nao precisa de
 * anotacoes de autorizacao adicionais aqui. Mesmo padrao de
 * {@link com.ottimizo.loja.LojaProductController}: o storeId nunca vem do
 * pedido, {@link LojaOrderService} extrai-o sempre do {@code CurrentUser}.
 *
 * <p>Complementa {@link OrderController} ({@code /api/v1/me/orders}, lado do
 * cliente) — este controller nao expoe criacao nem cancelamento, so
 * consulta e mudanca de estado do lado da loja.
 */
@RestController
@RequestMapping("/api/v1/loja/orders")
public class LojaOrderController {

    private final LojaOrderService service;
    private final UserContextService userContext;

    public LojaOrderController(LojaOrderService service, UserContextService userContext) {
        this.service = service;
        this.userContext = userContext;
    }

    @GetMapping
    public ApiResponse<PageResponse<OrderResponse>> list(
        @RequestParam(required = false) OrderStatus status,
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.list(userContext.currentUser(jwt), status, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<OrderResponse> get(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success(service.get(userContext.currentUser(jwt), id));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<OrderResponse> updateStatus(
        @PathVariable Long id,
        @Valid @RequestBody LojaOrderStatusUpdateRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.updateStatus(userContext.currentUser(jwt), id, request));
    }
}
