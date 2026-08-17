package com.ottimizo.loja;

import jakarta.validation.constraints.NotNull;

public record SetProductStatusRequest(
    @NotNull ProductStatus status
) {
}
