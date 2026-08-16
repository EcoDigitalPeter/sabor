package com.ottimizo.stores;

public record StoreOptionResponse(
    Long id,
    String name,
    String address,
    boolean deliveryAvailable,
    int rank,
    String reason
) {
}
