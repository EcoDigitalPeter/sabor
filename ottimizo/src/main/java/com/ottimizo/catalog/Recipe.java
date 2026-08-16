package com.ottimizo.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

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

    @Column(name = "prep_minutes", nullable = false)
    private Integer prepMinutes = 0;

    @Column(nullable = false)
    private Integer servings = 1;

    @Column(name = "estimated_cost_mt")
    private BigDecimal estimatedCostMt;

    private BigDecimal kcal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecipeStatus status = RecipeStatus.DRAFT;

    protected Recipe() {
    }

    public Long id() {
        return id;
    }

    public String name() {
        return name;
    }

    public String mealTag() {
        return mealTag;
    }

    public RecipeStatus status() {
        return status;
    }
}
