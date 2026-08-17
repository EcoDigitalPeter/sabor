package com.ottimizo.stores;

import jakarta.validation.constraints.NotNull;

public record SetStoreStatusRequest(
    @NotNull StoreStatus status
) {
}
