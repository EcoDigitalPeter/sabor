package com.ottimizo.stores;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

class StoreTest {

    @Test
    void addressText_joinsAllPartsWithCommaAndNoTrailingSeparators() {
        Store store = newStore("Maputo", "Maputo Cidade", "Polana", "Rua da Sé, 123");

        assertThat(store.addressText()).isEqualTo("Maputo, Maputo Cidade, Polana, Rua da Sé, 123");
    }

    @Test
    void addressText_skipsBlankParts_withoutDoubleSeparators() {
        Store store = newStore(null, "Maputo Cidade", null, "Rua da Sé");

        assertThat(store.addressText()).isEqualTo("Maputo Cidade, Rua da Sé");
    }

    @Test
    void addressText_isEmpty_whenAllPartsMissing() {
        Store store = newStore(null, null, null, null);

        assertThat(store.addressText()).isEmpty();
    }

    private Store newStore(String province, String city, String neighborhood, String addressLine) {
        Store store = BeanUtils.instantiateClass(Store.class);
        ReflectionTestUtils.setField(store, "province", province);
        ReflectionTestUtils.setField(store, "city", city);
        ReflectionTestUtils.setField(store, "neighborhood", neighborhood);
        ReflectionTestUtils.setField(store, "addressLine", addressLine);
        return store;
    }
}
