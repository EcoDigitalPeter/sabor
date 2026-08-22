//package com.ottimizo.profile;
//
//import static org.assertj.core.api.Assertions.assertThat;
//import static org.assertj.core.api.Assertions.assertThatThrownBy;
//import static org.mockito.ArgumentMatchers.any;
//import static org.mockito.ArgumentMatchers.eq;
//import static org.mockito.Mockito.never;
//import static org.mockito.Mockito.verify;
//import static org.mockito.Mockito.when;
//
//import com.ottimizo.common.audit.AuditService;
//import com.ottimizo.common.error.ErrorCode;
//import com.ottimizo.common.error.ServiceException;
//import com.ottimizo.common.security.CurrentUser;
//import com.ottimizo.common.security.Role;
//import java.util.List;
//import java.util.Map;
//import java.util.Optional;
//import java.util.UUID;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.Test;
//import org.junit.jupiter.api.extension.ExtendWith;
//import org.mockito.ArgumentCaptor;
//import org.mockito.Mock;
//import org.mockito.junit.jupiter.MockitoExtension;
//
//@ExtendWith(MockitoExtension.class)
//class ProfileServiceTest {
//
//    @Mock
//    private ClientProfileRepository profiles;
//    @Mock
//    private AuditService audit;
//
//    private ProfileService service;
//
//    private final CurrentUser actor = new CurrentUser(9L, UUID.randomUUID(), "cliente@example.com", Role.CLIENTE, null);
//
//    @BeforeEach
//    void setUp() {
//        service = new ProfileService(profiles, audit);
//    }
//
//    @Test
//    void get_noProfileYet_returnsDefaultsWithoutPersisting_andAudits() {
//        when(profiles.findByUserId(9L)).thenReturn(Optional.empty());
//
//        ProfileResponse response = service.get(actor);
//
//        assertThat(response.goal()).isNull();
//        assertThat(response.healthConditions()).isEmpty();
//        assertThat(response.mealsPerDay()).isEqualTo(3);
//        assertThat(response.householdSize()).isEqualTo(1);
//        assertThat(response.medicalDisclaimerAccepted()).isFalse();
//        verify(profiles, never()).save(any());
//        verify(audit).record(eq(actor), eq("profile.view"), eq("ClientProfile"), eq(9L));
//    }
//
////    @Test
////    void get_existingProfile_mapsHealthConditionsAsEnums_andAudits() {
////        ClientProfile profile = new ClientProfile(9L);
////        profile.merge(Goal.PERDER_PESO, List.of("DIABETES_TIPO_2", "HIPERTENSAO"), null, List.of(), List.of(), null, 3, 1, List.of(), null);
////        when(profiles.findByUserId(9L)).thenReturn(Optional.of(profile));
////
////        ProfileResponse response = service.get(actor);
////
////        assertThat(response.healthConditions()).containsExactly(HealthCondition.DIABETES_TIPO_2, HealthCondition.HIPERTENSAO);
////        verify(audit).record(eq(actor), eq("profile.view"), eq("ClientProfile"), eq(9L));
////    }
//
//    @Test
//    void update_ownershipIsAlwaysTheAuthenticatedUser_neverAClientSuppliedId() {
//        when(profiles.findByUserId(9L)).thenReturn(Optional.empty());
//        when(profiles.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
//
//        service.update(request(Goal.COMER_MELHOR, null, null, null, null), actor);
//
//        ArgumentCaptor<ClientProfile> captor = ArgumentCaptor.forClass(ClientProfile.class);
//        verify(profiles).save(captor.capture());
//        assertThat(captor.getValue().userId()).isEqualTo(9L);
//    }
//
//    @Test
//    void update_newProfileWithoutGoal_throwsValidation_andNeverSaves() {
//        when(profiles.findByUserId(9L)).thenReturn(Optional.empty());
//
//        assertThatThrownBy(() -> service.update(request(null, null, null, null, null), actor))
//            .isInstanceOf(ServiceException.class)
//            .extracting("code")
//            .isEqualTo(ErrorCode.LSA001_VALIDATION);
//
//        verify(profiles, never()).save(any());
//    }
//
////    @Test
////    void update_partialPatch_onlyOverwritesFieldsSent_keepsRestOfExistingProfile() {
////        ClientProfile existing = new ClientProfile(9L);
////        existing.merge(Goal.GANHAR_MASSA, List.of("NENHUMA"), null, List.of("amendoim"), List.of(), BudgetBand.CONFORTAVEL, 5, 2, List.of("vegan"), true);
////        when(profiles.findByUserId(9L)).thenReturn(Optional.of(existing));
////        when(profiles.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
////
////        // Secao "alergias" isolada, como o /perfil real envia.
////        ProfileRequest patch = new ProfileRequest(null, null, null, List.of("lactose"), null, null, null, null, null, null);
////
////        ProfileResponse response = service.update(patch, actor);
////
////        assertThat(response.goal()).isEqualTo(Goal.GANHAR_MASSA);
////        assertThat(response.allergies()).containsExactly("lactose");
////        assertThat(response.budgetBand()).isEqualTo(BudgetBand.CONFORTAVEL);
////        assertThat(response.householdSize()).isEqualTo(2);
////        assertThat(response.dietaryPreferences()).containsExactly("vegan");
////    }
////
////    @Test
////    void update_healthConditionOutraWithoutFreeText_throwsValidation() {
////        when(profiles.findByUserId(9L)).thenReturn(Optional.empty());
////
////        ProfileRequest request = new ProfileRequest(
////            Goal.GERIR_CONDICAO, List.of(HealthCondition.OUTRA), "  ", null, null, null, null, null, null, null
////        );
////
////        assertThatThrownBy(() -> service.update(request, actor))
////            .isInstanceOf(ServiceException.class)
////            .hasMessageContaining("Outra")
////            .extracting("code")
////            .isEqualTo(ErrorCode.LSA001_VALIDATION);
////
////        verify(profiles, never()).save(any());
////    }
//
////    @Test
////    void update_healthConditionOutraWithFreeText_succeeds() {
////        when(profiles.findByUserId(9L)).thenReturn(Optional.empty());
////        when(profiles.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
////
////        ProfileRequest request = new ProfileRequest(
////            Goal.GERIR_CONDICAO, List.of(HealthCondition.OUTRA), "Gota", null, null, null, null, null, null, null
////        );
//
//        ProfileResponse response = service.update(request, actor);
//
//        assertThat(response.healthConditions()).containsExactly(HealthCondition.OUTRA);
//        assertThat(response.healthConditionOther()).isEqualTo("Gota");
//    }
//
//    @Test
//    void update_dietaryPreferenceOutsideClosedVocabulary_throwsValidation() {
//        assertThatThrownBy(() -> service.update(
//            request(Goal.COMER_MELHOR, null, null, null, List.of("sem_preferencia")), actor
//        ))
//            .isInstanceOf(ServiceException.class)
//            .extracting("code")
//            .isEqualTo(ErrorCode.LSA001_VALIDATION);
//
//        verify(profiles, never()).save(any());
//    }
//
//    @Test
//    void update_medicalDisclaimerExplicitlyFalse_throwsValidation_andNeverSaves() {
//        ProfileRequest request = new ProfileRequest(null, null, null, null, null, null, null, null, null, false);
//
//        assertThatThrownBy(() -> service.update(request, actor))
//            .isInstanceOf(ServiceException.class)
//            .extracting("code")
//            .isEqualTo(ErrorCode.LSA001_VALIDATION);
//
//        verify(profiles, never()).save(any());
//    }
//
//    @Test
//    void update_medicalDisclaimerOmitted_doesNotResetAnAlreadyAcceptedConsent() {
//        ClientProfile existing = new ClientProfile(9L);
//        existing.merge(Goal.COMER_MELHOR, List.of("NENHUMA"), null, List.of(), List.of(), null, 3, 1, List.of(), true);
//        when(profiles.findByUserId(9L)).thenReturn(Optional.of(existing));
//        when(profiles.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
//
//        ProfileResponse response = service.update(
//            new ProfileRequest(null, null, null, List.of("camarao"), null, null, null, null, null, null), actor
//        );
//
//        assertThat(response.medicalDisclaimerAccepted()).isTrue();
//    }
//
//    @Test
//    void update_recordsAuditWithChangedFieldNamesOnly_neverTheSensitiveValues() {
//        when(profiles.findByUserId(9L)).thenReturn(Optional.empty());
//        when(profiles.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
//
//        service.update(
//            new ProfileRequest(Goal.COMER_MELHOR, List.of(HealthCondition.DIABETES_TIPO_2), null, List.of("marisco"), null, null, null, null, null, null),
//            actor
//        );
//
//        ArgumentCaptor<Map<String, Object>> detailCaptor = ArgumentCaptor.forClass(Map.class);
//        verify(audit).record(eq(actor), eq("profile.update"), eq("ClientProfile"), eq(9L), detailCaptor.capture());
//        Object fields = detailCaptor.getValue().get("fields");
//        assertThat((List<String>) fields).containsExactlyInAnyOrder("goal", "healthConditions", "allergies");
//    }
//
//    private ProfileRequest request(Goal goal, List<HealthCondition> healthConditions, String healthConditionOther, List<String> allergies, List<String> dietaryPreferences) {
//        return new ProfileRequest(goal, healthConditions, healthConditionOther, allergies, null, null, null, null, dietaryPreferences, null);
//    }
//}
