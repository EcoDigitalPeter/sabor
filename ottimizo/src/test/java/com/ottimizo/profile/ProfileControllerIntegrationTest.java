package com.ottimizo.profile;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottimizo.common.security.Role;
import com.ottimizo.support.AbstractIntegrationTest;
import com.ottimizo.users.AppUser;
import com.ottimizo.users.AppUserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Testa {@code GET/PUT /api/v1/me/profile} de ponta a ponta contra um
 * Postgres real (Testcontainers, {@link AbstractIntegrationTest}) — requer
 * Docker (ou compativel) a correr; sem isso o arranque do container falha
 * antes do contexto Spring subir (ver nota em AbstractIntegrationTest). Nao
 * corre no sandbox usado para desenvolver o BE-C01 por falta de Docker; os
 * casos de negocio equivalentes estao cobertos, com mocks, em
 * {@code ProfileServiceTest} e {@code ClientProfileTest}.
 */
@AutoConfigureMockMvc
class ProfileControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private AppUserRepository users;

    @Test
    void get_withoutExistingProfile_returnsDefaults_withoutPersisting() throws Exception {
        UUID authUserId = registerClient("sem.perfil@example.com");

        mockMvc.perform(get("/api/v1/me/profile").with(cliente(authUserId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.goal").doesNotExist())
            .andExpect(jsonPath("$.data.mealsPerDay").value(3))
            .andExpect(jsonPath("$.data.householdSize").value(1))
            .andExpect(jsonPath("$.data.medicalDisclaimerAccepted").value(false));
    }

    @Test
    void put_firstSave_requiresGoal_thenAllowsSectionPatchesAfterwards() throws Exception {
        UUID authUserId = registerClient("primeiro.perfil@example.com");

        // Sem "goal" e sem perfil ainda criado -> falha de validacao.
        mockMvc.perform(put("/api/v1/me/profile").with(cliente(authUserId))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"allergies\":[\"amendoim\"]}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("LSA001_VALIDATION"));

        // Cria o perfil com o objectivo.
        mockMvc.perform(put("/api/v1/me/profile").with(cliente(authUserId))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"goal\":\"PERDER_PESO\",\"healthConditions\":[\"NENHUMA\"]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.goal").value("PERDER_PESO"))
            .andExpect(jsonPath("$.data.healthConditions[0]").value("NENHUMA"));

        // Patch de outra seccao (so alergias) nao apaga o objectivo ja gravado.
        mockMvc.perform(put("/api/v1/me/profile").with(cliente(authUserId))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"allergies\":[\"amendoim\"]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.goal").value("PERDER_PESO"))
            .andExpect(jsonPath("$.data.allergies[0]").value("amendoim"));
    }

    @Test
    void put_invalidEnumValue_returnsValidationError_notInternalServerError() throws Exception {
        UUID authUserId = registerClient("enum.invalido@example.com");

        mockMvc.perform(put("/api/v1/me/profile").with(cliente(authUserId))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"goal\":\"NAO_EXISTE\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("LSA001_VALIDATION"));
    }

    @Test
    void put_healthConditionOutraWithoutFreeText_returnsValidationError() throws Exception {
        UUID authUserId = registerClient("outra.sem.texto@example.com");

        mockMvc.perform(put("/api/v1/me/profile").with(cliente(authUserId))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"goal\":\"GERIR_CONDICAO\",\"healthConditions\":[\"OUTRA\"]}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("LSA001_VALIDATION"));
    }

    @Test
    void get_withoutJwt_isRejected() throws Exception {
        mockMvc.perform(get("/api/v1/me/profile"))
            .andExpect(status().isUnauthorized());
    }

    private UUID registerClient(String email) {
        UUID authUserId = UUID.randomUUID();
        AppUser user = users.save(new AppUser(authUserId, "Cliente Teste", email, Role.CLIENTE));
        return user.authUserId();
    }

    private SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor cliente(UUID authUserId) {
        return jwt().jwt(builder -> builder
            .subject(authUserId.toString())
            .claim("role", "CLIENTE"));
    }
}
