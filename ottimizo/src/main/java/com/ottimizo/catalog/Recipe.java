package com.ottimizo.catalog;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "recipes")
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "meal_tag")
    private String mealTag;

    @Column(name = "health_note")
    private String healthNote;

    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(name = "prep_minutes", nullable = false)
    private Integer prepMinutes = 0;

    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(nullable = false)
    private Integer servings = 1;

    @Column(name = "estimated_cost_mt")
    private BigDecimal estimatedCostMt;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "health_tags", columnDefinition = "text[]", nullable = false)
    private List<String> healthTags = new ArrayList<>();

    private BigDecimal kcal;

    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(name = "protein_pct")
    private Integer proteinPct;

    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(name = "carbs_pct")
    private Integer carbsPct;

    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(name = "fat_pct")
    private Integer fatPct;

    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(name = "fiber_pct")
    private Integer fiberPct;

    @Column(name = "macros_override", nullable = false)
    private boolean macrosOverride;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecipeStatus status = RecipeStatus.DRAFT;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id", nullable = false)
    @OrderBy("stepOrder asc")
    private List<RecipeStep> steps = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id", nullable = false)
    private List<RecipeIngredient> ingredients = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Recipe() {
    }

    public Recipe(
        String name,
        String description,
        String mealTag,
        String healthNote,
        Integer prepMinutes,
        Integer servings,
        BigDecimal estimatedCostMt,
        List<String> healthTags
    ) {
        this.name = name;
        this.description = description;
        this.mealTag = mealTag;
        this.healthNote = healthNote;
        this.prepMinutes = prepMinutes == null ? 0 : prepMinutes;
        this.servings = servings == null ? 1 : servings;
        this.estimatedCostMt = estimatedCostMt;
        this.healthTags = healthTags == null ? new ArrayList<>() : new ArrayList<>(healthTags);
        this.status = RecipeStatus.DRAFT;
    }

    public void updateDetails(
        String name,
        String description,
        String mealTag,
        String healthNote,
        Integer prepMinutes,
        Integer servings,
        BigDecimal estimatedCostMt,
        List<String> healthTags
    ) {
        this.name = name;
        this.description = description;
        this.mealTag = mealTag;
        this.healthNote = healthNote;
        this.prepMinutes = prepMinutes == null ? 0 : prepMinutes;
        this.servings = servings == null ? 1 : servings;
        this.estimatedCostMt = estimatedCostMt;
        this.healthTags = healthTags == null ? new ArrayList<>() : new ArrayList<>(healthTags);
    }

    /** Substitui a lista de ingredientes por completo (padrao PUT). */
    public void replaceIngredients(List<RecipeIngredient> newIngredients) {
        this.ingredients.clear();
        if (newIngredients != null) {
            this.ingredients.addAll(newIngredients);
        }
    }

    /** Substitui a lista de passos por completo (padrao PUT). */
    public void replaceSteps(List<RecipeStep> newSteps) {
        this.steps.clear();
        if (newSteps != null) {
            this.steps.addAll(newSteps);
        }
    }

    /** Aplica macros calculados a partir dos ingredientes ({@code macrosOverride = false}). */
    public void applyCalculatedMacros(RecipeMacros macros) {
        this.kcal = macros.kcal();
        this.proteinPct = macros.proteinPct();
        this.carbsPct = macros.carbsPct();
        this.fatPct = macros.fatPct();
        this.fiberPct = macros.fiberPct();
        this.macrosOverride = false;
    }

    /** Aplica macros definidos manualmente pelo administrador ({@code macrosOverride = true}). */
    public void applyOverrideMacros(BigDecimal kcal, Integer proteinPct, Integer carbsPct, Integer fatPct, Integer fiberPct) {
        this.kcal = kcal;
        this.proteinPct = proteinPct;
        this.carbsPct = carbsPct;
        this.fatPct = fatPct;
        this.fiberPct = fiberPct;
        this.macrosOverride = true;
    }

    public void publish() {
        this.status = RecipeStatus.PUBLISHED;
    }

    public void unpublish() {
        this.status = RecipeStatus.DRAFT;
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public Long id() {
        return id;
    }

    public String name() {
        return name;
    }

    public String description() {
        return description;
    }

    public String mealTag() {
        return mealTag;
    }

    public String healthNote() {
        return healthNote;
    }

    public Integer prepMinutes() {
        return prepMinutes;
    }

    public Integer servings() {
        return servings;
    }

    public BigDecimal estimatedCostMt() {
        return estimatedCostMt;
    }

    public List<String> healthTags() {
        return healthTags;
    }

    public BigDecimal kcal() {
        return kcal;
    }

    public Integer proteinPct() {
        return proteinPct;
    }

    public Integer carbsPct() {
        return carbsPct;
    }

    public Integer fatPct() {
        return fatPct;
    }

    public Integer fiberPct() {
        return fiberPct;
    }

    public boolean macrosOverride() {
        return macrosOverride;
    }

    public RecipeStatus status() {
        return status;
    }

    public List<RecipeStep> steps() {
        return steps;
    }

    public List<RecipeIngredient> ingredients() {
        return ingredients;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }
}
