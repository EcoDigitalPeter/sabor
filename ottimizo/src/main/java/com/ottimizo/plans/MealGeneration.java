package com.ottimizo.plans;

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

/**
 * Pedido de geracao de plano mensal ou de receita avulsa (tabela
 * {@code meal_generations}, V003). O motor de geracao em si
 * ({@code AiMealPlanService}, geracao assincrona via Spring AI) e
 * responsabilidade de BE-C03 — esta entidade e as transicoes minimas
 * ({@link #markReady}/{@link #markFailed}) existem aqui apenas para que
 * {@code GET /me/meal-plans/{id}} (BE-C04, polling — ver nota de rota em
 * {@code MealPlanController}) tenha algo para ler e os testes consigam
 * semear estados sem duplicar logica de IA.
 */
@Entity
@Table(name = "meal_generations")
public class MealGeneration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MealGenerationStatus status;

    @Column(name = "meal_plan_id")
    private Long mealPlanId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MealGenerationKind kind = MealGenerationKind.MONTHLY_PLAN;

    @Column(name = "error_code")
    private String errorCode;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected MealGeneration() {
    }

    public MealGeneration(Long userId, MealGenerationKind kind) {
        this.userId = userId;
        this.kind = kind == null ? MealGenerationKind.MONTHLY_PLAN : kind;
        this.status = MealGenerationStatus.GENERATING;
    }

    public void markReady(Long mealPlanId) {
        this.status = MealGenerationStatus.READY;
        this.mealPlanId = mealPlanId;
    }

    public void markFailed(String errorCode) {
        this.status = MealGenerationStatus.FAILED;
        this.errorCode = errorCode;
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

    public Long userId() {
        return userId;
    }

    public MealGenerationStatus status() {
        return status;
    }

    public Long mealPlanId() {
        return mealPlanId;
    }

    public MealGenerationKind kind() {
        return kind;
    }

    public String errorCode() {
        return errorCode;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }
}
