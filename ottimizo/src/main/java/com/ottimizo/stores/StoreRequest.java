package com.ottimizo.stores;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record StoreRequest(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 80) String province,
    @NotBlank @Size(max = 80) String city,
    @Size(max = 120) String neighborhood,
    @Size(max = 180) String addressLine,
    @Size(max = 60) String contact,
    boolean deliveryAvailable,
    @DecimalMin("0.0") @DecimalMax("5.0") BigDecimal rating,
    @Size(max = 120) String openingHoursText,
    StorePriceLevel averagePriceLevel,
    BigDecimal latitude,
    BigDecimal longitude
) {
}
