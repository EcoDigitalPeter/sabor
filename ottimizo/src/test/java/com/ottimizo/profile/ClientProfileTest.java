package com.ottimizo.profile;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

class ClientProfileTest {

    @Test
    void deliveryAddressText_joinsAllPartsWithCommaAndNoTrailingSeparators() {
        ClientProfile profile = newProfile("Maputo", "Maputo Cidade", "Polana", "Perto do mercado");

        assertThat(profile.deliveryAddressText()).isEqualTo("Maputo, Maputo Cidade, Polana, Perto do mercado");
    }

    @Test
    void deliveryAddressText_skipsBlankParts_withoutDoubleSeparators() {
        ClientProfile profile = newProfile(null, "Maputo Cidade", null, "Perto do mercado");

        assertThat(profile.deliveryAddressText()).isEqualTo("Maputo Cidade, Perto do mercado");
    }

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
