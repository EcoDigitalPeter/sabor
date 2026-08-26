package com.ottimizo.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class SecurityConfigTest {

    private final SecurityConfig securityConfig = new SecurityConfig();

    @Test
    void appMetadataRoleTakesPrecedenceOverSupabaseReservedRole() {
        var converter = securityConfig.jwtAuthenticationConverter();
        var jwt = Jwt.withTokenValue("token")
            .header("alg", "none")
            .claim("role", "authenticated")
            .claim("app_metadata", Map.of("role", "ADMIN"))
            .build();

        var authentication = converter.convert(jwt);

        assertThat(authentication.getAuthorities())
            .extracting("authority")
            .containsExactly("ROLE_ADMIN");
    }

    @Test
    void rootRoleStillWorksWhenAppMetadataRoleIsMissing() {
        var converter = securityConfig.jwtAuthenticationConverter();
        var jwt = Jwt.withTokenValue("token")
            .header("alg", "none")
            .claim("role", "CLIENTE")
            .build();

        var authentication = converter.convert(jwt);

        assertThat(authentication.getAuthorities())
            .extracting("authority")
            .containsExactly("ROLE_CLIENTE");
    }

    @Test
    void supabaseAuthenticatedRoleFallsBackToClienteWhenAppMetadataRoleIsMissing() {
        var converter = securityConfig.jwtAuthenticationConverter();
        var jwt = Jwt.withTokenValue("token")
            .header("alg", "none")
            .claim("role", "authenticated")
            .build();

        var authentication = converter.convert(jwt);

        assertThat(authentication.getAuthorities())
            .extracting("authority")
            .containsExactly("ROLE_CLIENTE");
    }
}
