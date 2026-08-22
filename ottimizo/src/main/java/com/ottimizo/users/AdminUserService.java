package com.ottimizo.users;

import com.ottimizo.common.api.PageResponse;
import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
import com.ottimizo.profile.ClientProfileRepository;
import com.ottimizo.profile.ProfileResponse;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gestao administrativa de utilizadores (BE-B03): listagem/consulta,
 * suspensao/reactivacao e criacao de contas ADMIN/LOJISTA. Contas CLIENTE
 * continuam a nascer exclusivamente pelo bootstrap self-service em
 * {@link UserRegistrationService} — este service nunca cria CLIENTE.
 */
@Service
public class AdminUserService {

    private final AppUserRepository users;
    private final ClientProfileRepository clientProfiles;
    private final AuditService audit;
    private final SupabaseSessionRevoker sessionRevoker;

    public AdminUserService(
        AppUserRepository users,
        ClientProfileRepository clientProfiles,
        AuditService audit,
        SupabaseSessionRevoker sessionRevoker
    ) {
        this.users = users;
        this.clientProfiles = clientProfiles;
        this.audit = audit;
        this.sessionRevoker = sessionRevoker;
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminUserResponse> list(Role role, UserStatus status, Pageable pageable) {
        Page<AppUser> page = users.search(role, status, pageable);
        return PageResponse.from(page.map(AdminUserResponse::from));
    }

    @Transactional(readOnly = true)
    public AdminUserResponse get(Long id) {
        return AdminUserResponse.from(findOrThrow(id));
    }

    /**
     * {@code GET /admin/users/{id}/health-profile} — reveal explícito e
     * auditado do perfil de saúde (`FE-D02`): mesmos campos devolvidos ao
     * próprio cliente em {@code GET /me/profile}, reaproveitando
     * {@link ProfileResponse} em vez de duplicar o mapeamento. Utilizador
     * sem perfil ainda criado (nunca fez onboarding) devolve
     * {@link ProfileResponse#empty()}, tal como o próprio endpoint do
     * cliente.
     */
    @Transactional(readOnly = true)
    public ProfileResponse getHealthProfile(Long id) {
        findOrThrow(id);
        return clientProfiles.findByUserId(id).map(ProfileResponse::from).orElseGet(ProfileResponse::empty);
    }

    @Transactional
    public AdminUserResponse create(AdminCreateUserRequest request, CurrentUser actor) {
        validateRoleAndStore(request.role(), request.storeId());
        if (users.findByAuthUserId(request.authUserId()).isPresent()
            || users.findByEmailIgnoreCase(request.email()).isPresent()) {
            throw new ServiceException(ErrorCode.LSA006_DUPLICATE, "Ja existe um utilizador com este authUserId ou email.");
        }

        AppUser user = new AppUser(
            request.authUserId(),
            request.name().trim(),
            request.email().trim(),
            request.role(),
            request.storeId()
        );
        try {
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            throw new ServiceException(ErrorCode.LSA006_DUPLICATE, "Ja existe um utilizador com este authUserId ou email.");
        }
        audit.record(actor, "ADMIN_USER_CREATED", "user", user.id(), Map.of("role", request.role().name()));
        return AdminUserResponse.from(user);
    }

    /**
     * Suspende ou reactiva um utilizador. Ao suspender um ADMIN, aplica a
     * regra LSA022 (tem de sobrar pelo menos um ADMIN ACTIVE) antes de
     * gravar, e pede a revogacao da sessao Supabase correspondente — ver
     * {@link SupabaseSessionRevoker}.
     */
    @Transactional
    public AdminUserResponse setStatus(Long id, UserStatus status, CurrentUser actor) {
        AppUser user = findOrThrow(id);
        if (status == UserStatus.SUSPENDED) {
            assertNotLastActiveAdmin(user);
        }
        user.changeStatus(status);
        if (status == UserStatus.SUSPENDED) {
            sessionRevoker.revoke(user.authUserId().toString());
        }
        audit.record(actor, "ADMIN_USER_STATUS_CHANGED", "user", id, Map.of("status", status.name()));
        return AdminUserResponse.from(user);
    }

    private void validateRoleAndStore(Role role, Long storeId) {
        if (role == Role.CLIENTE) {
            throw new ServiceException(ErrorCode.LSA001_VALIDATION, "role: usa /auth/register para contas CLIENTE.");
        }
        if (role == Role.LOJISTA && storeId == null) {
            throw new ServiceException(ErrorCode.LSA001_VALIDATION, "storeId: obrigatorio para role LOJISTA.");
        }
        if (role == Role.ADMIN && storeId != null) {
            throw new ServiceException(ErrorCode.LSA001_VALIDATION, "storeId: nao aplicavel a role ADMIN.");
        }
    }

    /**
     * LSA022: nao pode ser suspenso o ultimo ADMIN com estado ACTIVE. Um
     * utilizador que ja nao e ADMIN, ou que ja nao esta ACTIVE, nunca cai
     * nesta regra (nada muda ao "re-suspender" um utilizador ja suspenso,
     * por exemplo).
     */
    private void assertNotLastActiveAdmin(AppUser user) {
        if (user.role() != Role.ADMIN || user.status() != UserStatus.ACTIVE) {
            return;
        }
        long activeAdmins = users.countByRoleAndStatus(Role.ADMIN, UserStatus.ACTIVE);
        if (activeAdmins <= 1) {
            throw new ServiceException(ErrorCode.LSA022_LAST_ADMIN);
        }
    }

    private AppUser findOrThrow(Long id) {
        return users.findById(id).orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));
    }
}
