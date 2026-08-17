package com.ottimizo.users;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.api.PageResponse;
import com.ottimizo.common.security.Role;
import com.ottimizo.common.security.UserContextService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Gestao administrativa de utilizadores (BE-B03). Protegido por
 * {@code /api/v1/admin/**} -> ROLE_ADMIN em {@link com.ottimizo.common.security.SecurityConfig},
 * tal como {@link com.ottimizo.stores.AdminStoreController}.
 */
@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {

    private final AdminUserService service;
    private final UserContextService userContext;

    public AdminUserController(AdminUserService service, UserContextService userContext) {
        this.service = service;
        this.userContext = userContext;
    }

    @GetMapping
    public ApiResponse<PageResponse<AdminUserResponse>> list(
        @RequestParam(required = false) Role role,
        @RequestParam(required = false) UserStatus status,
        Pageable pageable
    ) {
        return ApiResponse.success(service.list(role, status, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<AdminUserResponse> get(@PathVariable Long id) {
        return ApiResponse.success(service.get(id));
    }

    @PostMapping
    public ApiResponse<AdminUserResponse> create(
        @Valid @RequestBody AdminCreateUserRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.create(request, userContext.currentUser(jwt)));
    }

    @PatchMapping("/{id}")
    public ApiResponse<AdminUserResponse> setStatus(
        @PathVariable Long id,
        @Valid @RequestBody SetUserStatusRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.setStatus(id, request.status(), userContext.currentUser(jwt)));
    }
}
