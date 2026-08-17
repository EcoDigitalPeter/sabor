package com.ottimizo.orders;

/** Espelha o check constraint da coluna {@code orders.status} (V004). */
public enum OrderStatus {
    PENDENTE,
    ACEITE,
    EM_PREPARACAO,
    PRONTA,
    CONCLUIDA,
    RECUSADA,
    CANCELADA
}
