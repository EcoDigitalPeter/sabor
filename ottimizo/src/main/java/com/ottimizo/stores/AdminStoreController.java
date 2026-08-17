package com.ottimizo.stores;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.api.PageResponse;
import com.ottimizo.common.security.UserContextService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
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
import org.springframework.web.bind.annotation.RestController;

/**
 * CRUD administrativo de lojas (BE-D02). Protegido por
 * {@code /api/v1/admin/**} -> ROLE_ADMIN em {@link com.ottimizo.common.security.SecurityConfig},
 * nao precisa de anotacoes de autorizacao adicionais aqui.
 */
@RestController
@RequestMapping("/api/v1/admin/stores")
public class AdminStoreController {

    private final AdminStoreService service;
    private final UserContextService userContext;

    public AdminStoreController(AdminStoreService service, UserContextService userContext) {
        this.service = service;
        this.userContext = userContext;
    }

    @GetMapping
    public ApiResponse<PageResponse<StoreResponse>> list(
        @RequestParam(required = false) String q,
        Pageable pageable
    ) {
        return ApiResponse.success(service.list(q, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<StoreResponse> get(@PathVariable Long id) {
        return ApiResponse.success(service.get(id));
    }

    @PostMapping
    public ApiResponse<StoreResponse> create(
        @Valid @RequestBody StoreRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.create(request, userContext.currentUser(jwt)));
    }

    @PutMapping("/{id}")
    public ApiResponse<StoreResponse> update(
        @PathVariable Long id,
        @Valid @RequestBody StoreRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.update(id, request, userContext.currentUser(jwt)));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        service.delete(id, userContext.currentUser(jwt));
        return ApiResponse.success();
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<StoreResponse> setStatus(
        @PathVariable Long id,
        @Valid @RequestBody SetStoreStatusRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.setStatus(id, request.status(), userContext.currentUser(jwt)));
    }
}
