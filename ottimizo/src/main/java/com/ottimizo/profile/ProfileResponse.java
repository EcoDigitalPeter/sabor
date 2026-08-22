package com.ottimizo.profile;

import java.util.List;

public record ProfileResponse(
    Goal goal,
    List<HealthCondition> healthConditions,
    String healthConditionOther,
    List<String> allergies,
    List<String> foodExclusions,
    BudgetBand budgetBand,
    Integer mealsPerDay,
    Integer householdSize,
    List<String> dietaryPreferences,
    String shoppingProvince,
    String shoppingCity,
    String shoppingNeighborhood,
    String shoppingAddressDescription,
    boolean medicalDisclaimerAccepted
) {

    public static ProfileResponse from(ClientProfile profile) {
        return new ProfileResponse(
            profile.goal(),
            profile.healthConditions().stream().map(HealthCondition::valueOf).toList(),
            profile.healthConditionOther(),
            profile.allergies(),
            profile.foodExclusions(),
            profile.budgetBand(),
            profile.mealsPerDay(),
            profile.householdSize(),
            profile.dietaryPreferences(),
            profile.shoppingProvince(),
            profile.shoppingCity(),
            profile.shoppingNeighborhood(),
            profile.shoppingAddressDescription(),
            profile.medicalDisclaimerAccepted()
        );
    }

    /**
     * Perfil ainda por criar (primeira visita do cliente, antes do primeiro
     * PUT) — valores por omissao alinhados com os defaults de
     * {@code client_profiles} em V002, nada e persistido so por chamar GET.
     */
    public static ProfileResponse empty() {
        return new ProfileResponse(null, List.of(), null, List.of(), List.of(), null, 3, 1, List.of(), null, null, null, null, false);
    }
}
