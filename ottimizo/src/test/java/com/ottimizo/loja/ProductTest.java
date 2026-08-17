package com.ottimizo.loja;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class ProductTest {

    @Test
    void constructor_setsAllFieldsAndDefaultsStatusToActive() {
        Product product = new Product(
            10L, "Arroz Corrente", ProductCategory.CEREAIS, "kg",
            new BigDecimal("120.00"), 3L
        );

        assertThat(product.storeId()).isEqualTo(10L);
        assertThat(product.name()).isEqualTo("Arroz Corrente");
        assertThat(product.category()).isEqualTo(ProductCategory.CEREAIS);
        assertThat(product.unitLabel()).isEqualTo("kg");
        assertThat(product.priceMt()).isEqualByComparingTo("120.00");
        assertThat(product.ingredientId()).isEqualTo(3L);
        assertThat(product.status()).isEqualTo(ProductStatus.ACTIVE);
        assertThat(product.createdAt()).isNotNull();
        assertThat(product.updatedAt()).isNotNull();
    }

    @Test
    void constructor_allowsNullIngredientId() {
        Product product = new Product(
            10L, "Tempero da Casa", ProductCategory.TEMPEROS, "un",
            new BigDecimal("50.00"), null
        );

        assertThat(product.ingredientId()).isNull();
    }

    @Test
    void applyUpdate_replacesFieldsAndBumpsUpdatedAt_butKeepsStoreIdAndCreatedAt() {
        Product product = new Product(
            10L, "Arroz Corrente", ProductCategory.CEREAIS, "kg",
            new BigDecimal("120.00"), 3L
        );
        var createdAt = product.createdAt();

        product.applyUpdate("Arroz Perfumado", ProductCategory.CEREAIS, "saco 5kg", new BigDecimal("550.00"), 4L);

        assertThat(product.name()).isEqualTo("Arroz Perfumado");
        assertThat(product.unitLabel()).isEqualTo("saco 5kg");
        assertThat(product.priceMt()).isEqualByComparingTo("550.00");
        assertThat(product.ingredientId()).isEqualTo(4L);
        assertThat(product.storeId()).isEqualTo(10L);
        assertThat(product.createdAt()).isEqualTo(createdAt);
    }

    @Test
    void changeStatus_updatesStatus() {
        Product product = new Product(
            10L, "Arroz Corrente", ProductCategory.CEREAIS, "kg",
            new BigDecimal("120.00"), null
        );

        product.changeStatus(ProductStatus.INACTIVE);

        assertThat(product.status()).isEqualTo(ProductStatus.INACTIVE);
    }
}
