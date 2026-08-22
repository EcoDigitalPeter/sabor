package com.ottimizo.profile;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Payload de {@code PUT /api/v1/me/profile}. Todos os campos sao opcionais e a
 * atualizacao tem semantica de merge parcial: um campo omitido (nulo apos
 * desserializacao) preserva o valor ja gravado, so os campos presentes no
 * corpo do pedido sao alterados — ver {@link ClientProfile#merge}. Isto
 * espelha o comportamento ja implementado no mock MSW que este endpoint
 * substitui ({@code levesabor-web/src/mocks/fixtures.ts updateProfile}), de
 * onde o frontend ja envia patches por seccao (objectivo, condicao, alergias,
 * etc.) em vez do perfil completo de cada vez.
 */
public record ProfileRequest(
    Goal goal,
    List<HealthCondition> healthConditions,
    @Size(max = 160) String healthConditionOther,
    @Size(max = 20) List<@Size(max = 60) String> allergies,
    @Size(max = 20) List<@Size(max = 60) String> foodExclusions,
    BudgetBand budgetBand,
    @Min(2) @Max(5) Integer mealsPerDay,
    @Min(1) @Max(8) Integer householdSize,
    @Size(max = 6) List<@Size(max = 40) String> dietaryPreferences,
    @Size(max = 80) String shoppingProvince,
    @Size(max = 80) String shoppingCity,
    @Size(max = 120) String shoppingNeighborhood,
    @Size(max = 180) String shoppingAddressDescription,
    Boolean medicalDisclaimerAccepted
) {
}
