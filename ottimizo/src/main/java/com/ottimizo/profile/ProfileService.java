package com.ottimizo.profile;

import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * F1-CLI-01 — perfil de saude/preferencias do cliente. Ownership e sempre
 * derivado de {@link CurrentUser#id()} (extraido do JWT ja validado); nenhum
 * metodo aqui aceita um {@code userId} vindo do pedido. Condicao de saude e
 * alergias sao dados sensiveis (docs/plano/01-functional-plan.md linha 163):
 * toda leitura e escrita fica registada em {@code audit_log} via
 * {@link AuditService}, sem duplicar os valores sensiveis no detalhe — so os
 * nomes dos campos alterados.
 */
@Service
public class ProfileService {

    /**
     * Vocabulario fechado de preferencias alimentares (mesmo das healthTags
     * de receitas) — docs/plano/01-functional-plan.md linha 182 e
     * levesabor-web/src/mocks/fixtures.ts DIETARY_PREFERENCES_VOCAB. Sem
     * check constraint em BD (V002); validado aqui.
     */
    private static final Set<String> DIETARY_PREFERENCES_VOCAB = Set.of(
        "vegetariana", "vegan", "sem_gluten", "sem_lactose", "alta_proteina", "baixo_calorico"
    );

    private final ClientProfileRepository profiles;
    private final AuditService audit;

    public ProfileService(ClientProfileRepository profiles, AuditService audit) {
        this.profiles = profiles;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public ProfileResponse get(CurrentUser actor) {
        ProfileResponse response = profiles.findByUserId(actor.id())
            .map(ProfileResponse::from)
            .orElseGet(ProfileResponse::empty);
        audit.record(actor, "profile.view", "ClientProfile", actor.id());
        return response;
    }

    @Transactional
    public ProfileResponse update(ProfileRequest request, CurrentUser actor) {
        validateDietaryPreferences(request.dietaryPreferences());
        if (Boolean.FALSE.equals(request.medicalDisclaimerAccepted())) {
            throw new ServiceException(ErrorCode.LSA001_VALIDATION,
                "E necessario aceitar o aviso medico antes de gerares um plano.");
        }

        ClientProfile profile = profiles.findByUserId(actor.id())
            .orElseGet(() -> new ClientProfile(actor.id()));

        List<String> healthConditions = request.healthConditions() == null
            ? null
            : request.healthConditions().stream().map(Enum::name).toList();

        profile.merge(
            request.goal(),
            healthConditions,
            request.healthConditionOther(),
            request.allergies(),
            request.foodExclusions(),
            request.budgetBand(),
            request.mealsPerDay(),
            request.householdSize(),
            request.dietaryPreferences(),
            request.medicalDisclaimerAccepted()
        );

        if (profile.goal() == null) {
            throw new ServiceException(ErrorCode.LSA001_VALIDATION,
                "Objectivo (goal) e obrigatorio para criar o perfil.");
        }
        if (profile.healthConditions().contains(HealthCondition.OUTRA.name())
            && (profile.healthConditionOther() == null || profile.healthConditionOther().isBlank())) {
            throw new ServiceException(ErrorCode.LSA001_VALIDATION,
                "Descreve a condicao de saude em \"Outra\".");
        }

        ClientProfile saved = profiles.save(profile);
        audit.record(actor, "profile.update", "ClientProfile", actor.id(), Map.of("fields", changedFields(request)));
        return ProfileResponse.from(saved);
    }

    private void validateDietaryPreferences(List<String> dietaryPreferences) {
        if (dietaryPreferences == null) {
            return;
        }
        for (String preference : dietaryPreferences) {
            if (!DIETARY_PREFERENCES_VOCAB.contains(preference)) {
                throw new ServiceException(ErrorCode.LSA001_VALIDATION,
                    "Preferencia alimentar fora do vocabulario permitido: " + preference + ".");
            }
        }
    }

    private List<String> changedFields(ProfileRequest request) {
        List<String> fields = new ArrayList<>();
        if (request.goal() != null) {
            fields.add("goal");
        }
        if (request.healthConditions() != null) {
            fields.add("healthConditions");
        }
        if (request.healthConditionOther() != null) {
            fields.add("healthConditionOther");
        }
        if (request.allergies() != null) {
            fields.add("allergies");
        }
        if (request.foodExclusions() != null) {
            fields.add("foodExclusions");
        }
        if (request.budgetBand() != null) {
            fields.add("budgetBand");
        }
        if (request.mealsPerDay() != null) {
            fields.add("mealsPerDay");
        }
        if (request.householdSize() != null) {
            fields.add("householdSize");
        }
        if (request.dietaryPreferences() != null) {
            fields.add("dietaryPreferences");
        }
        if (request.medicalDisclaimerAccepted() != null) {
            fields.add("medicalDisclaimerAccepted");
        }
        return fields;
    }
}
