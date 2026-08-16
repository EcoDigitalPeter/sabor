package com.ottimizo.common.audit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.web.CorrelationIdFilter;
import java.time.OffsetDateTime;
import java.util.Map;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Regista eventos de auditoria (quem fez o quê, sobre que entidade, quando).
 * Deve ser chamado por todos os services de escrita a partir da Fase de
 * autenticacao/utilizadores (BE-B) em diante — perfil, catalogo, planos,
 * encomendas, gestao de lojas, etc.
 *
 * <p>O correlationId e lido automaticamente do MDC (ver {@link CorrelationIdFilter}),
 * o chamador nao precisa de o passar explicitamente.
 */
@Service
public class AuditService {

    private final AuditLogRepository auditLogs;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository auditLogs, ObjectMapper objectMapper) {
        this.auditLogs = auditLogs;
        this.objectMapper = objectMapper;
    }

    /**
     * Regista um evento de auditoria numa transaccao propria (REQUIRES_NEW):
     * uma falha a gravar o registo de auditoria nunca deve reverter a
     * operacao de negocio que a originou, nem uma operacao de negocio
     * revertida deve levar consigo o registo de que foi tentada.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long actorUserId, String action, String entityType, Long entityId, Map<String, Object> detail) {
        if (action == null || action.isBlank()) {
            throw new IllegalArgumentException("action e obrigatoria para um registo de auditoria.");
        }
        JsonNode detailNode = detail == null || detail.isEmpty() ? null : objectMapper.valueToTree(detail);
        String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);
        AuditLog log = new AuditLog(actorUserId, action, entityType, entityId, detailNode, correlationId, OffsetDateTime.now());
        auditLogs.save(log);
    }

    public void record(CurrentUser actor, String action, String entityType, Long entityId, Map<String, Object> detail) {
        record(actor == null ? null : actor.id(), action, entityType, entityId, detail);
    }

    public void record(CurrentUser actor, String action, String entityType, Long entityId) {
        record(actor, action, entityType, entityId, null);
    }

    public void record(CurrentUser actor, String action) {
        record(actor, action, null, null, null);
    }
}
