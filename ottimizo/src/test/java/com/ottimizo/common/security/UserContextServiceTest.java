package com.ottimizo.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.users.AppUser;
import com.ottimizo.users.AppUserRepository;
import com.ottimizo.users.UserStatus;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class UserContextServiceTest {

    @Mock
    private AppUserRepository users;

    private UserContextService service;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        service = new UserContextService(users);
    }

    @Test
    void currentUser_throwsForbidden_whenUserNotFound() {
        UUID authUserId = UUID.randomUUID();
        Jwt jwt = jwtFor(authUserId);
        when(users.findByAuthUserId(authUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.currentUser(jwt))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA004_FORBIDDEN);
    }

    @Test
    void currentUser_throwsAccountSuspended_whenUserSuspended() {
        UUID authUserId = UUID.randomUUID();
        Jwt jwt = jwtFor(authUserId);
        AppUser user = new AppUser(authUserId, "Maria", "maria@example.com", Role.CLIENTE);
        ReflectionTestUtils.setField(user, "status", UserStatus.SUSPENDED);
        when(users.findByAuthUserId(authUserId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.currentUser(jwt))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA003_ACCOUNT_SUSPENDED);
    }

    @Test
    void currentUser_mapsFieldsFromActiveUser() {
        UUID authUserId = UUID.randomUUID();
        Jwt jwt = jwtFor(authUserId);
        AppUser user = new AppUser(authUserId, "Maria", "maria@example.com", Role.ADMIN);
        ReflectionTestUtils.setField(user, "id", 7L);
        ReflectionTestUtils.setField(user, "storeId", 3L);
        when(users.findByAuthUserId(authUserId)).thenReturn(Optional.of(user));

        CurrentUser result = service.currentUser(jwt);

        assertThat(result.id()).isEqualTo(7L);
        assertThat(result.authUserId()).isEqualTo(authUserId);
        assertThat(result.email()).isEqualTo("maria@example.com");
        assertThat(result.role()).isEqualTo(Role.ADMIN);
        assertThat(result.storeId()).isEqualTo(3L);
        assertThat(result.isAdmin()).isTrue();
    }

    private Jwt jwtFor(UUID authUserId) {
        return Jwt.withTokenValue("token")
            .header("alg", "none")
            .subject(authUserId.toString())
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .claim("sub", authUserId.toString())
            .build();
    }
}
