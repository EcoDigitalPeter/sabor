package com.ottimizo.loja;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ProductResponse(
    Long id,
    Long storeId,
    String name,
    ProductCategory category,
    String unitLabel,
    BigDecimal priceMt,
    Long ingredientId,
    ProductStatus status,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {

    public static ProductResponse from(Product product) {
        return new ProductResponse(
            product.id(),
            product.storeId(),
            product.name(),
            product.category(),
            product.unitLabel(),
            product.priceMt(),
            product.ingredientId(),
            product.status(),
            product.createdAt(),
            product.updatedAt()
        );
    }
}
