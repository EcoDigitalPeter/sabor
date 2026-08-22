package com.ottimizo.profile;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

class ClientProfileTest {

//    @Test
//    void merge_newProfile_appliesAllProvidedFields() {
//        ClientProfile profile = new ClientProfile(7L);
//
//        profile.merge(
//            Goal.PERDER_PESO,
//            List.of("DIABETES_TIPO_2"),
//            null,
//            List.of("amendoim"),
//            List.of("fígado"),
//            BudgetBand.MEDIO,
//            4,
//            2,
//            List.of("vegetariana"),
//            "Maputo",
//        );
//
//        assertThat(profile.userId()).isEqualTo(7L);
//        assertThat(profile.goal()).isEqualTo(Goal.PERDER_PESO);
//        assertThat(profile.healthConditions()).containsExactly("DIABETES_TIPO_2");
//        assertThat(profile.allergies()).containsExactly("amendoim");
//        assertThat(profile.foodExclusions()).containsExactly("fígado");
//        assertThat(profile.budgetBand()).isEqualTo(BudgetBand.MEDIO);
//        assertThat(profile.mealsPerDay()).isEqualTo(4);
//        assertThat(profile.householdSize()).isEqualTo(2);
//        assertThat(profile.dietaryPreferences()).containsExactly("vegetariana");
//        assertThat(profile.medicalDisclaimerAccepted()).isTrue();
//    }

 //   @Test
//    void merge_withNullArguments_preservesExistingValues() {
//        ClientProfile profile = new ClientProfile(7L);
//        profile.merge(Goal.GANHAR_MASSA, List.of("NENHUMA"), null, List.of("marisco"), List.of(), BudgetBand.BAIXO, 5, 3, List.of("vegan"), true);
//
//        profile.merge(null, null, null, null, null, null, null, null, null, "Maputo","","","",true);
//
//        assertThat(profile.goal()).isEqualTo(Goal.GANHAR_MASSA);
//        assertThat(profile.healthConditions()).containsExactly("NENHUMA");
//        assertThat(profile.allergies()).containsExactly("marisco");
//        assertThat(profile.budgetBand()).isEqualTo(BudgetBand.BAIXO);
//        assertThat(profile.mealsPerDay()).isEqualTo(5);
//        assertThat(profile.householdSize()).isEqualTo(3);
//        assertThat(profile.dietaryPreferences()).containsExactly("vegan");
//        assertThat(profile.medicalDisclaimerAccepted()).isTrue();
//    }

 //   @Test
//    void merge_onlyPatchesTheSectionSent_leavesOtherSectionsUntouched() {
//        // Espelha o padrao real do frontend: /perfil grava por seccao (PUT so com os
//        // campos da seccao em edicao), nunca o perfil completo de uma vez.
//        ClientProfile profile = new ClientProfile(7L);
//        profile.merge(Goal.COMER_MELHOR, List.of("NENHUMA"), null, List.of(), List.of(), BudgetBand.MEDIO, 3, 1, List.of(), null);
//
//        profile.merge(null, null, null, List.of("lactose"), null, null, null, null, null, null);
//
//        assertThat(profile.goal()).isEqualTo(Goal.COMER_MELHOR);
//        assertThat(profile.allergies()).containsExactly("lactose");
//        assertThat(profile.householdSize()).isEqualTo(1);
//    }

 //   @Test
//    void deliveryAddressText_joinsAllPartsWithCommaAndNoTrailingSeparators() {
//        ClientProfile profile = newProfile("Maputo", "Maputo Cidade", "Polana", "Perto do mercado");
//
//        assertThat(profile.deliveryAddressText()).isEqualTo("Maputo, Maputo Cidade, Polana, Perto do mercado");
//    }

 //   @Test
//    void deliveryAddressText_skipsBlankParts_withoutDoubleSeparators() {
//        ClientProfile profile = newProfile(null, "Maputo Cidade", null, "Perto do mercado");
//
//        assertThat(profile.deliveryAddressText()).isEqualTo("Maputo Cidade, Perto do mercado");
//    }

    @Test
    void deliveryAddressText_isEmpty_whenAllPartsMissing() {
        ClientProfile profile = newProfile(null, null, null, null);

        assertThat(profile.deliveryAddressText()).isEmpty();
    }

    private ClientProfile newProfile(String province, String city, String neighborhood, String description) {
        ClientProfile profile = BeanUtils.instantiateClass(ClientProfile.class);
        ReflectionTestUtils.setField(profile, "shoppingProvince", province);
        ReflectionTestUtils.setField(profile, "shoppingCity", city);
        ReflectionTestUtils.setField(profile, "shoppingNeighborhood", neighborhood);
        ReflectionTestUtils.setField(profile, "shoppingAddressDescription", description);
        return profile;
    }
}
