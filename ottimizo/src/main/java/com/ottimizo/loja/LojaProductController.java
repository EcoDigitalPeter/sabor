package com.ottimizo.loja;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.api.PageResponse;
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

/**
 * CRUD de produtos da loja autenticada (BE-L02). Protegido por
 * {@code /api/v1/loja/**} -> ROLE_LOJISTA em
 * {@link com.ottimizo.common.security.SecurityConfig}, nao precisa de
 * anotacoes de autorizacao adicionais aqui. O storeId nunca vem do pedido —
 * {@link LojaProductService} extrai-o sempre do {@code CurrentUser}.
 */
@RestController
@RequestMapping("/api/v1/loja/products")
public class LojaProductController {

    private final LojaProductService service;
    private final UserContextService userContext;

    public LojaProductController(LojaProductService service, UserContextService userContext) {
        this.service = service;
        this.userContext = userContext;
    }

    @GetMapping
    public ApiResponse<PageResponse<ProductResponse>> list(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) ProductStatus status,
        Pageable pageable,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.list(userContext.currentUser(jwt), q, status, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductResponse> get(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success(service.get(userContext.currentUser(jwt), id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProductResponse> create(
        @Valid @RequestBody ProductRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.create(userContext.currentUser(jwt), request));
    }

    @PutMapping("/{id}")
    public ApiResponse<ProductResponse> update(
        @PathVariable Long id,
        @Valid @RequestBody ProductRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.update(userContext.currentUser(jwt), id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        service.delete(userContext.currentUser(jwt), id);
        return ApiResponse.success();
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<ProductResponse> setStatus(
        @PathVariable Long id,
        @Valid @RequestBody SetProductStatusRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.setStatus(userContext.currentUser(jwt), id, request.status()));
    }
}
