package com.ottimizo.profile;

/**
 * Vocabulario fechado de condicoes de saude do onboarding/perfil
 * (docs/plano/01-functional-plan.md F1-CLI-01, FE-Y02 — selecao multipla).
 * Os valores tem de ser byte-identicos aos usados no frontend
 * (levesabor-web/src/types/api.d.ts, schema HealthCondition) — criterio de
 * aceitacao explicito do projecto.
 */
public enum HealthCondition {
    NENHUMA,
    DIABETES_TIPO_2,
    HIPERTENSAO,
    DOENCA_CELIACA,
    OUTRA
}
