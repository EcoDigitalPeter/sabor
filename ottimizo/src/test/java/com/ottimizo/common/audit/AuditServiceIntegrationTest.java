package com.ottimizo.common.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ottimizo.common.security.Role;
import com.ottimizo.support.AbstractIntegrationTest;
import com.ottimizo.users.AppUser;
import com.ottimizo.users.AppUserRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

/**
 * Corre contra um Postgres real (Testcontainers) com as migracoes Flyway
 * reais aplicadas — ver {@link AbstractIntegrationTest}. Confirma que o
 * mapeamento JPA de {@link AuditLog} bate certo com a tabela {@code
 * audit_log} criada em {@code V001__auth_users_audit.sql}, incluindo a FK
 * para {@code users} e a coluna {@code detail jsonb}, coisas que os testes
 * unitarios com repositorio mockado nao conseguem verificar.
 */
class AuditServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private AuditService auditService;

    @Autowired
    private AuditLogRepository auditLogs;

    @Autowired
    private AppUserRepository users;

    @Test
    void record_persistsAuditLogAgainstRealFlywayMigratedSchema() {
        AppUser user = users.save(new AppUser(UUID.randomUUID(), "Maria Teste", "maria.audit.test@example.com", Role.CLIENTE));

        auditService.record(user.id(), "PLANO_GERADO", "meal_plan", 55L, Map.of("motivo", "geracao_inicial"));

        List<AuditLog> logs = auditLogs.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("meal_plan", 55L);

        assertThat(logs).hasSize(1);
        AuditLog saved = logs.get(0);
        assertThat(saved.id()).isNotNull();
        assertThat(saved.actorUserId()).isEqualTo(user.id());
        assertThat(saved.action()).isEqualTo("PLANO_GERADO");
        assertThat(saved.entityType()).isEqualTo("meal_plan");
        assertThat(saved.entityId()).isEqualTo(55L);
        assertThat(saved.detail().get("motivo").asText()).isEqualTo("geracao_inicial");
        assertThat(saved.createdAt()).isNotNull();
    }

    @Test
    void record_withoutActor_persistsSystemAuditLog() {
        long before = auditLogs.count();

        auditService.record((Long) null, "TAREFA_AGENDADA_EXECUTADA", null, null, null);

        assertThat(auditLogs.count()).isEqualTo(before + 1);
    }

    @Test
    void record_withUnknownActorId_violatesForeignKey() {
        Long naoExistente = -1L;

        assertThatThrownBy(() -> auditService.record(naoExistente, "ACCAO", null, null, null))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
}
