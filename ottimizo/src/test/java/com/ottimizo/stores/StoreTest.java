package com.ottimizo.stores;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

class StoreTest {

    @Test
    void constructor_setsAllFieldsAndDefaultsStatusToActive() {
        Store store = new Store(
            "Loja Central", "Maputo", "Maputo Cidade", "Polana", "Rua da Sé, 123",
            "+258840000000", true, new BigDecimal("4.50"), "08h-18h",
            StorePriceLevel.MEDIO, new BigDecimal("-25.966"), new BigDecimal("32.583")
        );

        assertThat(store.name()).isEqualTo("Loja Central");
        assertThat(store.city()).isEqualTo("Maputo Cidade");
        assertThat(store.status()).isEqualTo(StoreStatus.ACTIVE);
        assertThat(store.deliveryAvailable()).isTrue();
        assertThat(store.rating()).isEqualByComparingTo("4.50");
        assertThat(store.openingHoursText()).isEqualTo("08h-18h");
        assertThat(store.averagePriceLevel()).isEqualTo(StorePriceLevel.MEDIO);
        assertThat(store.createdAt()).isNotNull();
        assertThat(store.updatedAt()).isNotNull();
    }

    @Test
    void applyUpdate_replacesFieldsAndBumpsUpdatedAt() {
        Store store = new Store(
            "Loja Central", "Maputo", "Maputo Cidade", "Polana", "Rua da Sé, 123",
            "+258840000000", true, new BigDecimal("4.50"), "08h-18h",
            StorePriceLevel.MEDIO, new BigDecimal("-25.966"), new BigDecimal("32.583")
        );
        var createdAt = store.createdAt();

        store.applyUpdate(
            "Loja Central Renovada", "Sofala", "Beira", "Ponta Gêa", "Av. Central, 45",
            "+258850000000", false, new BigDecimal("3.00"), "09h-17h",
            StorePriceLevel.ALTO, new BigDecimal("-19.843"), new BigDecimal("34.838")
        );

        assertThat(store.name()).isEqualTo("Loja Central Renovada");
        assertThat(store.city()).isEqualTo("Beira");
        assertThat(store.deliveryAvailable()).isFalse();
        assertThat(store.averagePriceLevel()).isEqualTo(StorePriceLevel.ALTO);
        assertThat(store.createdAt()).isEqualTo(createdAt);
    }

    @Test
    void changeStatus_updatesStatus() {
        Store store = new Store(
            "Loja Central", "Maputo", "Maputo Cidade", "Polana", "Rua da Sé, 123",
            "+258840000000", true, null, null, null, null, null
        );

        store.changeStatus(StoreStatus.SUSPENDED);

        assertThat(store.status()).isEqualTo(StoreStatus.SUSPENDED);
    }

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
