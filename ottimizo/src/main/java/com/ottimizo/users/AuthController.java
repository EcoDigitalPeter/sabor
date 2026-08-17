package com.ottimizo.users;

import com.ottimizo.common.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Apenas o bootstrap do {@link AppUser} local a partir de um JWT Supabase ja
 * validado como OAuth2 resource server (ver {@code SecurityConfig}).
 * {@code login}/{@code refresh}/{@code logout} nao existem aqui — decisao
 * BE-B01 (2026-08-15): o frontend fala directamente com o Supabase Auth via
 * {@code supabase-js}.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserRegistrationService registrationService;

    public AuthController(UserRegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AppUserResponse>> register(
        @AuthenticationPrincipal Jwt jwt,
        @Valid @RequestBody(required = false) RegisterRequest request
    ) {
        RegistrationResult result = registrationService.registerFromJwt(jwt, request);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(ApiResponse.success(result.user()));
    }
}
