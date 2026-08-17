package com.ottimizo.loja;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProductRequest(
    @NotBlank @Size(max = 160) String name,
    @NotNull ProductCategory category,
    @NotBlank @Size(max = 40) String unitLabel,
    @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal priceMt,
    Long ingredientId
) {
}
