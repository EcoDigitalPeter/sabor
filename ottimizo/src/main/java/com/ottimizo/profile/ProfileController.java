package com.ottimizo.profile;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.UserContextService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Perfil de saude/preferencias do cliente autenticado (F1-CLI-01). Rota
 * gated a ROLE_CLIENTE/ROLE_ADMIN em {@code SecurityConfig}
 * ({@code /api/v1/me/**}). Ownership implicito no JWT via {@link CurrentUser}
 * — nunca aceita um {@code userId} vindo do corpo do pedido.
 */
@RestController
@RequestMapping("/api/v1/me/profile")
public class ProfileController {

    private final ProfileService profileService;
    private final UserContextService userContext;

    public ProfileController(ProfileService profileService, UserContextService userContext) {
        this.profileService = profileService;
        this.userContext = userContext;
    }

    @GetMapping
    public ApiResponse<ProfileResponse> get(@AuthenticationPrincipal Jwt jwt) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(profileService.get(actor));
    }

    @PutMapping
    public ApiResponse<ProfileResponse> update(
        @Valid @RequestBody ProfileRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        return ApiResponse.success(profileService.update(request, actor));
    }
}
