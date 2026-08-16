package com.ottimizo.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "client_profiles")
public class ClientProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Goal goal;

    @Enumerated(EnumType.STRING)
    @Column(name = "budget_band")
    private BudgetBand budgetBand;

    @Column(name = "meals_per_day", nullable = false)
    private Integer mealsPerDay = 3;

    @Column(name = "household_size", nullable = false)
    private Integer householdSize = 1;

    @Column(name = "shopping_province")
    private String shoppingProvince;

    @Column(name = "shopping_city")
    private String shoppingCity;

    @Column(name = "shopping_neighborhood")
    private String shoppingNeighborhood;

    @Column(name = "shopping_address_description")
    private String shoppingAddressDescription;

    @Column(name = "medical_disclaimer_accepted", nullable = false)
    private boolean medicalDisclaimerAccepted;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    protected ClientProfile() {
    }

    public Long id() {
        return id;
    }

    public Long userId() {
        return userId;
    }

    public Goal goal() {
        return goal;
    }

    public String deliveryAddressText() {
        return String.join(", ",
            nonNull(shoppingProvince),
            nonNull(shoppingCity),
            nonNull(shoppingNeighborhood),
            nonNull(shoppingAddressDescription)
        ).replaceAll("(, )+", ", ").replaceAll("^, |, $", "");
    }

    private String nonNull(String value) {
        return value == null ? "" : value;
    }
}
