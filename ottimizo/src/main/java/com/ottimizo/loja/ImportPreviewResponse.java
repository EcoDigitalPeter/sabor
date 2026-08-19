package com.ottimizo.loja;

import java.util.List;

/** Resposta de {@code POST /api/v1/loja/products/import} (pre-visualizacao, nada ainda aplicado). */
public record ImportPreviewResponse(
    Long jobId,
    String filename,
    ImportJobStatus status,
    int totalRows,
    int validRows,
    int errorRows,
    List<ImportRowError> errors
) {

    public static ImportPreviewResponse from(ImportJob job, List<ImportRowError> errors) {
        return new ImportPreviewResponse(
            job.id(),
            job.filename(),
            job.status(),
            job.totalRows(),
            job.validRows(),
            job.errorRows(),
            errors
        );
    }
}
