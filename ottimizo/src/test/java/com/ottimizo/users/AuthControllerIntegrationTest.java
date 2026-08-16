package com.ottimizo.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottimizo.support.AbstractIntegrationTest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Corre contra um Postgres real (Testcontainers) com as migracoes Flyway
 * reais aplicadas — ver {@link AbstractIntegrationTest}. Confirma o
 * comportamento do endpoint de ponta a ponta: criacao na primeira chamada,
 * idempotencia (sem duplicar nem falhar) na segunda chamada com o mesmo JWT,
 * e que pedidos sem JWT sao rejeitados agora que {@code /api/v1/auth/register}
 * deixou de estar em {@code permitAll()} (BE-B02 corrige o {@code
 * SecurityConfig} nesse ponto — o endpoint exige um JWT Supabase ja valido,
 * so nao exige nenhuma role especifica).
 */
@AutoConfigureMockMvc
class AuthControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private AppUserRepository users;

    @Test
    void register_createsUser_thenIsIdempotentOnSecondCall() throws Exception {
        UUID authUserId = UUID.randomUUID();
        String email = "nova.cliente." + authUserId + "@example.com";

        mockMvc.perform(post("/api/v1/auth/register")
                .with(supabaseJwt(authUserId, email))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RegisterRequest("Nova Cliente"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("success"))
            .andExpect(jsonPath("$.data.email").value(email))
            .andExpect(jsonPath("$.data.name").value("Nova Cliente"))
            .andExpect(jsonPath("$.data.role").value("CLIENTE"))
            .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        assertThat(users.findByAuthUserId(authUserId)).isPresent();
        Long createdId = users.findByAuthUserId(authUserId).orElseThrow().id();

        mockMvc.perform(post("/api/v1/auth/register")
                .with(supabaseJwt(authUserId, email))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RegisterRequest("Nova Cliente"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(equalTo(createdId.intValue())));

        assertThat(users.findByAuthUserId(authUserId)).hasValueSatisfying(
            user -> assertThat(user.id()).isEqualTo(createdId));
    }

    @Test
    void register_withoutJwt_isRejected() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void register_withoutEmailClaim_returnsValidationError() throws Exception {
        UUID authUserId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/auth/register")
                .with(jwt().jwt(builder -> builder.subject(authUserId.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("LSA001_VALIDATION"));
    }

    private SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor supabaseJwt(UUID authUserId, String email) {
        return jwt().jwt(builder -> builder
            .subject(authUserId.toString())
            .claim("email", email));
    }
}
