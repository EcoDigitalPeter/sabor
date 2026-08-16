package com.ottimizo.common.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
import com.ottimizo.common.web.CorrelationIdFilter;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditLogRepository auditLogs;

    private AuditService service;

    @BeforeEach
    void setUp() {
        service = new AuditService(auditLogs, new ObjectMapper());
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    void record_savesLogWithActorActionEntityAndDetail() {
        Map<String, Object> detail = Map.of("campo", "valor");

        service.record(7L, "PERFIL_ACTUALIZADO", "client_profile", 42L, detail);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogs).save(captor.capture());
        AuditLog saved = captor.getValue();
        assertThat(saved.actorUserId()).isEqualTo(7L);
        assertThat(saved.action()).isEqualTo("PERFIL_ACTUALIZADO");
        assertThat(saved.entityType()).isEqualTo("client_profile");
        assertThat(saved.entityId()).isEqualTo(42L);
        assertThat(saved.detail().get("campo").asText()).isEqualTo("valor");
        assertThat(saved.createdAt()).isNotNull();
    }

    @Test
    void record_readsCorrelationIdFromMdc() {
        MDC.put(CorrelationIdFilter.MDC_KEY, "corr-123");

        service.record(7L, "ACCAO", null, null, null);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogs).save(captor.capture());
        assertThat(captor.getValue().correlationId()).isEqualTo("corr-123");
    }

    @Test
    void record_withoutDetail_storesNullDetail() {
        service.record(7L, "ACCAO", null, null, null);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogs).save(captor.capture());
        assertThat(captor.getValue().detail()).isNull();
    }

    @Test
    void record_withEmptyDetailMap_storesNullDetail() {
        service.record(7L, "ACCAO", null, null, Map.of());

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogs).save(captor.capture());
        assertThat(captor.getValue().detail()).isNull();
    }

    @Test
    void record_blankAction_throwsWithoutSaving() {
        assertThatThrownBy(() -> service.record(7L, "  ", null, null, null))
            .isInstanceOf(IllegalArgumentException.class);

        verify(auditLogs, never()).save(any());
    }

    @Test
    void record_nullAction_throwsWithoutSaving() {
        assertThatThrownBy(() -> service.record(7L, null, null, null, null))
            .isInstanceOf(IllegalArgumentException.class);

        verify(auditLogs, never()).save(any());
    }

    @Test
    void record_withCurrentUser_usesActorId() {
        CurrentUser actor = new CurrentUser(3L, UUID.randomUUID(), "user@example.com", Role.ADMIN, null);

        service.record(actor, "ACCAO", "ingredient", 9L);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogs).save(captor.capture());
        assertThat(captor.getValue().actorUserId()).isEqualTo(3L);
        assertThat(captor.getValue().entityType()).isEqualTo("ingredient");
        assertThat(captor.getValue().entityId()).isEqualTo(9L);
    }

    @Test
    void record_withNullCurrentUser_savesWithNullActor() {
        service.record((CurrentUser) null, "ACCAO_SISTEMA");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogs).save(captor.capture());
        assertThat(captor.getValue().actorUserId()).isNull();
        assertThat(captor.getValue().action()).isEqualTo("ACCAO_SISTEMA");
    }
}
