package com.ottimizo.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.ottimizo.common.api.PageResponse;
import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * BE-B03. Cobre em particular a regra LSA022 (nao pode ser suspenso o
 * ultimo ADMIN ACTIVE), a listagem/paginacao com filtros opcionais, a
 * criacao de ADMIN/LOJISTA (nunca CLIENTE) e a chamada ao {@link
 * SupabaseSessionRevoker} so quando ha suspensao de facto.
 */
@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private AppUserRepository users;
    @Mock
    private com.ottimizo.profile.ClientProfileRepository clientProfiles;
    @Mock
    private AuditService audit;
    @Mock
    private SupabaseSessionRevoker sessionRevoker;

    private AdminUserService service;

    private static final CurrentUser ACTOR = new CurrentUser(1L, UUID.randomUUID(), "admin@example.com", Role.ADMIN, null);

    @BeforeEach
    void setUp() {
        service = new AdminUserService(users, clientProfiles, audit, sessionRevoker);
    }

    // --- LSA022 — ultimo admin activo -----------------------------------

    @Test
    void setStatus_throwsLastAdmin_whenSuspendingTheOnlyActiveAdmin() {
        AppUser admin = user(7L, Role.ADMIN, UserStatus.ACTIVE);
        when(users.findById(7L)).thenReturn(Optional.of(admin));
        when(users.countByRoleAndStatus(Role.ADMIN, UserStatus.ACTIVE)).thenReturn(1L);

        assertThatThrownBy(() -> service.setStatus(7L, UserStatus.SUSPENDED, ACTOR))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA022_LAST_ADMIN);

        assertThat(admin.status()).isEqualTo(UserStatus.ACTIVE);
        verifyNoInteractions(sessionRevoker);
        verify(audit, never()).record(any(CurrentUser.class), anyString(), anyString(), anyLong(), anyMap());
    }

    @Test
    void setStatus_allowsSuspendingAdmin_whenAnotherActiveAdminRemains() {
        AppUser admin = user(7L, Role.ADMIN, UserStatus.ACTIVE);
        when(users.findById(7L)).thenReturn(Optional.of(admin));
        when(users.countByRoleAndStatus(Role.ADMIN, UserStatus.ACTIVE)).thenReturn(2L);

        AdminUserResponse response = service.setStatus(7L, UserStatus.SUSPENDED, ACTOR);

        assertThat(response.status()).isEqualTo(UserStatus.SUSPENDED);
        assertThat(admin.status()).isEqualTo(UserStatus.SUSPENDED);
        verify(sessionRevoker).revoke(admin.authUserId().toString());
        verify(audit).record(eq(ACTOR), eq("ADMIN_USER_STATUS_CHANGED"), eq("user"), eq(7L), anyMap());
    }

    @Test
    void setStatus_doesNotCheckLastAdminRule_forNonAdminRoles() {
        AppUser cliente = user(8L, Role.CLIENTE, UserStatus.ACTIVE);
        when(users.findById(8L)).thenReturn(Optional.of(cliente));

        AdminUserResponse response = service.setStatus(8L, UserStatus.SUSPENDED, ACTOR);

        assertThat(response.status()).isEqualTo(UserStatus.SUSPENDED);
        verify(users, never()).countByRoleAndStatus(any(), any());
    }

    @Test
    void setStatus_doesNotCheckLastAdminRule_whenAdminAlreadySuspended() {
        AppUser admin = user(7L, Role.ADMIN, UserStatus.SUSPENDED);
        when(users.findById(7L)).thenReturn(Optional.of(admin));

        AdminUserResponse response = service.setStatus(7L, UserStatus.SUSPENDED, ACTOR);

        assertThat(response.status()).isEqualTo(UserStatus.SUSPENDED);
        verify(users, never()).countByRoleAndStatus(any(), any());
    }

    @Test
    void setStatus_doesNotRevokeSession_whenReactivating() {
        AppUser admin = user(7L, Role.ADMIN, UserStatus.SUSPENDED);
        when(users.findById(7L)).thenReturn(Optional.of(admin));

        AdminUserResponse response = service.setStatus(7L, UserStatus.ACTIVE, ACTOR);

        assertThat(response.status()).isEqualTo(UserStatus.ACTIVE);
        verifyNoInteractions(sessionRevoker);
        verify(users, never()).countByRoleAndStatus(any(), any());
    }

    @Test
    void setStatus_throwsNotFound_whenUserDoesNotExist() {
        when(users.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setStatus(99L, UserStatus.SUSPENDED, ACTOR))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    // --- criacao (ADMIN/LOJISTA) -----------------------------------------

    @Test
    void create_createsAdmin_withoutStoreId() {
        AdminCreateUserRequest request = new AdminCreateUserRequest(UUID.randomUUID(), "Novo Admin", "novo.admin@example.com", Role.ADMIN, null);
        when(users.findByAuthUserId(request.authUserId())).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase(request.email())).thenReturn(Optional.empty());
        when(users.saveAndFlush(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 20L);
            return saved;
        });

        AdminUserResponse response = service.create(request, ACTOR);

        assertThat(response.id()).isEqualTo(20L);
        assertThat(response.role()).isEqualTo(Role.ADMIN);
        assertThat(response.storeId()).isNull();
        verify(audit).record(eq(ACTOR), eq("ADMIN_USER_CREATED"), eq("user"), eq(20L), anyMap());
    }

    @Test
    void create_createsLojista_withStoreId() {
        AdminCreateUserRequest request = new AdminCreateUserRequest(UUID.randomUUID(), "Novo Lojista", "novo.lojista@example.com", Role.LOJISTA, 5L);
        when(users.findByAuthUserId(request.authUserId())).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase(request.email())).thenReturn(Optional.empty());
        when(users.saveAndFlush(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 21L);
            return saved;
        });

        AdminUserResponse response = service.create(request, ACTOR);

        assertThat(response.role()).isEqualTo(Role.LOJISTA);
        assertThat(response.storeId()).isEqualTo(5L);
    }

    @Test
    void create_rejectsCliente_mustUseSelfRegistration() {
        AdminCreateUserRequest request = new AdminCreateUserRequest(UUID.randomUUID(), "Cliente", "cliente@example.com", Role.CLIENTE, null);

        assertThatThrownBy(() -> service.create(request, ACTOR))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA001_VALIDATION);

        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void create_rejectsLojista_withoutStoreId() {
        AdminCreateUserRequest request = new AdminCreateUserRequest(UUID.randomUUID(), "Lojista", "lojista@example.com", Role.LOJISTA, null);

        assertThatThrownBy(() -> service.create(request, ACTOR))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA001_VALIDATION);
    }

    @Test
    void create_rejectsAdmin_withStoreId() {
        AdminCreateUserRequest request = new AdminCreateUserRequest(UUID.randomUUID(), "Admin", "admin2@example.com", Role.ADMIN, 5L);

        assertThatThrownBy(() -> service.create(request, ACTOR))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA001_VALIDATION);
    }

    @Test
    void create_throwsDuplicate_whenAuthUserIdAlreadyRegistered() {
        UUID authUserId = UUID.randomUUID();
        AdminCreateUserRequest request = new AdminCreateUserRequest(authUserId, "Admin", "admin2@example.com", Role.ADMIN, null);
        when(users.findByAuthUserId(authUserId)).thenReturn(Optional.of(user(3L, Role.CLIENTE, UserStatus.ACTIVE)));

        assertThatThrownBy(() -> service.create(request, ACTOR))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA006_DUPLICATE);

        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void create_translatesRaceConditionDbConstraint_toDuplicateError() {
        AdminCreateUserRequest request = new AdminCreateUserRequest(UUID.randomUUID(), "Admin", "admin2@example.com", Role.ADMIN, null);
        when(users.findByAuthUserId(request.authUserId())).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase(request.email())).thenReturn(Optional.empty());
        when(users.saveAndFlush(any(AppUser.class))).thenThrow(new DataIntegrityViolationException("ux_users_email"));

        assertThatThrownBy(() -> service.create(request, ACTOR))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA006_DUPLICATE);
    }

    // --- listagem / paginacao / filtros -----------------------------------

    @Test
    void list_delegatesToRepositorySearch_withOptionalFilters() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<AppUser> page = new PageImpl<>(java.util.List.of(user(1L, Role.ADMIN, UserStatus.ACTIVE)));
        when(users.search(Role.ADMIN, UserStatus.ACTIVE, pageable)).thenReturn(page);

        PageResponse<AdminUserResponse> result = service.list(Role.ADMIN, UserStatus.ACTIVE, pageable);

        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).role()).isEqualTo(Role.ADMIN);
        verify(users, times(1)).search(Role.ADMIN, UserStatus.ACTIVE, pageable);
    }

    @Test
    void list_withoutFilters_passesNullsThrough() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<AppUser> page = new PageImpl<>(java.util.List.of());
        when(users.search(null, null, pageable)).thenReturn(page);

        PageResponse<AdminUserResponse> result = service.list(null, null, pageable);

        assertThat(result.items()).isEmpty();
        verify(users).search(null, null, pageable);
    }

    // --- get ---------------------------------------------------------------

    @Test
    void get_throwsNotFound_whenUserDoesNotExist() {
        when(users.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(99L))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    // --- helpers -------------------------------------------------------

    private AppUser user(Long id, Role role, UserStatus status) {
        AppUser user = new AppUser(UUID.randomUUID(), "Nome " + id, "user" + id + "@example.com", role);
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.setField(user, "status", status);
        return user;
    }
}
