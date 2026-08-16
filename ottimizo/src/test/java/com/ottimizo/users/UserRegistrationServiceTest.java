package com.ottimizo.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.Role;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class UserRegistrationServiceTest {

    @Mock
    private AppUserRepository users;
    @Mock
    private AuditService auditService;

    private UserRegistrationService service;

    @BeforeEach
    void setUp() {
        service = new UserRegistrationService(users, auditService);
    }

    @Test
    void registerFromJwt_createsUser_whenNoneExistsYet() {
        UUID authUserId = UUID.randomUUID();
        Jwt jwt = jwtFor(authUserId, "maria@example.com", null);
        RegisterRequest request = new RegisterRequest("Maria Teste");
        when(users.findByAuthUserId(authUserId)).thenReturn(Optional.empty());
        when(users.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 9L);
            return saved;
        });

        RegistrationResult result = service.registerFromJwt(jwt, request);

        assertThat(result.created()).isTrue();
        assertThat(result.user().id()).isEqualTo(9L);
        assertThat(result.user().authUserId()).isEqualTo(authUserId);
        assertThat(result.user().name()).isEqualTo("Maria Teste");
        assertThat(result.user().email()).isEqualTo("maria@example.com");
        assertThat(result.user().role()).isEqualTo(Role.CLIENTE);
        verify(auditService).record(eq(9L), eq("UTILIZADOR_REGISTADO"), eq("user"), eq(9L), anyMap());
    }

    @Test
    void registerFromJwt_isIdempotent_returnsExistingUser_withoutSavingAgain() {
        UUID authUserId = UUID.randomUUID();
        Jwt jwt = jwtFor(authUserId, "maria@example.com", null);
        AppUser existing = new AppUser(authUserId, "Maria Teste", "maria@example.com", Role.CLIENTE);
        ReflectionTestUtils.setField(existing, "id", 9L);
        when(users.findByAuthUserId(authUserId)).thenReturn(Optional.of(existing));

        RegistrationResult result = service.registerFromJwt(jwt, new RegisterRequest("Maria Teste"));

        assertThat(result.created()).isFalse();
        assertThat(result.user().id()).isEqualTo(9L);
        verify(users, never()).save(any());
        verify(auditService, never()).record(anyLong(), anyString(), anyString(), anyLong(), anyMap());
    }

    @Test
    void registerFromJwt_usesJwtMetadataName_whenRequestNameMissing() {
        UUID authUserId = UUID.randomUUID();
        Jwt jwt = jwtFor(authUserId, "joao@example.com", "Joao Metadata");
        when(users.findByAuthUserId(authUserId)).thenReturn(Optional.empty());
        when(users.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 3L);
            return saved;
        });

        RegistrationResult result = service.registerFromJwt(jwt, null);

        assertThat(result.user().name()).isEqualTo("Joao Metadata");
    }

    @Test
    void registerFromJwt_fallsBackToEmailLocalPart_whenNoNameAnywhere() {
        UUID authUserId = UUID.randomUUID();
        Jwt jwt = jwtFor(authUserId, "semnome@example.com", null);
        when(users.findByAuthUserId(authUserId)).thenReturn(Optional.empty());
        when(users.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 4L);
            return saved;
        });

        RegistrationResult result = service.registerFromJwt(jwt, new RegisterRequest(""));

        assertThat(result.user().name()).isEqualTo("semnome");
    }

    @Test
    void registerFromJwt_throwsValidation_whenTokenHasNoEmail() {
        UUID authUserId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
            .header("alg", "none")
            .subject(authUserId.toString())
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .claim("sub", authUserId.toString())
            .build();
        when(users.findByAuthUserId(authUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.registerFromJwt(jwt, null))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA001_VALIDATION);
    }

    @Test
    void registerFromJwt_racingDuplicateInsert_recoversExistingUser_insteadOfFailing() {
        UUID authUserId = UUID.randomUUID();
        Jwt jwt = jwtFor(authUserId, "concorrente@example.com", null);
        AppUser createdByOtherRequest = new AppUser(authUserId, "Concorrente", "concorrente@example.com", Role.CLIENTE);
        ReflectionTestUtils.setField(createdByOtherRequest, "id", 11L);

        when(users.findByAuthUserId(authUserId))
            .thenReturn(Optional.empty())
            .thenReturn(Optional.of(createdByOtherRequest));
        when(users.save(any(AppUser.class))).thenThrow(new DataIntegrityViolationException("unique violation"));

        RegistrationResult result = service.registerFromJwt(jwt, new RegisterRequest("Concorrente"));

        assertThat(result.created()).isTrue();
        assertThat(result.user().id()).isEqualTo(11L);
    }

    private Jwt jwtFor(UUID authUserId, String email, String metadataName) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
            .header("alg", "none")
            .subject(authUserId.toString())
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .claim("sub", authUserId.toString())
            .claim("email", email);
        if (metadataName != null) {
            builder.claim("user_metadata", Map.of("name", metadataName));
        }
        return builder.build();
    }
}
