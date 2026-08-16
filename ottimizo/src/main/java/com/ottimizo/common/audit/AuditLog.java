package com.ottimizo.common.audit;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(nullable = false)
    private String action;

    @Column(name = "entity_type")
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private JsonNode detail;

    @Column(name = "correlation_id")
    private String correlationId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected AuditLog() {
    }

    public AuditLog(
        Long actorUserId,
        String action,
        String entityType,
        Long entityId,
        JsonNode detail,
        String correlationId,
        OffsetDateTime createdAt
    ) {
        this.actorUserId = actorUserId;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.detail = detail;
        this.correlationId = correlationId;
        this.createdAt = createdAt;
    }

    public Long id() {
        return id;
    }

    public Long actorUserId() {
        return actorUserId;
    }

    public String action() {
        return action;
    }

    public String entityType() {
        return entityType;
    }

    public Long entityId() {
        return entityId;
    }

    public JsonNode detail() {
        return detail;
    }

    public String correlationId() {
        return correlationId;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }
}
