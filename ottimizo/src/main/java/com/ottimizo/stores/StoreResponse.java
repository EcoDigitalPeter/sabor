package com.ottimizo.stores;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record StoreResponse(
    Long id,
    String name,
    String province,
    String city,
    String neighborhood,
    String addressLine,
    String contact,
    StoreStatus status,
    boolean deliveryAvailable,
    BigDecimal rating,
    String openingHoursText,
    StorePriceLevel averagePriceLevel,
    BigDecimal latitude,
    BigDecimal longitude,
    int productCount,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {

    /**
     * productCount fica sempre a 0 por agora: o CRUD de produtos de loja
     * (BE-L, Fase 3, apos RBAC LOJISTA) ainda nao existe nesta branch, logo
     * nao ha repositorio de produtos para contar. Actualizar aqui quando
     * BE-L02 introduzir a entidade Product.
     */
    public static StoreResponse from(Store store) {
        return new StoreResponse(
            store.id(),
            store.name(),
            store.province(),
            store.city(),
            store.neighborhood(),
            store.addressLine(),
            store.contact(),
            store.status(),
            store.deliveryAvailable(),
            store.rating(),
            store.openingHoursText(),
            store.averagePriceLevel(),
            store.latitude(),
            store.longitude(),
            0,
            store.createdAt(),
            store.updatedAt()
        );
    }
}
