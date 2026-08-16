package com.ottimizo.users;

import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.Role;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bootstrap do {@link AppUser} local a partir de um JWT Supabase ja validado
 * pelo {@code SecurityConfig} (assinatura/expiracao ja garantidas antes de
 * chegar aqui). O signup/login/refresh em si sao feitos pelo frontend via
 * {@code supabase-js} — decisao BE-B01 (2026-08-15); este service so cria o
 * registo local correspondente, uma unica vez por {@code auth_user_id}.
 */
@Service
public class UserRegistrationService {

    private final AppUserRepository users;
    private final AuditService auditService;

    public UserRegistrationService(AppUserRepository users, AuditService auditService) {
        this.users = users;
        this.auditService = auditService;
    }

    @Transactional
    public RegistrationResult registerFromJwt(Jwt jwt, RegisterRequest request) {
        UUID authUserId = authUserId(jwt);

        Optional<AppUser> existing = users.findByAuthUserId(authUserId);
        if (existing.isPresent()) {
            return new RegistrationResult(AppUserResponse.from(existing.get()), false);
        }

        String email = requireEmail(jwt);
        String name = resolveName(request, jwt, email);

        AppUser created = createOrFetch(authUserId, name, email);
        auditService.record(created.id(), "UTILIZADOR_REGISTADO", "user", created.id(), Map.of("email", email));
        return new RegistrationResult(AppUserResponse.from(created), true);
    }

    /**
     * Cria o {@link AppUser}; se, entretanto, outro pedido concorrente (ex.
     * duplo-clique, retry de rede) tiver criado o mesmo registo primeiro, a
     * unique constraint em {@code auth_user_id} falha aqui — nesse caso
     * devolve-se o registo que ja existe em vez de propagar o erro, para o
     * bootstrap se manter idempotente mesmo sob concorrencia.
     */
    private AppUser createOrFetch(UUID authUserId, String name, String email) {
        try {
            return users.save(new AppUser(authUserId, name, email, Role.CLIENTE));
        } catch (DataIntegrityViolationException ex) {
            return users.findByAuthUserId(authUserId)
                .orElseThrow(() -> new ServiceException(ErrorCode.LSA006_DUPLICATE, "Email ja associado a outra conta."));
        }
    }

    private UUID authUserId(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException ex) {
            throw new ServiceException(ErrorCode.LSA001_VALIDATION, "Token sem identificador de utilizador valido.");
        }
    }

    private String requireEmail(Jwt jwt) {
        String email = claimAsString(jwt, "email");
        if (email == null || email.isBlank()) {
            throw new ServiceException(ErrorCode.LSA001_VALIDATION, "Token sem email.");
        }
        return email;
    }

    private String resolveName(RegisterRequest request, Jwt jwt, String email) {
        if (request != null && request.name() != null && !request.name().isBlank()) {
            return request.name().trim();
        }
        String metadataName = metadataName(jwt);
        if (metadataName != null && !metadataName.isBlank()) {
            return metadataName.trim();
        }
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }

    private String metadataName(Jwt jwt) {
        Object metadata = jwt.getClaim("user_metadata");
        if (metadata instanceof Map<?, ?> map) {
            Object name = map.get("name");
            if (name == null) {
                name = map.get("full_name");
            }
            return name == null ? null : name.toString();
        }
        return null;
    }

    private String claimAsString(Jwt jwt, String name) {
        Object value = jwt.getClaim(name);
        return value == null ? null : value.toString();
    }
}
