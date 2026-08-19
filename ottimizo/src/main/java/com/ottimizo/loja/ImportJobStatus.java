package com.ottimizo.loja;

/** Espelha o check constraint da coluna {@code import_jobs.status} (V004). */
public enum ImportJobStatus {
    VALIDATED,
    APPLIED,
    DISCARDED,
    FAILED
}
