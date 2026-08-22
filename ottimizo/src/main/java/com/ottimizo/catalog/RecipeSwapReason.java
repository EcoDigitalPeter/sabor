package com.ottimizo.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * Motivo livre de troca de refeição (FE-Q06), por receita "de saída"
 * (tabela {@code recipe_swap_reasons}, já em V002 mas sem entidade JPA até
 * agora). Escrito por {@code MealPlanSwapService.swap(confirm=true)} quando
 * há {@code reason}; lido pelo admin em
 * {@code GET /admin/recipes/{id}/swap-reasons} (BE-D06/INT-01, `docs/plano/tasks.md`).
 */
@Entity
@Table(name = "recipe_swap_reasons")
public class RecipeSwapReason {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipe_id", nullable = false)
    private Long recipeId;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected RecipeSwapReason() {
    }

    public RecipeSwapReason(Long recipeId, Long userId, String reason) {
        this.recipeId = recipeId;
        this.userId = userId;
        this.reason = reason;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }

    public Long id() {
        return id;
    }

    public Long recipeId() {
        return recipeId;
    }

    public Long userId() {
        return userId;
    }

    public String reason() {
        return reason;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }
}
