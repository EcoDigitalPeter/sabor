package com.ottimizo.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

    /** Guardado como {@link HealthCondition#name()}; ver {@link ProfileService} para o mapeamento. */
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "health_conditions", columnDefinition = "text[]", nullable = false)
    private List<String> healthConditions = new ArrayList<>();

    @Column(name = "health_condition_other")
    private String healthConditionOther;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<String> allergies = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "food_exclusions", nullable = false, columnDefinition = "jsonb")
    private List<String> foodExclusions = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "budget_band")
    private BudgetBand budgetBand;

    @Column(name = "meals_per_day", nullable = false)
    private Integer mealsPerDay = 3;

    @Column(name = "household_size", nullable = false)
    private Integer householdSize = 1;

    /** Vocabulario fechado validado em {@link ProfileService} (nao ha check constraint em BD). */
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "dietary_preferences", columnDefinition = "text[]", nullable = false)
    private List<String> dietaryPreferences = new ArrayList<>();

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

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected ClientProfile() {
    }

    public ClientProfile(Long userId) {
        this.userId = userId;
    }

    /**
     * Aplica um patch parcial (padrao PUT/merge de {@code PUT /api/v1/me/profile},
     * ver {@code levesabor-web/src/mocks/fixtures.ts updateProfile}): cada
     * parametro so e aplicado quando nao-nulo, os restantes campos ficam como
     * estavam. Validacao de vocabulario fechado e das regras de negocio
     * (ex. "Outra" exige {@code healthConditionOther}) fica a cargo do
     * {@link ProfileService}, chamado antes/depois deste merge.
     */
    public void merge(
        Goal goal,
        List<String> healthConditions,
        String healthConditionOther,
        List<String> allergies,
        List<String> foodExclusions,
        BudgetBand budgetBand,
        Integer mealsPerDay,
        Integer householdSize,
        List<String> dietaryPreferences,
        Boolean medicalDisclaimerAccepted
    ) {
        if (goal != null) {
            this.goal = goal;
        }
        if (healthConditions != null) {
            this.healthConditions = new ArrayList<>(healthConditions);
        }
        if (healthConditionOther != null) {
            this.healthConditionOther = healthConditionOther;
        }
        if (allergies != null) {
            this.allergies = new ArrayList<>(allergies);
        }
        if (foodExclusions != null) {
            this.foodExclusions = new ArrayList<>(foodExclusions);
        }
        if (budgetBand != null) {
            this.budgetBand = budgetBand;
        }
        if (mealsPerDay != null) {
            this.mealsPerDay = mealsPerDay;
        }
        if (householdSize != null) {
            this.householdSize = householdSize;
        }
        if (dietaryPreferences != null) {
            this.dietaryPreferences = new ArrayList<>(dietaryPreferences);
        }
        if (medicalDisclaimerAccepted != null) {
            this.medicalDisclaimerAccepted = medicalDisclaimerAccepted;
        }
    }

    @PrePersist
    void onCreate() {
        this.updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
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

    public List<String> healthConditions() {
        return healthConditions;
    }

    public String healthConditionOther() {
        return healthConditionOther;
    }

    public List<String> allergies() {
        return allergies;
    }

    public List<String> foodExclusions() {
        return foodExclusions;
    }

    public BudgetBand budgetBand() {
        return budgetBand;
    }

    public Integer mealsPerDay() {
        return mealsPerDay;
    }

    public Integer householdSize() {
        return householdSize;
    }

    public List<String> dietaryPreferences() {
        return dietaryPreferences;
    }

    public boolean medicalDisclaimerAccepted() {
        return medicalDisclaimerAccepted;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
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
