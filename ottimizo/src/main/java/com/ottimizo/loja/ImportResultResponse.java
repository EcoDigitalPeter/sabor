package com.ottimizo.loja;

/** Resposta de {@code POST /api/v1/loja/products/import/{jobId}/confirm}. */
public record ImportResultResponse(
    Long jobId,
    ImportJobStatus status,
    int totalRows,
    int validRows,
    int errorRows,
    int createdCount,
    int updatedCount
) {

    public static ImportResultResponse from(ImportJob job) {
        return new ImportResultResponse(
            job.id(),
            job.status(),
            job.totalRows(),
            job.validRows(),
            job.errorRows(),
            job.createdCount() == null ? 0 : job.createdCount(),
            job.updatedCount() == null ? 0 : job.updatedCount()
        );
    }
}
