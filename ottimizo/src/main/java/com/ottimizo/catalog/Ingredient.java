package com.ottimizo.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "ingredients")
public class Ingredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column(name = "base_unit", nullable = false)
    private String baseUnit;

    @Column(name = "kcal_per_100g", nullable = false)
    private BigDecimal kcalPer100g = BigDecimal.ZERO;

    @Column(name = "protein_per_100g", nullable = false)
    private BigDecimal proteinPer100g = BigDecimal.ZERO;

    @Column(name = "carbs_per_100g", nullable = false)
    private BigDecimal carbsPer100g = BigDecimal.ZERO;

    @Column(name = "fat_per_100g", nullable = false)
    private BigDecimal fatPer100g = BigDecimal.ZERO;

    @Column(name = "fiber_per_100g", nullable = false)
    private BigDecimal fiberPer100g = BigDecimal.ZERO;

    @Column(name = "reference_price_mt")
    private BigDecimal referencePriceMt;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Ingredient() {
    }

    public Ingredient(
        String name,
        String category,
        String baseUnit,
        BigDecimal kcalPer100g,
        BigDecimal proteinPer100g,
        BigDecimal carbsPer100g,
        BigDecimal fatPer100g,
        BigDecimal fiberPer100g,
        BigDecimal referencePriceMt
    ) {
        this.name = name;
        this.category = category;
        this.baseUnit = baseUnit;
        this.kcalPer100g = kcalPer100g == null ? BigDecimal.ZERO : kcalPer100g;
        this.proteinPer100g = proteinPer100g == null ? BigDecimal.ZERO : proteinPer100g;
        this.carbsPer100g = carbsPer100g == null ? BigDecimal.ZERO : carbsPer100g;
        this.fatPer100g = fatPer100g == null ? BigDecimal.ZERO : fatPer100g;
        this.fiberPer100g = fiberPer100g == null ? BigDecimal.ZERO : fiberPer100g;
        this.referencePriceMt = referencePriceMt;
        this.active = true;
    }

    public void update(
        String name,
        String category,
        String baseUnit,
        BigDecimal kcalPer100g,
        BigDecimal proteinPer100g,
        BigDecimal carbsPer100g,
        BigDecimal fatPer100g,
        BigDecimal fiberPer100g,
        BigDecimal referencePriceMt,
        boolean active
    ) {
        this.name = name;
        this.category = category;
        this.baseUnit = baseUnit;
        this.kcalPer100g = kcalPer100g == null ? BigDecimal.ZERO : kcalPer100g;
        this.proteinPer100g = proteinPer100g == null ? BigDecimal.ZERO : proteinPer100g;
        this.carbsPer100g = carbsPer100g == null ? BigDecimal.ZERO : carbsPer100g;
        this.fatPer100g = fatPer100g == null ? BigDecimal.ZERO : fatPer100g;
        this.fiberPer100g = fiberPer100g == null ? BigDecimal.ZERO : fiberPer100g;
        this.referencePriceMt = referencePriceMt;
        this.active = active;
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

    public String category() {
        return category;
    }

    public String baseUnit() {
        return baseUnit;
    }

    public BigDecimal kcalPer100g() {
        return kcalPer100g;
    }

    public BigDecimal proteinPer100g() {
        return proteinPer100g;
    }

    public BigDecimal carbsPer100g() {
        return carbsPer100g;
    }

    public BigDecimal fatPer100g() {
        return fatPer100g;
    }

    public BigDecimal fiberPer100g() {
        return fiberPer100g;
    }

    public BigDecimal referencePriceMt() {
        return referencePriceMt;
    }

    public boolean active() {
        return active;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }
}
