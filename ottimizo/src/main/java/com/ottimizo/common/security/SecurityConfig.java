package com.ottimizo.common.security;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        RestAuthenticationEntryPoint restAuthenticationEntryPoint,
        RestAccessDeniedHandler restAccessDeniedHandler
    ) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole(Role.ADMIN.name())
                .requestMatchers("/api/v1/loja/**").hasRole(Role.LOJISTA.name())
                .requestMatchers("/api/v1/me/**").hasAnyRole(Role.CLIENTE.name(), Role.ADMIN.name())
                .requestMatchers("/api/v1/stores").hasAnyRole(Role.CLIENTE.name(), Role.ADMIN.name())
                .anyRequest().authenticated()
            )
            // Envelope ApiResponse consistente em 401 (token ausente/invalido) e 403 (role sem
            // permissao) — sem isto o Spring devolve corpo vazio/plano, que quebra o cliente HTTP
            // do frontend (levesabor-web/src/lib/api.ts espera sempre {status,code,message,data}).
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(restAuthenticationEntryPoint)
                .accessDeniedHandler(restAccessDeniedHandler)
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                .authenticationEntryPoint(restAuthenticationEntryPoint)
            );
        return http.build();
    }

    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(this::authoritiesFromClaims);
        return converter;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(
        @Value("${ottimizo.cors.allowed-origins}") String allowedOrigins
    ) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(split(allowedOrigins));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "x-correlation-id"));
        config.setExposedHeaders(List.of("x-correlation-id"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private List<String> split(String value) {
        return Arrays.stream(value.split(","))
            .map(String::trim)
            .filter(item -> !item.isBlank())
            .toList();
    }

    private Collection<GrantedAuthority> authoritiesFromClaims(Jwt jwt) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        String role = claimAsString(jwt, "role");
        if (role == null) {
            role = appMetadataRole(jwt);
        }
        if (role != null && !role.isBlank()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.trim().toUpperCase()));
        }
        return authorities;
    }

    private String appMetadataRole(Jwt jwt) {
        Object metadata = jwt.getClaim("app_metadata");
        if (metadata instanceof Map<?, ?> map) {
            Object role = map.get("role");
            return role == null ? null : role.toString();
        }
        return null;
    }

    private String claimAsString(Jwt jwt, String name) {
        Object value = jwt.getClaim(name);
        return value == null ? null : value.toString();
    }
}
