package com.ottimizo.plans;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * Lista de compras de um plano mensal (tabela {@code shopping_lists}, V003) —
 * no maximo uma por plano ({@code unique (meal_plan_id)}). Os itens
 * ({@link ShoppingListItem}) sao geridos a parte; esta entidade e' so o
 * "cabecalho" (dono + plano de origem).
 */
@Entity
@Table(name = "shopping_lists")
public class ShoppingList {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "meal_plan_id")
    private Long mealPlanId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected ShoppingList() {
    }

    public ShoppingList(Long userId, Long mealPlanId) {
        this.userId = userId;
        this.mealPlanId = mealPlanId;
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

    public Long mealPlanId() {
        return mealPlanId;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }
}
