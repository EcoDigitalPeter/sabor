package com.ottimizo.loja;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Registo de uma importacao de catalogo via Excel (BE-L03), mapeado sobre a
 * tabela {@code import_jobs} (V004). Um job nasce em {@link ImportJobStatus#VALIDATED}
 * (criado por {@link LojaImportService#validate}, guardando as linhas validas
 * em {@code payload} e os erros por linha em {@code errors}) e so muda de
 * estado quando {@link LojaImportService#confirm} o aplica — nunca antes
 * disso, para garantir que nada e escrito em {@code products} sem confirmacao
 * explicita do lojista (F3-LOJ-02).
 *
 * <p>Tal como {@link Product}, {@code storeId} fica como coluna escalar (sem
 * relacao JPA gerida): o dominio so precisa do id da loja, nunca de carregar
 * {@code Store} completo.
 */
@Entity
@Table(name = "import_jobs")
public class ImportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false, updatable = false)
    private Long storeId;

    @Column(name = "created_by", nullable = false, updatable = false)
    private Long createdBy;

    @Column(nullable = false)
    private String filename;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ImportJobStatus status;

    @Column(name = "total_rows", nullable = false)
    private int totalRows;

    @Column(name = "valid_rows", nullable = false)
    private int validRows;

    @Column(name = "error_rows", nullable = false)
    private int errorRows;

    @Column(name = "created_count")
    private Integer createdCount;

    @Column(name = "updated_count")
    private Integer updatedCount;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private JsonNode errors;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private JsonNode payload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected ImportJob() {
    }

    public ImportJob(
        Long storeId,
        Long createdBy,
        String filename,
        int totalRows,
        int validRows,
        int errorRows,
        JsonNode errors,
        JsonNode payload
    ) {
        this.storeId = storeId;
        this.createdBy = createdBy;
        this.filename = filename;
        this.status = ImportJobStatus.VALIDATED;
        this.totalRows = totalRows;
        this.validRows = validRows;
        this.errorRows = errorRows;
        this.errors = errors;
        this.payload = payload;
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    /**
     * Aplica o resultado da confirmacao (BE-L03 {@code .../confirm}).
     * So pode ser chamado a partir de {@link ImportJobStatus#VALIDATED} — a
     * validacao dessa pre-condicao e responsabilidade do
     * {@link LojaImportService}, nao desta entidade.
     */
    public void markApplied(int createdCount, int updatedCount) {
        this.status = ImportJobStatus.APPLIED;
        this.createdCount = createdCount;
        this.updatedCount = updatedCount;
        this.updatedAt = OffsetDateTime.now();
    }

    public Long id() {
        return id;
    }

    public Long storeId() {
        return storeId;
    }

    public Long createdBy() {
        return createdBy;
    }

    public String filename() {
        return filename;
    }

    public ImportJobStatus status() {
        return status;
    }

    public int totalRows() {
        return totalRows;
    }

    public int validRows() {
        return validRows;
    }

    public int errorRows() {
        return errorRows;
    }

    public Integer createdCount() {
        return createdCount;
    }

    public Integer updatedCount() {
        return updatedCount;
    }

    public JsonNode errors() {
        return errors;
    }

    public JsonNode payload() {
        return payload;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }
}
