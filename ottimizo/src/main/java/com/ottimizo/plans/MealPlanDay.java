package com.ottimizo.plans;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Um dia do plano mensal (tabela {@code meal_plan_days}, V003), com o
 * resumo nutricional do dia e as suas {@link MealPlanEntry}. Leitura apenas
 * (BE-C04) — a escrita pertence a BE-C03.
 */
@Entity
@Table(name = "meal_plan_days")
public class MealPlanDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meal_plan_id", nullable = false)
    private MealPlan mealPlan;

    @Column(nullable = false)
    private LocalDate date;

    private String weekday;

    @Column(name = "total_kcal")
    private BigDecimal totalKcal;

    @Column(name = "target_kcal")
    private BigDecimal targetKcal;

    @Column(name = "protein_pct")
    private Integer proteinPct;

    @Column(name = "carbs_pct")
    private Integer carbsPct;

    @Column(name = "fat_pct")
    private Integer fatPct;

    @Column(name = "fiber_pct")
    private Integer fiberPct;

    protected MealPlanDay() {
    }

    public MealPlanDay(
        MealPlan mealPlan,
        LocalDate date,
        String weekday,
        BigDecimal totalKcal,
        BigDecimal targetKcal,
        Integer proteinPct,
        Integer carbsPct,
        Integer fatPct,
        Integer fiberPct
    ) {
        this.mealPlan = mealPlan;
        this.date = date;
        this.weekday = weekday;
        this.totalKcal = totalKcal;
        this.targetKcal = targetKcal;
        this.proteinPct = proteinPct;
        this.carbsPct = carbsPct;
        this.fatPct = fatPct;
        this.fiberPct = fiberPct;
    }

    public Long id() {
        return id;
    }

    public MealPlan mealPlan() {
        return mealPlan;
    }

    public LocalDate date() {
        return date;
    }

    public String weekday() {
        return weekday;
    }

    public BigDecimal totalKcal() {
        return totalKcal;
    }

    public BigDecimal targetKcal() {
        return targetKcal;
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
}
